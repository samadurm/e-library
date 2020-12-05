const express = require('express');
const fs = require('fs');
var app = express();

var client_id = null;
var client_secret = null;

const url = 'https://samadurm-elibrary.wl.r.appspot.com/';

// can change this to whatever the file is that contains the client secret
const secret_file = 'client_secret.json'; 

fs.readFile(secret_file, 'utf8', (err, data) => {
    if (err) {
        console.log('Read error from file: ' + err);
    } else {
        const secretFile = JSON.parse(data);
        client_id = secretFile.web.client_id;
        client_secret = secretFile.web.client_secret;
    }
});

app.engine('html', require('ejs').renderFile);

app.use(express.static('public'));

app.use('/', express.static('public/html/'));
app.use('/', express.static('public/css/'));

app.get('/verification', (req, res) => {
    res.send("got here!!");
})


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}...`);
});