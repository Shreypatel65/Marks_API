var path = require('path');
const multer = require('multer');
const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;
const { MongoClient } = require('mongodb');

app.use(express.static('public/scripts'));
app.use(session({
    secret: 'chacha',
    resave: false,
    saveUninitialized: false
}));
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
const authdb = db.collection('authdb');
const keydb = db.collection('keydb');
const studinfo = db.collection('studinfo');

app.use(express.json());

function requireAuth(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.status(403).send('Access denied');
}

function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const apiKeyLength = 32;
    let apiKey = '';
    for (let i = 0; i < apiKeyLength; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        apiKey += chars[randomIndex];
    }
    return apiKey;
}

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');

})
app.get('/', (req, res) => {
    // res.sendFile(__dirname + '/public/index.html');

    if (req.session.userId) {
        res.sendFile(__dirname + '/public/index.html');
    } else {
        res.sendFile(__dirname + '/public/login.html');
    }

});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let user = await authdb.findOne({ _id: username, pass: password });
    if (user) {
        req.session.userId = user._id;
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
})
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            res.redirect('/');
        }
    });
});

app.post('/changepwd', async (req, res) => {
    const { old_pass, new_pass } = req.body
    console.log(req.body);
    const user = req.session.userId
    let result = await authdb.findOne({ _id: user });
    if (old_pass == result.pass) {
        let result2 = await authdb.findOneAndUpdate({ _id: user }, { $set: { pass: new_pass } });
        if (result2) {
            res.status(200).json({ message: "Password changed succesful" });
        }
        else {
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
    else {
        res.status(401).json({ message: "Invalid Password" });
    }
})

app.post('/keygen', requireAuth, async (req, res) => {
    const { uname } = req.body;
    const apikey = generateApiKey();
    try {
        let result = await keydb.insertOne({ _id: uname, key: apikey });
        res.status(200).json({ message: `User:${uname}\nKey:${apikey}` });
    }
    catch (err) {
        if (err.code == 11000) {
            res.status(400).json({ message: 'API key for this user already exists.' });
        } else {
            res.status(500).json({ message: 'Internal server error.' });
        }
    }
});

app.get('/keys', requireAuth, async (req, res) => {
    let result = await keydb.find({}).toArray();
    res.status(200).json(result);
});

app.get('/delete', requireAuth, async (req, res) => {
    const { name } = req.query;
    let result = await keydb.deleteOne({ _id: name });
    if (result.deletedCount) {
        res.status(200).send();
    } else {
        res.status(401).send();
    }
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
        res.status(400).json({ message: 'Improper fields entered.' });
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
                res.status(400).json({ message: 'Improper column names' });
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
                res.status(500).json({ message: 'Internal server error' });
                return;
            }

        });

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});