const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const { ObjectID } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_NAME = 'notes-api';
const DATABASE_URL = process.env.MONGODB_URI || 'mongodb+srv://notesApp:notesApp@cluster0-hnjd7.mongodb.net/test?retryWrites=true&w=majority';
const JWT_KEY = process.env.JWT_KEY || 'secret';
const JWT_EXPIRATION = 86400; // Validity time of JWT tokens (86400 seconds === 24 hours)

const BCRYPT_SALTROUND = 9; // Number of rounds used by Bcrypt

let collectionNotes;
let collectionUsers;

app.use(express.json());

(async () => {
  console.log(`Connecting to ${DATABASE_NAME}...`);
  const client = new MongoClient(DATABASE_URL, { useNewUrlParser: true });
  await client.connect();
  collectionNotes = client.db(DATABASE_NAME).collection('notes');
  collectionUsers = client.db(DATABASE_NAME).collection('users');
  console.log(`Successfully connected to ${DATABASE_NAME} !`);
  app.listen(PORT, function () {
    console.log('App is listening...');
  });
  // await client.close() // should be done when the server is going down
})();

function createToken(sub) {
  return jwt.sign({}, JWT_KEY, { expiresIn: JWT_EXPIRATION, subject: sub }).toString('base64');
}

function decodeToken(token) {
  try {
    return jwt.verify(token, JWT_KEY);
  } catch (e) {
    return e;
  }
}

async function getUser(req, res) {
  const token = req.get('x-access-token');
  if (!token) {
    res.status(401).send({
      error: 'Utilisateur non connecté',
    });
    return;
  }
  const decodedToken = decodeToken(token.toString());
  const user = await collectionUsers.findOne({ _id : ObjectID(decodedToken.sub) });
  if (!user) {
    res.status(401).send({
      error: 'Utilisateur non connecté',
    });
    return;
  }
  return user;
}

function passwordLengthIsEnough(password, res) {
  if (password === undefined || password.length < 4) {
    res.status(400).send({
      error: 'Le mot de passe doit contenir au moins 4 caractères',
    });
    return false;
  }
  return true;
}

function usernameLengthIsEnough(username, res) {
  if (username === undefined || username.length < 2 || username.length > 20) {
    res.status(400).send({
      error: 'Votre identifiant doit contenir entre 2 et 20 caractères',
    });
    return false;
  }
  return true;
}

function usernameIsMin(username, res) {
  let position = 0;
  while (position < username.length) {
    if (username.charCodeAt(position) < 97 || username.charCodeAt(position) > 122) {
      res.status(400).send({
        error: 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées',
      });
      return false;
    }
    position += 1;
  }
  return true;
}

// Return 'Hello World' when a GET request is made without argument
app.get('/', function (req, res) {
  res.send('Hello World');
});

app.post('/signup', async function (req, res) {
  const { username } = req.body;
  const { password } = req.body;

  if (!passwordLengthIsEnough(password, res)) {
    return;
  }

  if (!usernameLengthIsEnough(username, res)) {
    return;
  }

  if (!usernameIsMin(username, res)) {
    return;
  }

  const user = await collectionUsers.findOne({ username: { $eq: username } });
  if (user) {
    res.status(400).send({
      error: 'Cet identifiant est déjà associé à un compte',
    });
    return;
  }

  bcrypt.hash(password, BCRYPT_SALTROUND, async (err, hash) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    const { insertedId } = await collectionUsers.insertOne({
      username: username,
      password: hash,
    });
    res.send({
      error: null,
      token: createToken(insertedId.toString()),
    });
  });
});

app.post('/signin', async function (req, res) {
  const { username } = req.body;
  const { password } = req.body;

  if (!passwordLengthIsEnough(password, res)) {
    return;
  }

  if (!usernameLengthIsEnough(username, res)) {
    return;
  }

  if (!usernameIsMin(username, res)) {
    return;
  }

  const user = await collectionUsers.findOne({ username: { $eq: username } });
  if (user) {
    await bcrypt.compare(password, user.password, function (err, result) {
      if (result === true) {
        res.status(200).send({ error: null, token: createToken(user._id.toString()) });
      } else {
        res.status(403).send({
          error: 'Cet identifiant est inconnu',
        });
        return;
      }
    });
  } else {
    res.status(403).send({
      error: 'Cet identifiant est inconnu',
    });
    return;
  }
});

app.get('/notes', async function (req, res) {
  const user = await getUser(req, res);
  if (user) {
    res.status(200).send({
      error: null,
      notes: await collectionNotes.find({ userId: user._id }).sort({ createdAt: -1 }).toArray(),
    });
  }
});

app.put('/notes', async function (req, res) {
  const user = await getUser(req, res);
  if (user) {
    const note = {
      userId: user._id,
      content: req.body.content,
      createdAt: new Date(),
      lastUpdatedAt: null,
    };
    const { insertedId } = await collectionNotes.insertOne(note);
    res.status(200).send({
      error: null,
      note: {
        _id: insertedId,
        ...note,
      },
    });
  }
});

app.patch('/notes/:id', async function (req, res) {
  const user = await getUser(req, res);
  const note = await collectionNotes.findOne({ _id : ObjectID(req.params.id) });
  if (user !== undefined) {
    if (!note) {
      res.status(404)
        .send({
          error: 'Cet identifiant est inconnu',
        });
    } else if (note.userId.toString() !== user._id.toString()) {
      res.status(403)
        .send({
          error: 'Accès non autorisé à cette note',
        });
    } else {
      await collectionNotes
        .findOneAndUpdate({ _id: ObjectID(req.params.id)}, { $set: { content: req.body.content, lastUpdatedAt: new Date() } });
      res.send({
        error: null,
        note: await collectionNotes
          .findOne({ _id: ObjectID(req.params.id) }),
      });
    }
  }
});

app.delete('/notes/:id', async function(req, res) {
  const user = await getUser(req, res);
  const note = await collectionNotes.findOne({ _id: ObjectID(req.params.id) });
  if (user !== undefined){
    if (!note) { // Quand note est undefined il rentre dedans, mais fait quand même la suite
      res.status(404).send({
        error: 'Cet identifiant est inconnu',
      });
      return;
    } else if (note.userId.toString() !== user._id.toString()) {
      res.status(403).send({
        error: 'Accès non autorisé à cette note',
      });
      return;
    } else {
      await collectionNotes.deleteOne({ _id: ObjectID(req.params.id) });
      res.send({ error: null });
    }
  }
});