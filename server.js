const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const express = require('express');
const { ObjectID } = require('mongodb');

const url = process.env.DATABASE_URL || 'mongodb+srv://notesApp:notesApp@cluster0-hnjd7.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'notes-api';
var app = express();

app.use(express.json());
const fs = require('fs');

app.patch('/notes/:id', function(req, res) {
    (async function() {
        const client = new MongoClient(url);
        try {
            await client.connect();
            console.log("connected correctly to server");
            const db = client.db(dbName);
            const col = db.collection('notes');
            col.countDocuments({_id : ObjectID(req.params.id)}, {}, function(err, count){
                if(count > 0) {
                    col.findOneAndUpdate({_id: ObjectID(req.params.id)},{$set : {content : req.body.content, lastUpdatedAt : new Date()}});
                    // col.updateOne({_id: ObjectID(req.params.id)},{content : req.body.content, lastUpdatedAt : new Date()});
                    console.log("Note "+req.params.id+" has been updated");
                } else {
                    console.log("Note is not find")
                }

            })
        } catch (err) {
            console.log(err.stack);
        }
    })();
})

app.delete('/notes/:id', function(req, res) {
    (async function() {
        const client = new MongoClient(url);
        try {
            await client.connect();
            console.log("connected correctly to server");
            const db = client.db(dbName);
            const col = db.collection('notes');
            col.countDocuments({_id : ObjectID(req.params.id)}, {}, function(err, count){
                if(count > 0) {
                    col.deleteOne({_id: ObjectID(req.params.id)},{});
                    console.log("Note "+req.params.id+" has been deleted");
                } else {
                    console.log("Note is not find")
                }

            })
        } catch (err) {
            console.log(err.stack);
        }
    })();
})


app.listen(process.env.PORT || 3000, function () {
    console.log('App is listening on port 3000');
})