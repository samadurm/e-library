const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./../datastore');

const BOOKS = 'BOOKS';
const server_err = {"Error": "Internal Server Error"};
const json_accept_err = {"Error": "Must accept JSON format."};
const json_content_err = {"Error": "Content must be in JSON format."};

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


function add_book(title, author, genre) {
    var key = ds.datastore.key(BOOKS);
    
    const book = {
        "title": title, 
        "author": author,
        "genre": genre,
        "library": null,
        "rented_by": null
    };

    return ds.datastore.save({"key": key, "data": book})
        .then(() => {
            book.id = key.id;
            return book;
        })
        .catch((err) => { console.log(`Error in add_book: ${err}`); throw err; });
}

router
.post('/', (req, res) => {
    const err_response = {"Error": "The request object is missing at least one of the required attributes, or one of the attributes is invalid."};
    const accepts = req.accepts(['application/json']);
    res.set("Content", "application/json");

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).send(json_content_err);
    } else if (is_undefined(req.body) || is_undefined(req.body.title) || is_undefined(req.body.author) || is_undefined(req.body.genre)) {
        res.status(400).send(err_response);
    } else if (!is_valid_string(req.body.title, 255) || !is_valid_string(req.body.author, 255) || !is_valid_string(req.body.genre, 255)) {
        res.status(400).send(err_response);
    } else {
        add_book(req.body.title, req.body.author, req.body.genre)
            .then((book) => {
                book.self = req.protocol + '://' + req.get('Host') + '/books/' + book.id;   
                res.status(201).send(book);
            })
            .catch((err) => {
                console.log(`add_book caught ${err}`);
                res.status(500).send(server_err)
            });
    }
})
.get('/:book_id', (req, res) => {
    res.send("Got here in Books GET by id route");
})
.get('/', (req, res) => {
    res.send("Got here in GET all books route");
})
.patch('/:book_id', (req, res) => {
    res.send("Got here in PATCH books route");
})
.put('/:book_id', (req, res) => {
    res.send("Got here in PUT books route");
})
.delete('/:book_id', (req, res) => {
    res.send("Got here in delete book route");
})

module.exports = router;