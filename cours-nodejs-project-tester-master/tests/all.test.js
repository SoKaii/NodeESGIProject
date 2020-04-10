const test = require('ava');
const axios = require('axios');

// That file will instantiate a new and separate Express app for each test
// and rely on an in-memory MongoDB database.
require('./setup/test-sandboxer')({ test });

const {
  DUMMY_OID,
  VALID_USER,
  VALID_USER_2,
  EXPIRED_TOKEN,
  passToken,
} = require('./setup/common');

// prevent axios from throwing exceptions for non-200 http responses
axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.resolve(error.response),
);

// golden path / success cases

test('GET / returns Hello World', async (t) => {
  const res = await axios.get(`${t.context.urlPrefix}`);
  t.is(res.status, 200);
  t.regex(res.data, /Hello World/i);
});

test('POST /signup returns a token', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER);
  t.is(res.status, 200);
  t.is(res.data.error, null);
  t.is(typeof res.data.token, 'string');
// t.log({ token: res.data.token });
});

test('POST /signin returns a token for an existing user', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER);
  t.is(res.status, 200);
  t.is(res.data.error, null);
  // t.log('token from /signup:', res.data.token);
  const res2 = await axios.post(`${t.context.urlPrefix}/signin`, VALID_USER);
  t.is(res2.status, 200);
  t.is(res2.data.error, null);
  t.is(typeof res2.data.token, 'string');
// t.log('token from /signin:', res2.data.token);
});

test('GET /notes of new user returns empty array', async (t) => {
  const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
  const res = await axios.get(`${t.context.urlPrefix}/notes`, passToken(token));
  t.is(res.status, 200);
  t.is(res.data.error, null);
  t.deepEqual(res.data.notes, []);
});

test('PUT /notes adds a note', async (t) => {
  const content = 'bonjour';
  const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
  const res = await axios.put(`${t.context.urlPrefix}/notes`, { content }, passToken(token));
  t.is(res.status, 200);
  t.is(res.data.error, null);
  t.is(res.data.note.content, content);
  const { data } = (await axios.get(`${t.context.urlPrefix}/notes`, passToken(token)));
  t.is(data.notes[0].content, content);
  t.is(typeof data.notes[0]._id, 'string'); // eslint-disable-line no-underscore-dangle
});

test('PATCH /notes/:id updates a note', async (t) => {
  const initialContent = 'bonjour';
  const updatedContent = 'hello';
  const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
  // 1. add a note
  const res = await axios.put(`${t.context.urlPrefix}/notes`, { content: initialContent }, passToken(token));
  const id = res.data.note._id; // eslint-disable-line no-underscore-dangle
  t.is(res.data.note.content, initialContent);
  // 2. update the note
  const res2 = await axios.patch(`${t.context.urlPrefix}/notes/${id}`, { content: updatedContent }, passToken(token));
  t.is(res2.status, 200);
  t.is(res2.data.error, null);
  t.is(res2.data.note.content, updatedContent);
  // 3. check that the note was really updated
  const { data } = await axios.get(`${t.context.urlPrefix}/notes`, passToken(token));
  t.is(data.error, null);
  const note = data.notes.find(({ _id }) => _id === id);
  t.is(note.content, updatedContent);
});

test('DELETE /notes/:id deletes a note', async (t) => {
  const content = 'bonjour';
  const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
  // 1. add a note
  const res = await axios.put(`${t.context.urlPrefix}/notes`, { content }, passToken(token));
  const id = res.data.note._id; // eslint-disable-line no-underscore-dangle
  // 2. delete the note
  const res2 = await axios.delete(`${t.context.urlPrefix}/notes/${id}`, passToken(token));
  t.is(res2.status, 200);
  t.is(res2.data.error, null);
  // 3. check that the note was really deleted
  const { data } = await axios.get(`${t.context.urlPrefix}/notes`, passToken(token));
  t.is(data.error, null);
  t.is(data.notes.length, 0);
});

// failure cases

test('POST /signup fails if password is not provided', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signup`);
  t.is(res.status, 400);
  t.is(res.data.error, 'Le mot de passe doit contenir au moins 4 caractères');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signup fails if username is not provided', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signup`, {
    password: 'aaaa',
  });
  t.is(res.status, 400);
  t.is(res.data.error, 'Votre identifiant doit contenir entre 2 et 20 caractères');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signup fails if username is invalid', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signup`, {
    username: 'containsUppercase',
    password: 'aaaa',
  });
  t.is(res.status, 400);
  t.is(res.data.error, 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signup fails if username already exists', async (t) => {
  const initialRes = await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER);
  t.is(initialRes.status, 200);
  const res = await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER);
  t.is(res.status, 400);
  t.is(res.data.error, 'Cet identifiant est déjà associé à un compte');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signin fails if password is not provided', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signin`);
  t.is(res.status, 400);
  t.is(res.data.error, 'Le mot de passe doit contenir au moins 4 caractères');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signin fails if username is not provided', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signin`, {
    password: 'aaaa',
  });
  t.is(res.status, 400);
  t.is(res.data.error, 'Votre identifiant doit contenir entre 2 et 20 caractères');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signin fails if username is invalid', async (t) => {
  const res = await axios.post(`${t.context.urlPrefix}/signin`, {
    username: 'containsUppercase',
    password: 'aaaa',
  });
  t.is(res.status, 400);
  t.is(res.data.error, 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signin fails if user identifier is wrong', async (t) => {
  const initialRes = await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER);
  t.is(initialRes.status, 200);
  const res = await axios.post(`${t.context.urlPrefix}/signin`, { ...VALID_USER, username: 'unknown' });
  t.is(res.status, 403);
  t.is(res.data.error, 'Cet identifiant est inconnu');
  t.is(typeof res.data.token, 'undefined');
});

