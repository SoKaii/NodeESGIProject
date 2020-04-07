const MongoClient = require('mongodb').MongoClient;
const express = require('express');
const { ObjectID } = require('mongodb');

const DATABASE_URI = process.env.DATABASE_URI || 'mongodb+srv://notesApp:notesApp@cluster0-hnjd7.mongodb.net/test?retryWrites=true&w=majority';
const PORT = process.env.PORT || 3000;
const DATABASE_NAME = 'notes-api';
var app = express();

app.use(express.json());
const fs = require('fs');

app.get('/', function (req, res) {
    res.send('Hello World');
    console.log('Hello World');
})

app.get('/notes', function (req, res) {
    var doc  = [];
    (async function() {
        const client = new MongoClient(DATABASE_URI);
        try {
            await client.connect();
            console.log("connected correctly to server");
            const db = client.db(DATABASE_NAME);
            const col = db.collection('notes');
            const cursor = col.find();
            var i = 1;
            while(await cursor.hasNext()) {
                doc[i] = await cursor.next();
                i++;
            }
            console.log(doc);
            res.send(doc);
        } catch(err) {
            console.log(err.stack);
        }
        client.close();
    })();
})

app.listen(PORT, function () {
    console.log('App is listening on port 3000');
})