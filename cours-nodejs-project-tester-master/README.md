# Ava tests for Note Keeper API

This repository contains automated tests to help students self-evaluate their implementation of their academic Node.js project: [API de gestion de notes personnelles](https://adrienjoly.com/cours-nodejs/05-proj/).

## Prerequisites

- [Node.js](https://nodejs.org)

## Usage

```
$ git clone https://github.com/adrienjoly/cours-nodejs-project-tester.git
$ cd cours-nodejs-project-tester
$ nvm use # to switch to the version of Node.js specified in .nvmrc
$ npm install
$ npm test     # to run tests using a in-memory database
```

The `npm test` command will run the `tests/all.test.js` test suite with Ava, against the endpoints implemented in `app.js`. This test suite will automatically start an in-memory MongoDB database and a dedicated Express server for each individual test.

Out of the box, most tests will fail. It's because the `app.js` provided in this repository misses the API endpoints that you have to implement yourself in the frame of this project!

Feel free to integrate these tests in your own repository. They should work as-is if:

- you define your Express endpoints in the `initApiEndpoints()` function exported by `app.js`,
- and make them use the `attachTo` and `db` parameters, instead of connecting them directly to your Express server and your MongoDB database.
