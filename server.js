const axios = require('axios');
const {Datastore} = require('@google-cloud/datastore');
const express = require('express');
const path = require('path');
const session = require('express-session');
const ds = require('./datastore');
const router = express.Router();

const jwt_decode = require('jwt-decode');

const datastore = ds.datastore;

const fs = require('fs');
var app = express();
var usersRoute = express();

app.enable("trust proxy");
app.engine('html', require('ejs').renderFile);

var client_id = null;
var client_secret = null;
var jwt_token = null;

const method_not_allowed = {"Error": "Method not allowed"};

const app_url = '';

const auth_url = 'https://accounts.google.com/o/oauth2/v2/auth';
const redirect_uri = app_url + 'oauth';
const scope = 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const USERS = 'USERS';

function extract_sub(jwt_token){
    return jwt_decode(jwt_token).sub;
}

// can change this to whatever the file is that contains the client secret
const secret_file = 'client_secret.json'; 

fs.readFile(secret_file, 'utf8', (err, data) => {
    if (err) {
        throw Error('Read error from client_secret.json');
    } else {
        const secretFile = JSON.parse(data);
        client_id = secretFile.web.client_id;
        client_secret = secretFile.web.client_secret;
    }
});

function get_users() {
    const q = ds.datastore.createQuery(USERS);
    return ds.datastore.runQuery(q)
        .then((entities) => {
            // var results = {};
            // results.users = entities[0].map(ds.fromDatastore);
            // return results;
            return entities[0].map(ds.fromDatastore);
        })
        .catch((err) => { throw err; });
}

function add_user(user_data) {
    var key = datastore.key(USERS);

    return datastore.save({"key": key, "data": user_data})
        .then(() => { return key; })
        .catch((err) => { throw err; });
}

function check_user(user_data) {
    return get_users()
        .then((users) => {
            if (users.length > 0) {
                for (const user of users) {
                    if (user.unique_id === user_data.unique_id) {
                        return;
                    }
                }
            } 
            // if we got here then the user was not found in the database
            // so add the user
            add_user(user_data)
                .then(() => { return; })
                .catch((err) => { throw err; })
        })
        .catch((err) => { throw err; });
}

app.use(express.static('public'));

app.use('/', express.static('public/html/'));
app.use('/', express.static('public/css/'));
app.use('/', require('./index'));
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
        axios.post('https://www.googleapis.com/oauth2/v4/token', data) 
            .then((entity) => { 
                var url = 'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses';

                url += '&access_token=' + entity.data.access_token;
                jwt_token = entity.data.id_token;
                
                axios.get(url)
                    .then((entity) => { 
                        const first_name = entity.data.names[0].givenName;
                        const last_name = entity.data.names[0].familyName;
                        const email = entity.data.emailAddresses[0].value;
                        const sub = extract_sub(jwt_token);

                        const user_data = {
                            "unique_id": sub,
                            "first_name": first_name,
                            "last_name": last_name,
                            "email": email,
                        }
                        check_user(user_data)
                            .then(() => {
                                res.redirect("/profile?unique_id=" + sub + "&first_name=" + first_name + "&last_name=" + last_name + "&email=" + email + "&state=" + session.state);
                            })
                            .catch((err) => { throw err; });
                    })
                    .catch((err) => { throw err; });
            })
            .catch((err) => { 
                res.status(400).send("Error. Error retrieving oauth token.");
            });
    }   
})
router.get("/", (req, res) => {
    const first_name = req.query.first_name;
    const last_name = req.query.last_name;
    const unique_id = req.query.unique_id;
    const email = req.query.email;
    // uses ejs html engine to set the parameters of the html file
    const profile_path = path.join(__dirname, "public/html", "profile.html");

    res.render(path.join(__dirname, 'public/html', 'profile.html'), {first_name: first_name, last_name: last_name, email: email, unique_id: unique_id, jwt: jwt_token});
});

usersRoute.get('/', (req, res) => {
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send({"Error": "Must accept JSON format."});
    } else {
        get_users()
        .then((entities) => {
            entities.forEach((user) => {
                user.self = req.protocol + '://' + req.get('Host') + '/users/' + user.id;
            })
            res.status(200).send(entities);
        })
        .catch((err) => {
            res.status(500).send({"Error": "Internal Server Error."})
        });
    }
})
.get('/:user_id', (req, res) => {
    res.status(405).send(method_not_allowed);
})
.post('/', (req, res) => {
    res.status(405).send(method_not_allowed);
})
.put('/', (req, res) => {
    res.status(405).send(method_not_allowed);
})
.patch('/', (req, res) => {
    res.status(405).send(method_not_allowed);
})
.delete('/', (req, res) => {
    res.status(405).send(method_not_allowed);
})



app.use('/profile', router);
app.use('/users', usersRoute);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    if (app_url.length === 0) {
        console.log('Must add url that service is deployed to using variable app_url in server.js');
    } else {
        console.log(`Server listening on ${PORT}...`);
    }
});