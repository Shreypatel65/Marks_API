const express = require('express');
const { inputCheck, studinfo, keydb } = require('./utils');
const router = express.Router();

// Define the marks-related routes here
router.get('/', async (req, res) => {
    try {
        // Check if the 'key' query parameter is present in the request
        const apiKey = req.query.key;

        if (!apiKey) {
            // If the 'key' parameter is missing, respond with a 400 Bad Request status and an error message
            res.status(400).json({ error: 'API key is required' });
            return;
        }

        // Check if the API key is present in the 'keydb' collection
        const keyData = await keydb.findOne({ key: apiKey });

        if (!keyData) {
            // If the API key is not found, respond with a 401 Unauthorized status and an error message
            res.status(401).json({ error: 'Unauthorized: Invalid API key' });
            return;
        }
        delete req.query.key;
        // Parse and validate the query parameters using the inputCheck function
        const query = req.query;
        const validQuery = inputCheck(query);

        if ('error' in validQuery) {
            // If the query is invalid, respond with a 400 Bad Request status and the error message
            res.status(400).json({ error: validQuery.error });
            return;
        }

        // Perform a database query to find data matching the validated query parameters
        // const projection = { _id: 0 };
        const data = await studinfo.findOne(validQuery);
        delete data._id;
        if (data) {
            // If data is found, respond with a 200 OK status and the data
            res.status(200).json(data);
            return;
        }

        // If no matching data is found, respond with a 400 Bad Request status and an error message
        res.status(400).json({ error: 'No matching data found' });
    } catch (err) {
        // Handle and log internal server errors, then respond with a 500 Internal Server Error status
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;