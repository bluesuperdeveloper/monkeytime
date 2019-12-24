/* eslint-disable one-var */
const functions = require('firebase-functions');
let admin = require('firebase-admin');
let serviceAccount = require('./serviceAccountKey.json');
const app = require('express')();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://monkeytime-9a89a.firebaseio.com',
});

let firebaseConfig = require('./firebaseConfig.json');
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

// Express allows us to use the same endpoint name,'shouts', but handle 2 endpoints; GET, POST etc.
// Without express, you'd have to check whether we're doing POST or GET and respond accordingly.
// The first param is name of route and 2nd is the handler
app.get('/shouts', (req, res) => {
    // .get returns a promise which holds a querySnapshot, which contains an array of documents
    db.collection('shouts')
        .orderBy('createdAt', 'desc')
        .get() // returns all documents as an array
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

const FBAuth = (req, res, next) => {
    let idToken; // initialize ID Token
    // Checks if the authorization header exists and if it starts with Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        // Extract the id token.
        idToken = req.headers.authorization.split('Bearer ')[1];
    } else {
        console.error('No token found');
        return res.status(403).json({error: 'Unauthorized'});
    }
    // Need to verify that token was issued by our application and not somewhere else
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => { // holds user data inside token
            req.user = decodedToken;
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1) // limits results to 1 document
                .get();
        })
        .then((data) => {
            req.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch((err) => { // token invalid, blacklisted
            console.error('Error while verifying token', err);
            return res.status(403).json(err);
        });
};

// This function also accesses the same endpoint name, but with a POST request.
// Post 1 shout
app.post('/shout', FBAuth, (req, res) => {
    // Assigns data in request body to newShout
    if (req.body.body.trim() === '') {
        return res.status(400).json({body: 'Body must not be empty'});
    }
    const newShout = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString(),
    };
    db.collection('shouts')
        .add(newShout) // add newShout as a document to 'shouts' collection
        .then((doc) =>{
            res.json({message: `document ${doc.id} creation all good`});
    }).catch((err) => {
        res.status(500).json({error: 'Something fked up bruh'});
        console.error(err);
    });
});

const isEmail = (email) =>{
    // eslint-disable-next-line max-len
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
};

const isEmpty = (string) => {
    if (string.trim()==='') return true;
    else return false;
};

// Signup route
app.post('/signup', (req, res)=>{
    // Assign the data sent in request body to newUser
    const newUser = {
        email: req.body.email,
        password: req .body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = 'Must not be empty';
    } else if (!isEmail(newUser.email)) {
        errors.email = 'Yo, your email aint valid fam';
    }

    if (isEmpty(newUser.password)) errors.password = 'You aint got a password?';
    if (newUser.password!== newUser.confirmPassword) {
        errors.confirmPassword = 'Passwords gotta match bruh';
    }

    if (isEmpty(newUser.handle)) errors.handle = 'Bruh you aint got a handle??';

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors);
    }

    let token, userId;
    // Go into users collection and see if there's already a user with
    // the handle just passed in by the request.
    db.doc(`/users/${newUser.handle}`).get()
        .then((doc) =>{
            if (doc.exists) {
                // 400 = Bad Request
                return res.status(400)
                // Err's name is handle
                .json({handle: 'This handle is already taken.'});
            } else { // if there's isnt'a  user then create one.
                return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        // this .then is for when the getIdToken comes back/returns
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId,
            };
            // Create new user document in the "users" collection & names it handle that
            // it was passed by the req body. Creates collection if it doesn't exist.
            // Set creates document.
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })// this .then is for when the set function returns
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

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    let errors = {};

    if (isEmpty(user.email)) errors.email = 'Must not be empty';
    if (isEmpty(user.password)) errors.password = 'Must not be empty';

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors);
    }

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.json({token});
        })
        .catch((err) => {
            console.error(err);
            if (error.code === 'auth/wrong-password') {
                return res.status(403).json({general: 'Wrong credentials, please try again'});
            } else return res.status(500).json({error: err.code});
        });
});

exports.api = functions.https.onRequest(app);
