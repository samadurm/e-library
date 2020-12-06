const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./../datastore');

const LIBRARIES = 'LIBRARIES';

router
.post('/', (req, res) => {
    // if (req.body.name) {

    // }
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