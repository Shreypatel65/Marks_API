var path = require('path');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');
const express = require('express');
const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

const url = "mongodb://chacha:shrey5510@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const db = client.db('demo');
const studinfo = db.collection('studinfo');


app.get('/',(req,res)=>{
    var x = "Helo"
    return res.status(200).send("Yayyy");
})
app.post('/upload', upload.single('file'), (req, res) => {
    const startTime = new Date();
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }
    var fileName = path.join(__dirname, "/uploads/" + req.file.filename);

    const results = [];

    const sem = req.body.sem;
    const phase = req.body.phase;
    const subject = req.body.subject;
    if (!sem || !phase || !subject) {
        res.status(400).json({ error: 'Improper fields entered.' });
        return;
    }
    const home = `academic.${sem}.${phase}.${subject}`
    const mypath = `academic.${sem}.total`;


    const readStream = fs.createReadStream(fileName)
        .pipe(csv())
        .on('headers', (headers) => {
            let hasValidColumns = false;
            const validFields = ['enrollno', 'marks', 'rank'];
            hasValidColumns = validFields.every(field => headers.includes(field));
            if (!hasValidColumns) {
                res.status(400).json({ error: 'Improper column names' });
                readStream.destroy();
            }
        })
        .on('data', (data) => {
            data.enrollno = parseInt(data.enrollno);
            data.marks = parseInt(data.marks);
            data.rank = parseInt(data.rank);
            results.push(data);
        })
        .on('end', async () => {
            const existingDocument = await studinfo.find({
                [home]: { $exists: true }
            },
                { projection: { _id: 1, [home]: 1 } }
            ).toArray();

            const updateOps = results.map(data => {
                const { enrollno, marks, rank } = data;
                return {
                    updateOne: {
                        filter: { enrollno },
                        update: { $set: { [home]: { marks, rank } } }
                    }
                };
            });
            try {
                const result = await studinfo.bulkWrite(updateOps);
                // console.log(`Updated ${result.modifiedCount} documents`);
                // res.status(200).json({ message: `File uploaded and processed successfully.\nUpdated ${result.modifiedCount} documents` });


                const documents = await studinfo.find({}, { projection: { _id: 1, [home]: 1, [mypath]: 1 } }).toArray();

                var data = documents
                data.forEach(obj => {
                    const marks = obj.academic[sem][phase][subject].marks;
                    const totalm = obj.academic[sem].total?.marks ?? 0;
                    const existingMarks = existingDocument.find(doc => doc._id.toString() === obj._id.toString())?.academic[sem][phase][subject].marks || 0;
                    const mm = parseInt([marks]) + parseInt([totalm]) - parseInt([existingMarks])
                    obj.total = { marks: mm, rank: 0 };
                });


                data.sort((a, b) => b.total.marks - a.total.marks);

                let currentRank = 1;
                data.forEach((obj, index) => {
                    if (index > 0 && obj.total.marks !== data[index - 1].total.marks) {
                        currentRank = index + 1;
                    }
                    obj.total.rank = currentRank;
                });

                const updateOps2 = data.map(data => {
                    const { _id, academic, total } = data;
                    return {
                        updateOne: {
                            filter: { _id },
                            update: { $set: { [mypath]: total } }
                        }
                    }
                });
                const result2 = await studinfo.bulkWrite(updateOps2);

                console.log(`Updated ${result2.modifiedCount} documents`);
                const endTime = new Date();
                const elapsedTime = endTime - startTime; // Time in milliseconds
                console.log(elapsedTime + "ms")
                res.status(200).json({ message: `File uploaded and processed successfully.\nUpdated ${result2.modifiedCount} documents.` });
                // res.status(200).json(updateOps2);

                return;
            } catch (error) {
                console.error('Error updating documents:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

        });

});
app.listen(port);