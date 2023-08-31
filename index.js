const { MongoClient } = require('mongodb');
const express = require('express');
const app = express();
const port = 3000;

const url = "mongodb://chacha:shrey5510@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.10.1";


const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect().then(() => {
    const db = client.db('demo');
    const studinfo = db.collection('studinfo');

    function inputCheck(query) {
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
    }

    app.get('/', async (req, res) => {
        // const startTime = new Date();
        const query = req.query;
        const validQuery = inputCheck(query)
        if ('error' in validQuery) {
            res.status(400).json({ error: validQuery.error });
            return;
        }
        console.log(validQuery)
        try {
            const projection = { _id: 0 };
            const data = await studinfo.findOne(validQuery, { projection });
            console.log(([data]).length);
            if (data) {
                res.status(200).json(data);
                // const endTime = new Date();
                // const elapsedTime = endTime - startTime; // Time in milliseconds
                // res.status(200).json({msg:`Time taken to process is ${elapsedTime}`});
                return;
            }
            res.status(400).json({ error: 'No matching data found' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.listen(port);
}).catch(err => {
    console.error("Error connecting to MongoDB:", err);
    client.close();
});