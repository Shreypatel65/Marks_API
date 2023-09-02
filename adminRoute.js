// Import required libraries
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const router = express.Router();

// Import custom utility functions and databases
const { generateApiKey, requireAuth, authdb, keydb, studinfo } = require('./utils');

// Configure storage for file uploads using Multer
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Define the admin-related routes

// Serve the admin panel or login page based on session status
router.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, '/public/index.html'));
    } else {
        res.sendFile(path.join(__dirname, '/public/login.html'));
    }
});

// Handle admin login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let user = await authdb.findOne({ _id: username, pass: password });
    if (user) {
        req.session.userId = user._id;
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout route for admin
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        } else {
            res.redirect('/');
        }
    });
});

// Change password route for admin
router.post('/changepwd', requireAuth, async (req, res) => {
    const { old_pass, new_pass } = req.body;
    const user = req.session.userId;
    let result = await authdb.findOne({ _id: user });

    if (old_pass == result.pass) {
        let result2 = await authdb.findOneAndUpdate({ _id: user }, { $set: { pass: new_pass } });
        if (result2) {
            res.status(200).json({ message: "Password changed successfully" });
        } else {
            res.status(500).json({ message: "Internal Server Error" });
        }
    } else {
        res.status(401).json({ message: "Invalid Password" });
    }
});

router.get('/download', (req, res) => {
    const filename = 'demo_template.csv'; // Predefined filename
    const filePath = path.join(__dirname, 'public', filename);

    // Use the res.download() method to send the file for download
    res.download(filePath, (err) => {
        if (err) {
            // Handle any errors, such as file not found
            res.status(404).send('File not found');
        }
    });
});

// Generate API key route for admin
router.post('/keygen', requireAuth, async (req, res) => {
    const { uname } = req.body;

    if (!uname || uname.trim() === '') {
        res.status(400).json({ message: 'Username cannot be empty.' });
        return;
    }

    const apikey = generateApiKey();

    try {
        let result = await keydb.insertOne({ _id: uname, key: apikey });
        res.status(200).json({ message: `User:${uname}\nKey:${apikey}` });
    } catch (err) {
        if (err.code == 11000) {
            res.status(400).json({ message: 'API key for this user already exists.' });
        } else {
            res.status(500).json({ message: 'Internal server error.' });
        }
    }
});

// Fetch API keys route for admin
router.get('/keys', requireAuth, async (req, res) => {
    let result = await keydb.find({}).toArray();
    res.status(200).json(result);
});

// Delete API key route for admin
router.get('/delete', requireAuth, async (req, res) => {
    const { name } = req.query;
    let result = await keydb.deleteOne({ _id: name });
    if (result.deletedCount) {
        res.status(200).send();
    } else {
        res.status(401).send();
    }
});

// Upload file route for admin
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
    const startTime = new Date();
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }
    var fileName = path.join(__dirname, "/uploads/" + req.file.filename);

    const results = [];

    var sem = req.body.sem;
    var phase = req.body.phase;
    const subject = req.body.subject;
    if (!sem || !phase || !subject) {
        res.status(400).json({ message: 'Improper fields entered.' });
        return;
    }
    sem = 'sem' + sem;
    phase = 't' + phase;
    const home = `academic.${sem}.${phase}.${subject}`;
    const mypath = `academic.${sem}.total`;

    // Create a read stream from the uploaded CSV file
    const readStream = fs.createReadStream(fileName)

        // Use the 'csv-parser' library to parse the CSV data as it is read
        .pipe(csv())

        // Event handler for when the CSV file headers are parsed
        .on('headers', (headers) => {
            let hasValidColumns = false;
            const validFields = ['enroll', 'marks', 'rank'];

            // Check if the CSV file headers contain the required fields
            hasValidColumns = validFields.every(field => headers.includes(field));
            if (!hasValidColumns) {
                res.status(400).json({ message: 'Improper column names' });

                // Destroy the read stream to stop processing the file
                readStream.destroy();
            }
        })

        // Event handler for each data row in the CSV
        .on('data', (data) => {
            // Parse and convert string values to integers
            data.enroll = parseInt(data.enroll);
            data.marks = parseFloat(data.marks);
            data.rank = parseInt(data.rank);

            // Store the parsed data in the 'results' array
            results.push(data);
        })

        // Event handler for when the end of the CSV file is reached
        .on('end', async () => {
            // Fetch existing documents from the database that match 'home' criteria
            const existingDocument = await studinfo.find({
                [home]: { $exists: true }
            },
                { projection: { _id: 1, [home]: 1 } }
            ).toArray();

            // Create an array of update operations based on the parsed CSV data
            const updateOps = results.map(data => {
                const { enroll, marks, rank } = data;
                return {
                    updateOne: {
                        filter: { enroll },
                        update: { $set: { [home]: { marks, rank } } },
                    }
                };
            });

            try {
                // Update the database with the calculated changes
                const result = await studinfo.bulkWrite(updateOps);
                // Fetch documents with updated data from the database
                const documents = await studinfo.find({}, { projection: { _id: 1, [home]: 1, [mypath]: 1 } }).toArray();

                var data = documents;

                // Calculate and update 'total' marks and rank for each document
                data.forEach(obj => {
                    const marks = obj.academic[sem][phase][subject].marks;
                    const totalm = obj.academic[sem].total?.marks ?? 0;
                    const existingMarks = existingDocument.find(doc => doc._id.toString() === obj._id.toString())?.academic[sem][phase][subject].marks || 0;
                    const mm = parseFloat([marks]) + parseFloat([totalm]) - parseFloat([existingMarks])
                    obj.total = { marks: mm, rank: 0 };
                });

                // Sort the data by 'total' marks in descending order
                data.sort((a, b) => b.total.marks - a.total.marks);

                let currentRank = 1;

                // Calculate and assign ranks to the sorted data
                data.forEach((obj, index) => {
                    if (index > 0 && obj.total.marks !== data[index - 1].total.marks) {
                        currentRank = index + 1;
                    }
                    obj.total.rank = currentRank;
                });

                // Create an array of update operations for 'mypath' field
                const updateOps2 = data.map(data => {
                    const { _id, academic, total } = data;
                    return {
                        updateOne: {
                            filter: { _id },
                            update: { $set: { [mypath]: total } }
                        }
                    }
                });

                // Update the database with the calculated changes for 'mypath'
                const result2 = await studinfo.bulkWrite(updateOps2);

                // Log the number of documents updated and the processing time
                console.log(`Updated ${result2.modifiedCount} documents`);
                const endTime = new Date();
                const elapsedTime = endTime - startTime; // Time in milliseconds
                console.log(elapsedTime + "ms")

                // Respond with a success message and the number of documents updated
                res.status(200).json({ message: `File uploaded and processed successfully.\nUpdated ${result2.modifiedCount} documents.` });
                return;
            } catch (error) {
                // Handle and log errors, and respond with an internal server error
                console.error('Error updating documents:', error);
                res.status(500).json({ message: 'Internal server error' });
                return;
            }
        });

});

module.exports = router;
