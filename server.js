const assert = require("assert")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const { ObjectID } = require('mongodb');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_NAME = "notes-api";
const DATABASE_URL = process.env.MONGODB_URI || `mongodb+srv://notesApp:notesApp@cluster0-hnjd7.mongodb.net/test?retryWrites=true&w=majority`;
const JWT_KEY = process.env.JWT_KEY || 'secret';
const JWT_EXPIRATION = 86400; // Validity time of JWT tokens (86400 seconds === 24 hours)

const BCRYPT_SALTROUND = 9; // Number of rounds used by Bcrypt

app.use(express.json());

(async () => {
    console.log(`Connecting to ${DATABASE_NAME}...`);
    const client = new MongoClient(DATABASE_URL, {useNewUrlParser: true});
    await client.connect()
    db = client.db(DATABASE_NAME);
    console.log(`Successfully connected to ${DATABASE_NAME} !`);
    app.listen(PORT, function () {
        console.log('App is listening...')
    })
    // await client.close() // should be done when the server is going down
})();

function createToken(sub) {
    return jwt.sign({}, JWT_KEY, {expiresIn: JWT_EXPIRATION, subject : sub});
};

function decodeToken(token) {
    try{
        return jwt.verify(token,JWT_KEY);
    } catch(e) {
        return e;
    }
};

async function getUser(req, res) {
    const token = req.get('x-access-token');
    if(!token) {
      res.status(401).send({
        error : 'Utilisateur non connecté',
      });
      return;
    } else {
      const decodedToken = decodeToken(token.toString());
      const user = await db.collection('users').findOne({_id : ObjectID(decodedToken.sub)})
      if(!user) {
        res.status(401).send({
          error : 'Utilisateur non connecté'
        });
        return;
      }
      return user;
    }
  }

// Return "Hello World" when a GET request is made without argument
app.get('/', function (req, res) {
    res.send('Hello World');
});

app.post('/signup', async function (req, res) {
    const { body } = req;

    if ((body.password || '').length < 4) {
      res.status(400).send({
        error : 'Le mot de passe doit contenir au moins 4 caractères',
      });
      return;
    }

    if ((body.username || '').length < 2 || body.username.length > 20) {
      res.status(400).send({
        error : 'Votre identifiant doit contenir entre 2 et 20 caractères',
      });
      return;
    }

    if (!body.username.match(/^[a-z]+$/)) {
      res.status(400).send({
        error : 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées',
      });
      return;
    }

    let user = await db.collection('users').findOne({username: {$eq: body.username}});
    if (user) {
      res.status(400).send({
        error : "Cet identifiant est déjà associé à un compte"
      });
      return;
    }

    bcrypt.hash(body.password, BCRYPT_SALTROUND, async (err,hash) => {
      if(err) {
        res.status(500).send(err.message);
        return;
      }
      const { insertedId } = await db.collection('users').insertOne({
        username : body.username,
        password : hash
      });
      res.send({
        error : null,
        token : createToken(insertedId.toString()),
      });
    });
  })

  app.post('/signin', async function (req, res) {
    const { body } = req;

    if ((body.password || '').length < 4) {
      res.status(400).send({
        error : 'Le mot de passe doit contenir au moins 4 caractères',
      });
      return;
    }

    if ((body.username || '').length < 2 || body.username.length > 20) {
      res.status(400).send({
        error : 'Votre identifiant doit contenir entre 2 et 20 caractères',
      });
      return;
    }

    if (!body.username.match(/^[a-z]+$/)) {
      res.status(400).send({
        error : 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées',
      });
      return;
    }

    let user = await db.collection('users').findOne({username: {$eq: body.username}});
    if (user) {
      await bcrypt.compare(body.password, user.password, function(err, result) {
        if (result === true) {
          res.status(200).send({error: null, token: createToken(user._id.toString())});
        } else {
          res.status(403).send({
            error : 'Cet identifiant est inconnu'
          });
          return;
        }
      })
    } else {
      res.status(403).send({
        error : "Cet identifiant est inconnu"
      });
      return;
    }
  });

  app.get('/notes', async function (req, res) {
    const user = await getUser(req, res);
    if(user){
      res.status(200).send({
        error: null,
        notes: await db.collection('notes').find({userId: user._id}).toArray()
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
      const { insertedId } = await db.collection('notes').insertOne(note);
      res.status(200).send({
        error: null,
        note: {
          _id: insertedId,
          ...note,
        },
      });
    }
  });

  app.patch('/notes/:id', async function(req, res) {
    const user = await getUser(req, res);
    const note = await db.collection('notes').findOne({_id : ObjectID(req.params.id) });
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
        await db.collection('notes')
          .updateOne({ _id: ObjectID(req.params.id) }, {$set : {content : req.body, lastUpdatedAt : new Date()}});
        res.send({
          error: null,
          note: await db.collection('notes')
            .findOne({ _id: ObjectID(req.params.id) }),
        });
      }
    }
  });

  app.delete('/notes/:id', async function(req, res) {
    const user = await getUser(req, res);
    const note = await db.collection('notes').findOne({ _id: ObjectID(req.params.id) });
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
        await db.collection('notes').deleteOne({ _id: ObjectID(req.params.id) });
        res.send({ error: null, });
      }
    }
  });







