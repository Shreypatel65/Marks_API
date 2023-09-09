// Import required libraries
const { MongoClient } = require('mongodb');

// MongoDB connection URL with relevant options
const url = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1";

// Create a new MongoClient instance with specified URL and options
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to the 'demo' database and obtain collection references
const db = client.db('fsd');
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
    if ((!query.batch || !query.rollno) && !query.enroll) {
        return { error: 'Improper Input' };
    }
    if ((query.batch || query.rollno) && query.enroll) {
        return { error: 'Provide either batch and rollno or enrollment number, not both' };
    }
    if (query.batch) {
        query.batch = query.batch.toUpperCase();
    }
    if (query.rollno) {
        query.rollno = parseInt(query.rollno);
    }
    if (query.enroll) {
        query.enroll = parseInt(query.enroll);
    }
    return query;
};

// Middleware function for requiring authentication
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        return next(); // Proceed to the next middleware if user is authenticated
    }
    res.status(403).json({ message: 'Access Denied: You are not authenticated.' }); // Respond with a 403 Forbidden status if not authenticated
};

// Function to calculate the total marks for each student
const calcTotal = (data, existingDocument, sem, phase, subject) => {
    data.forEach(obj => {
        const marks = obj.academic[sem][phase][subject].marks;
        const totalm = obj.academic[sem].total?.marks ?? 0;
        const existingMarks = existingDocument.find(doc => doc._id.toString() === obj._id.toString())?.academic[sem][phase][subject].marks || 0;
        const mm = parseFloat([marks]) + parseFloat([totalm]) - parseFloat([existingMarks])
        obj.total = { marks: mm, rank: 0 };
    });
    return data;
};

// Function to calculate the rank for each student based on total marks
const calcRank = (data) => {
    data.sort((a, b) => b.total.marks - a.total.marks);
    let currentRank = 1;
    data.forEach((obj, index) => {
        if (index > 0 && obj.total.marks !== data[index - 1].total.marks) {
            currentRank = index + 1;
        }
        obj.total.rank = currentRank;
    });
    return data;
};

// Export all the functions and collections for use in other modules
module.exports = { generateApiKey, inputCheck, requireAuth, calcTotal, calcRank, studinfo, authdb, keydb };
