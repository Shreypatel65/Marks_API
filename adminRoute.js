// Import required libraries
const path = require('path');
const multer = require('multer');
const csv = require('csvtojson');
const express = require('express');
const router = express.Router();

// Import custom utility functions and databases
const {
  generateApiKey,
  requireAuth,
  calcTotal,
  calcRank,
  authdb,
  keydb,
  studinfo,
} = require('./utils');

// Configure storage for file uploads using Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// Define the admin-related routes

// Serve the admin panel or login page based on session status
router.get('/', (req, res) => {
  if (req.session.userId) {
    // If the user is logged in, serve the admin panel
    res.sendFile(path.join(__dirname, '/public/index.html'));
  } else {
    // If not logged in, serve the login page
    res.sendFile(path.join(__dirname, '/public/login.html'));
  }
});

// Handle admin login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Authenticate the user based on provided username and password
  let user = await authdb.findOne({ _id: username, pass: password });
  if (user) {
    // If authentication is successful, set the user's session ID
    req.session.userId = user._id;
    res.status(200).json({ message: 'Login successful' });
  } else {
    // If authentication fails, return an error response
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout route for admin
router.get('/logout', (req, res) => {
  // Destroy the user's session to log them out
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    } else {
      // Redirect to the login page after logout
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
    // Update the user's password if the old password matches
    let result2 = await authdb.findOneAndUpdate({ _id: user }, { $set: { pass: new_pass } });
    if (result2) {
      res.status(200).json({ message: "Password changed successfully" });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    // Return an error if the old password is invalid
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
    // Return an error if the username is empty
    res.status(400).json({ message: 'Username cannot be empty.' });
    return;
  }

  const apikey = generateApiKey();

  try {
    // Insert the generated API key for the specified username
    let result = await keydb.insertOne({ _id: uname, key: apikey });
    res.status(200).json({ message: `User:${uname}\nKey:${apikey}` });
  } catch (err) {
    if (err.code == 11000) {
      // Handle the case where an API key already exists for the user
      res.status(400).json({ message: 'API key for this user already exists.' });
    } else {
      // Handle other server errors
      res.status(500).json({ message: 'Internal server error.' });
    }
  }
});

// Fetch API keys route for admin
router.get('/keys', requireAuth, async (req, res) => {
  // Retrieve and return all API keys
  let result = await keydb.find({}).toArray();
  res.status(200).json(result);
});

// Delete API key route for admin
router.get('/delete', requireAuth, async (req, res) => {
  const { name } = req.query;
  // Delete the specified API key
  let result = await keydb.deleteOne({ _id: name });
  if (result.deletedCount) {
    res.status(200).send();
  } else {
    res.status(401).send();
  }
});

// Upload file route for admin
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  const startTime = new Date();
  if (!req.file) {
    // Return an error if no file is uploaded
    res.status(400).send('No file uploaded.');
    return;
  }

  var sem = req.body.sem;
  var phase = req.body.phase;
  const subject = req.body.subject;
  if (!sem || !phase || !subject) {
    // Return an error if required fields are missing
    res.status(400).json({ message: 'Improper fields entered.' });
    return;
  }
  sem = 'sem' + sem;
  phase = 't' + phase;
  const results = [];
  const mypath = `academic.${sem}.total`;
  const home = `academic.${sem}.${phase}.${subject}`;

  csv()
    .fromFile(req.file.path)
    .then(async (jsonObj) => {
      try {
        const jsonData = jsonObj.map((item) => ({
          enroll: parseInt(item.enroll),
          marks: parseInt(item.marks),
          rank: parseInt(item.rank),
        }));

        const existingDocument = await studinfo.find({ [home]: { $exists: true } }, { projection: { _id: 1, [home]: 1 } }).toArray();

        const updateOps1 = jsonData.map((item) => ({
          updateOne: {
            filter: { enroll: item.enroll },
            update: {
              $set: {
                [`${home}.marks`]: item.marks,
                [`${home}.rank`]: item.rank,
              },
            },
          },
        }));

        const result1 = await studinfo.bulkWrite(updateOps1);

        const documents = await studinfo.find({}, { projection: { _id: 1, [home]: 1, [mypath]: 1 } }).toArray();

        totalData = calcTotal(documents, existingDocument, sem, phase, subject);
        rankData = calcRank(totalData);

        const updateOps2 = rankData.map(data => ({
          updateOne: {
            filter: { _id: data._id },
            update: { $set: { [mypath]: data.total } },
          },
        }));

        const result2 = await studinfo.bulkWrite(updateOps2);

        console.log(`Updated ${result2.modifiedCount} documents`);
        res.status(200).json({ message: `File uploaded and processed successfully.\nUpdated ${result2.modifiedCount} documents.` });
        return;
      } catch (error) {
        console.error('Error updating documents:', error);
        res.status(500).json({ message: 'Internal server error' });
        return;
      }
    });
});

module.exports = router;
