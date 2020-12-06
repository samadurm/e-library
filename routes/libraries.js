const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./../datastore');

const LIBRARIES = 'LIBRARIES';
const server_err = {"Error": "Internal Server Error"};

router.use(bodyParser.json());

function is_undefined(data) {
    return data === undefined ? true : false;
}

function is_valid_string(value, length) {
    if (typeof value === "string" && value.length <= length) {
        return true;
    }
    return false;
}

function is_bool(value) {
    if (typeof value === "boolean") {
        return true;
    }
    return false;
}

function add_library(name, city, isPublic) {
    var key = ds.datastore.key(LIBRARIES);
    const library = {
        "name": name,
        "city": city,
        "isPublic": isPublic,
        "books": []
    }
    return ds.datastore.save({"key": key, "data": library})
        .then(() => {
            library.id = key.id;
            return library;
        })
        .catch((err) => { console.log(`Error caught in add_library: ${err}`); throw err; });
}

router
.post("/", (req, res) => {
    const err_response = {"Error": "The request object is missing at least one of the required attributes, or one of the attributes is invalid."};

    if (is_undefined(req.body) || is_undefined(req.body.name) || is_undefined(req.body.city) || is_undefined(req.body.isPublic)) {
        res.status(400).send(err_response);
    } else if (!is_valid_string(req.body.name, 255) || !is_valid_string(req.body.city, 255) || !is_bool(req.body.isPublic)) {
        res.status(400).send(err_response);
    } else {
        add_library(req.body.name, req.body.city, req.body.isPublic)
            .then((library) => {
                library.self = req.protocol + '://' + req.get('Host') + '/libraries/' + library.id;
                res.status(201).send(library);
            })
            .catch((err) => {
                console.log(`Error from add_library ${err}`);
                res.status(500).send(server_err);
            });
    }
})
.get('/', (req, res) => {
    res.send("Got here in get / request");
})
.get('/:library_id', (req, res) => {
    res.send("Got here in get library id");
})
.patch('/:library_id', (req, res) => {
    res.send("got here in patch library");
})
.put('/:library_id', (req, res) => {
    res.send("Got here in put library");
})
.delete('/:library_id', (req, res) => {
    res.send("Got here in delete library")
});

module.exports = router;