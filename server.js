const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const https = require('https');

const PORT = process.env.PORT || 3000;
const DATABASE_NAME = "notes-api";
const MONGODB_URI = `mongodb+srv://notesApp:notesApp@cluster0-hnjd7.mongodb.net/test?retryWrites=true&w=majority`;

let collectionUsers;
let error;
const app = express();
app.use(express.json());

app.post('/signup', async function (req, res) {

    async function usernameExists(username) {
        const usersCreated = await collectionUsers.find({username: {$eq: username}}).toArray();
        if (usersCreated.length !== 0) {
            error = "Cet identifiant est deja associe a un compte";
            return error;
        }
    }

    function passwordLength(password) {
        if (password.length < 4) {
            error = "Le mot de passe doit contenir au moins 4 caracteres";
            return error;
        }
    }

    function usernameLength(username) {
        if (username.length < 2 || username.length > 20) {
            error = "Votre identifiant doit contenir entre 2 et 20 caractères";
            return error;
        }
    }

    function usernameIsMin(username) {
        let position = 0;
        while (position < username.length) {
            if (username.charCodeAt(position) < 97 || username.charCodeAt(position) > 122) {
                error = "Votre identifiant ne doit contenir que des lettres minuscules non accentuées";
                position = username.length;
            } else {
                position++;
            }
        }
    }

    const username = req.body.username;
    const password = req.body.password;

    await passwordLength(password);
    await usernameLength(username);
    await usernameIsMin(username);
    await usernameExists(username);


    if (error === undefined) {
        const user = {username: username, password: password};

        await collectionUsers.insertOne(user);
        res.send("token");
    } else {
        res.status(400).send(error);
    }

})


;(async () => {
    console.log(`Connecting to ${DATABASE_NAME}...`);
    const client = new MongoClient(MONGODB_URI, {useNewUrlParser: true});
    await client.connect()
    collectionUsers = client.db(DATABASE_NAME).collection("users");
    console.log(`Successfully connected to ${DATABASE_NAME}`);
    app.listen(PORT, function () {
        console.log('Example app listening on port 3000!')
    })
    // await client.close() // should be done when the server is going down
})()