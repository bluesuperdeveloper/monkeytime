/* eslint-disable one-var */
const functions = require('firebase-functions');
let admin = require('firebase-admin');
let serviceAccount = require('./serviceAccountKey.json');
const app = require('express')();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://monkeytime-9a89a.firebaseio.com',
});

const firebaseConfig = {
    apiKey: 'AIzaSyB_ntEtX_guRhlbOJJScoY3Vn53pj-9lNA',
    authDomain: 'monkeytime-9a89a.firebaseapp.com',
    databaseURL: 'https://monkeytime-9a89a.firebaseio.com',
    projectId: 'monkeytime-9a89a',
    storageBucket: 'monkeytime-9a89a.appspot.com',
    messagingSenderId: '985593063206',
    appId: '1:985593063206:web:582777eeb77c387ccac3e7',
    measurementId: 'G-CBNZVHPG7E',
};

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// Express allows us to use the same endpoint name ('shouts'),
// but handle 2 endpoints; GET, POST etc.
// Without express, you'd have to check whether we're doing
// POST or GET and responde accordingly.
// The first param is name of route and 2nd is the handler
app.get('/shouts', (req, res) => {
    // generally you run db.collection('collectionname')
    // in this case, the db is admin.firestore
    // .get returns a promise which holds a querySnapshot,
    // which contains an array of documents
    db.collection('shouts')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let posts = [];
            // doc is just a reference. Use .data() returns data inside document
            data.forEach((doc) => {
                posts.push({
                    shoutId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                });
            });
            return res.json(posts);
        })// Returns a Promise -> good prac to put catch for potential errors.
        .catch((err) => console.error(err));
});

// This funciton also accesses the same endpoint name, but with a POST request.
app.post('/shout', (req, res) => {
    if (req.method !== 'POST') {
        return res.status(400).json({error: 'Method not allowed'});
    }
    const newShout = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString(),
    };
    db.collection('shouts')
        .add(newShout)
        .then((doc) =>{
            res.json({message: `document ${doc.id} creation all good`});
    }).catch((err) => {
        res.status(500).json({error: 'Something fked up bruh'});
        console.error(err);
    });
});

// Signup route
app.post('/signup', (req, res)=>{
    // Assign the data sent in request body to newUser
    const newUser = {
        email: req.body.email,
        password: req .body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    // TODO : validate data
    let token, userId;
    // Go into users collection and see if there already exists a user with the
    // handle just passed in by the request.
    db.doc(`/users/${newUser.handle}`).get()
        .then((doc) =>{
            if (doc.exists) {
                // 400 = Bad Request
                return res.status(400)
                // Err's name is handle
                .json({handle: 'This handle is already taken.'});
            } else {
                return firebase
        .auth()
        .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId,
            };
            // Create new user document in the "users" collection
            // & names it handle it was passed by the req body.
            // Creates collection if it doesn't exist.
            db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() =>{
            return res.status(201).json({token});
        })
        .catch((err) => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                // 400 client error/bad request
                return res.status(400).json({email: 'Bruh this email taken'});
            } else {
                res.status(501).json({error: err.code}); // 500 = Server error
            }
        });
});
// This automatically turns into multiple routes
exports.api = functions.https.onRequest(app);
