const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');


const fs = require('fs');
var app = express();
app.engine('html', require('ejs').renderFile);

var client_id = null;
var client_secret = null;
var jwt = null;

// const app_url = 'https://samadurm-elibrary.wl.r.appspot.com/';
const app_url = 'http://localhost:8080/';

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


app.use(express.static('public'));

app.use('/', express.static('public/html/'));
app.use('/', express.static('public/css/'));

const response_type = "code";

app.get('/verification', (req, res) => {
    // this will preserve the state for a given session
    if (!session.state) {
        session.state = Math.random().toString(10).substr(10);
    } 
    const redirect_auth_url = auth_url + "?" + "response_type=" + response_type + "&client_id=" + client_id + "&redirect_uri=" + redirect_uri + "&scope=" + scope + "&state=" + session.state;

    res.redirect(redirect_auth_url);  
})
app.get('/oauth', (req, res) => {
    if (req.query.error) {
        res.status(404).send("Did not authorize");
    } else if (req.query.code) {
        const data = {
            "code": req.query.code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        };
        axios.post("https://www.googleapis.com/oauth2/v4/token", data) 
            .then((entity) => { 
                var url = "https://people.googleapis.com/v1/people/me?personFields=names";
                url += "&access_token=" + entity.data.access_token;
                jwt = entity.data.id_token;

                axios.get(url)
                    .then((entity) => { 
                        var firstName = entity.data.names[0].givenName;
                        var lastName = entity.data.names[0].familyName;
                        res.redirect("/profile?firstName=" + firstName + "&lastName=" + lastName + "&state=" + session.state);
                    })
                    .catch((err) => {console.log(err); throw err; });
            })
            .catch((err) => { 
                res.status(400).send("Error. Error retrieving oauth token.");
            });
    }   
})
app.get("/profile", (req, res) => {
    const firstName = req.query.firstName;
    const lastName = req.query.lastName;
    // uses ejs html engine to set the parameters of the html file
    const profile_path = path.join(__dirname, "public/html", "profile.html");

    res.send(`Name: ${firstName} ${lastName} JWT ${jwt}`);
    // res.render(
    //     profile_path, 
    // );
})


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}...`);
});