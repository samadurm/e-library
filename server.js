const express = require('express');
const session = require('express-session');

const fs = require('fs');
var app = express();

var client_id = null;
var client_secret = null;

const app_url = 'https://samadurm-elibrary.wl.r.appspot.com/';
const auth_url = "https://accounts.google.com/o/oauth2/v2/auth";
const redirect_uri = app_url + 'oauth';
const scope = "https://www.googleapis.com/auth/userinfo.profile";

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

const response_type = "code";

app.get('/verification', (req, res) => {
    // this will preserve the state for a given session
    if (!session.state) {
        session.state = Math.random().toString(10).substr(10);
    } 
    // const auth_url = url + "?" + "response_type=" + response_type + "&client_id=" + client_id + "&redirect_uri=" + redirect_uri + "&scope=" + scope + "&" + secret_key + "&state=" + session.state;
    const redirect_auth_url = auth_url + "?" + "response_type=" + response_type + "&client_id=" + client_id + "&redirect_uri=" + redirect_uri + "&scope=" + scope + "&state=" + session.state;

    res.redirect(redirect_auth_url);  
})


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}...`);
});