test('POST /signin fails if user password is wrong', async (t) => {
  const initialRes = await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER);
  t.is(initialRes.status, 200);
  const res = await axios.post(`${t.context.urlPrefix}/signin`, { ...VALID_USER, password: 'wrong' });
  t.is(res.status, 403);
  t.is(res.data.error, 'Cet identifiant est inconnu');
  t.is(typeof res.data.token, 'undefined');
});

test('GET /notes fails if no token was provided', async (t) => {
  const res = await axios.get(`${t.context.urlPrefix}/notes`);
  t.is(res.status, 401);
// t.is(res.data.error, 'missing token');
});

test('GET /notes fails if invalid token was provided', async (t) => {
  const res = await axios.get(`${t.context.urlPrefix}/notes`, passToken('xxx'));
  t.is(res.status, 401);
// t.is(res.data.error, 'jwt malformed');
});

test('GET /notes fails if expired token was provided', async (t) => {
  const res = await axios.get(`${t.context.urlPrefix}/notes`, passToken(EXPIRED_TOKEN));
  t.is(res.status, 401);
// t.is(res.data.error, 'invalid token');
// t.log({ data: res.data });
});

test('PUT /notes fails if expired token was provided', async (t) => {
  const res = await axios.put(`${t.context.urlPrefix}/notes`, { content: 'bonjour' }, passToken(EXPIRED_TOKEN));
  t.is(res.status, 401);
});

test('PATCH /notes/:id fails if invalid token', async (t) => {
  const res = await axios.patch(`${t.context.urlPrefix}/notes/${DUMMY_OID}`, { content: 'whatever' }, passToken(EXPIRED_TOKEN));
  t.is(res.status, 401);
// t.is(res.data.error, 'Utilisateur non connecté');
});

test('PATCH /notes/:id fails if unknown note id', async (t) => {
  const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
  const res = await axios.patch(`${t.context.urlPrefix}/notes/${DUMMY_OID}`, { content: 'whatever' }, passToken(token));
  t.is(res.status, 404);
  t.is(res.data.error, 'Cet identifiant est inconnu');
});

test('PATCH /notes/:id fails if belongs to another user', async (t) => {
  let id;
  // user 1: create a note
  await (async () => {
    const content = 'bonjour';
    const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
    const res = await axios.put(`${t.context.urlPrefix}/notes`, { content }, passToken(token));
    id = res.data.note._id; // eslint-disable-line no-underscore-dangle
  })();
  // user 2: try to update the note
  await (async () => {
    const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER_2)).data;
    const res = await axios.patch(`${t.context.urlPrefix}/notes/${id}`, { content: 'whatever' }, passToken(token));
    t.is(res.status, 403);
    t.is(res.data.error, 'Accès non autorisé à cette note');
  })();
});

test('DELETE /notes/:id fails if invalid token', async (t) => {
  const res = await axios.delete(`${t.context.urlPrefix}/notes/${DUMMY_OID}`, passToken(EXPIRED_TOKEN));
  t.is(res.status, 401);
// t.is(res.data.error, 'Utilisateur non connecté');
});

test('DELETE /notes/:id fails if unknown note id', async (t) => {
  const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
  const res = await axios.delete(`${t.context.urlPrefix}/notes/${DUMMY_OID}`, passToken(token));
  t.is(res.status, 404);
  t.is(res.data.error, 'Cet identifiant est inconnu');
});

test('DELETE /notes/:id fails if belongs to another user', async (t) => {
  let id;
  // user 1: create a note
  await (async () => {
    const content = 'bonjour';
    const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER)).data;
    const res = await axios.put(`${t.context.urlPrefix}/notes`, { content }, passToken(token));
    id = res.data.note._id; // eslint-disable-line no-underscore-dangle
  })();
  // user 2: try to delete the note
  await (async () => {
    const { token } = (await axios.post(`${t.context.urlPrefix}/signup`, VALID_USER_2)).data;
    const res = await axios.delete(`${t.context.urlPrefix}/notes/${id}`, passToken(token));
    t.is(res.status, 403);
    t.is(res.data.error, 'Accès non autorisé à cette note');
  })();
});

// Ref: https://github.com/avajs/ava/blob/master/docs/03-assertions.md#built-in-assertions
