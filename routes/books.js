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

function is_bool(value) {
    if (typeof value === "boolean") {
        return true;
    }
    return false;
}

router
.post('/', (req, res) => {
    res.send("Got here in Books POST route");
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