const functions = require('firebase-functions');
let admin = require("firebase-admin");
let serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monkeytime-9a89a.firebaseio.com"
});

const express = require('express');
const app = express();

//  Express allows us to use the same endpoint name ('shouts'), but handle 2 endpoints; GET, POST etc.
// Without express, you'd have to check whether we're doing POST or GET and responde accordingly.
// The first param is name of route and 2nd is the handler
app.get('/shouts',(req, res) => {
    //generally you run db.collection('collectionname')
    //in this case, the db is admin.firestore
    //.get returns a promise which holds a querySnapshot, which contains an array of documents
    admin
        .firestore()
        .collection('shouts')
        .orderBy('createdAt','desc')
        .get()
        .then((data) => {
            let posts = [];
            data.forEach((doc) => {//doc is just a reference. Use .data() returns data inside document
                posts.push({
                    shoutId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                }); 
            });
            return res.json(posts);
        })//This returns a Promise so it's good practice  to put a catch for any potential errors.
        .catch((err) => console.error(err)); 
}) 

// This funciton also accesses the same endpoint name, but with a POST request.
app.post('/shout', (req, res) => {
    if(req.method !== 'POST'){
        return res.status(400).json({error:'Method not allowed'})
    }
    const newShout = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    } 
    admin.firestore() 
        .collection('shouts')
        .add(newShout)
        .then(doc =>{
            res.json({message: `document ${doc.id} creation all good`});
    }).catch(err => {
        res.status(500).json({error: 'Something fked up bruh'});
        console.error(err); 
    })
});

exports.api = functions.https.onRequest(app); //This automatically turns into multiple routes