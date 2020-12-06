const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./../datastore');
const e = require('express');

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

function get_library(library_id) {

    const key = ds.datastore.key([LIBRARIES, parseInt(library_id, 10)]);
    return ds.datastore.get(key)
        .then((entity) => {
            if (entity === undefined) {
                console.log("Entity is undefined");
                throw Error('No library with that id found.');
            } else {
                var library = entity[0]; 
                library.id = key.id;
                return library;
            }
        })
        .catch((err) => { throw err; });
}

function get_libraries(req) {
    var q = ds.datastore.createQuery(LIBRARIES).limit(5);

    if (Object.keys(req.query).includes("cursor")) {
        q = q.start(req.query.cursor);
    }

    return ds.datastore.runQuery(q)
        .then((entities) => {
            var results = {};
            results.libraries = entities[0].map(ds.fromDatastore);
            if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
                results.next = req.protocol + "://" + req.get("Host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
            return results;
        })
        .catch((err) => { console.log(`Caught error in get_libraries: ${err}`); throw err; });
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
    get_libraries(req)
        .then((entities) => {
            entities.libraries.forEach((library) => {
                library.self = req.protocol + '://' + req.get('Host') + '/libraries/' + library.id;
            });
            res.status(200).send(entities);
        })
        .catch((err) => { 
            console.log(`get /libraries caught ${err}`); 
            res.status(500).send(server_err);
        });
})
.get('/:library_id', (req, res) => {
    get_library(req.params.library_id)
        .then((library) => {
            library.self = req.protocol + '://' + req.get('Host') + '/libraries/' + library.id;
            res.status(200).send(library);
        })
        .catch((err) => {
            res.status(404).send({"Error": "No library with this library_id exists"});
        });
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