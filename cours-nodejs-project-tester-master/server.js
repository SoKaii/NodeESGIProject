const express = require('express');
// const { MongoClient } = require('mongodb');
const initApiEndpoints = require('./app');

const PORT = process.env.PORT || 3000;
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
// const DB_NAME = process.env.DB_NAME || 'notes-api';

/* eslint-disable no-console */
(async () => {
  // console.log(`Connecting to ${MONGODB_URI} ...`);
  // const client = new MongoClient(MONGODB_URI, { useNewUrlParser: true });
  // await client.connect();
  // const db = client.db(DB_NAME);
  const db = { collection: () => {} }; // fake database

  console.log(`Starting API server on port ${PORT} ...`);
  const app = express();
  initApiEndpoints({ attachTo: app, db });
  await app.listen(PORT);

  console.log(`=> Ready: listening on port ${PORT}`);
})();
/* eslint-enable no-console */
