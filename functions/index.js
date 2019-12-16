const functions = require('firebase-functions');
let admin = require("firebase-admin");
let serviceAccount = require("./serviceAccountKey.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://monkeytime-9a89a.firebaseio.com"
});
  
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello Heroes!!");
});

exports.getShouts = functions.https.onRequest((req, res) => {
    //generally you run db.collection('collectionname')
    //in this case, the db is admin.firestore
    //.get returns a promise which holds a querySnapshot, which contains an array of documents
    admin.firestore().collection('shouts').get()
        .then((data) => {
            let posts = [];
            data.forEach((doc) => {//doc is just a reference. Use .data() returns data inside document
                posts.push(doc.data());
            });
            return res.json(posts);
        })//This returns a Promise so it's good practice to put a catch for any potential errors.
        .catch((err) => console.error(err));
});

exports.createShout = functions.https.onRequest((req, res) => {
    if(req.method !== 'POST'){
        return res.status(400).json({error:'Method not allowed'})
    }
    const newShout = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
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