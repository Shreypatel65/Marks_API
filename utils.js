const { MongoClient } = require('mongodb');

// MongoDB connection URL with relevant options
const url = "mongodb://chacha:shrey5510@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1";

// Create a new MongoClient instance with specified URL and options
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to the 'demo' database and obtain collection references
const db = client.db('demo');
const authdb = db.collection('authdb');
const keydb = db.collection('keydb');
const studinfo = db.collection('studinfo');

// Function to generate a random API key
const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const apiKeyLength = 32;
    let apiKey = '';
    for (let i = 0; i < apiKeyLength; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        apiKey += chars[randomIndex];
    }
    return apiKey;
};

// Function for input validation
const inputCheck = (query) => {
    if ((!query.batch || !query.rollno) && !query.enrollno) {
        return { error: 'Improper Input' };
    }
    if ((query.batch || query.rollno) && query.enrollno) {
        return { error: 'Provide either batch and rollno or enrollment number, not both' };
    }
    if (query.batch) {
        query.batch = query.batch.toUpperCase();
    }
    if (query.rollno) {
        query.rollno = parseInt(query.rollno);
    }
    if (query.enrollno) {
        query.enrollno = parseInt(query.enrollno);
    }
    return query;
};

// Middleware function for requiring authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next(); // Proceed to the next middleware if user is authenticated
    }
    res.status(403).send('Access denied'); // Respond with a 403 Forbidden status if not authenticated
};

module.exports = { generateApiKey, inputCheck, requireAuth, studinfo, authdb, keydb };
