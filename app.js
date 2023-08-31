const express = require('express');
const session = require('express-session');
const app = express();
const port = 3000;
const { MongoClient } = require('mongodb');

app.use(express.static('public/scripts'));
app.use(session({
    secret: 'asdfgh',
    resave: false,
    saveUninitialized: false
}));

const url = "mongodb://chacha:shrey5510@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const db = client.db('demo');
const authdb = db.collection('authdb');
const keydb = db.collection('keydb');

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
            res.status(401).json({ message: "Invalid Password" });
        }
    }
    else {
        res.status(500).json({ message: "Internal Server Error" });
    }
})

app.post('/keygen', requireAuth, async (req, res) => {
    const { uname } = req.body;
    const apikey = generateApiKey();
    try {
        let result = await keydb.insertOne({ _id: uname, key: apikey });
        res.status(200).json({ message: apikey });
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
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});