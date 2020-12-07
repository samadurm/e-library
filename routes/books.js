const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./../datastore');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');


const BOOKS = 'BOOKS';
const LIBRARIES = 'LIBRARIES';
const server_err = {"Error": "Internal Server Error"};
const json_accept_err = {"Error": "Must accept JSON format."};
const json_content_err = {"Error": "Content must be in JSON format."};

router.use(bodyParser.json());

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: `https://www.googleapis.com/oauth2/v3/certs`
        }),
        // Validate the audience and the issuer.
        issuer: `https://accounts.google.com`,
        algorithms: ['RS256']
});

function is_undefined(data) {
    return data === undefined ? true : false;
}

function is_valid_string(value, length) {
    if (typeof value === "string" && value.length <= length) {
        return true;
    }

    return false;
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

function remove_book_from_library(book, library) {
    book.library = null;
    var updated_books = [];

    library.books.forEach((lib_book) => {
        if (lib_book !== book.id) {
            updated_books.push(book.id);
        } 
    });

    library.books = updated_books;

    const lib_key = ds.datastore.key([LIBRARIES, parseInt(library.id, 10)]);
    const book_key = ds.datastore.key([BOOKS, parseInt(book.id, 10)]);

    // remove this id's since they are already internally stored.
    delete book.id;
    delete library.id;

    return (
        ds.datastore.save({"key": lib_key, "data": library})
            .then(() => {
                return ds.datastore.save({"key": book_key, "data": book})
                    .then(() => { return book; })
                    .catch(() => { 
                        console.log("add_book_to_library caught error in saving updated book: " + err);
                        throw err; 
                    })
            })
            .catch((err) => { 
                console.log("add_book_to_library caught error in saving updated library: " + err);
                throw err;
            })
    );
}

function add_book(title, author, genre, sub) {
    var key = ds.datastore.key(BOOKS);

    const book = {
        "title": title, 
        "author": author,
        "genre": genre,
        "library": null,
        "owner": sub
    };

    return ds.datastore.save({"key": key, "data": book})
        .then(() => {
            book.id = key.id;
            return book;            
        })
        .catch((err) => { console.log(`Error in add_book: ${err}`); throw err; });
}

function get_book(book_id) {
    const key = ds.datastore.key([BOOKS, parseInt(book_id, 10)]);
    
    return ds.datastore.get(key)
        .then((entity) => {
            if (entity === undefined) {
                console.log("Entity is undefined");
                throw Error('No book with that id found.');
            } else {
                var book = entity[0]; 
                book.id = key.id;
                return book;
            }
        })
        .catch((err) => { throw err; });
}

function get_books(req, sub) {
    var q = ds.datastore.createQuery(BOOKS).limit(5).filter('owner', '=', sub);

    if (Object.keys(req.query).includes("cursor")) {
        q = q.start(req.query.cursor);
    }

    return ds.datastore.runQuery(q)
        .then((entities) => {
            var results = {};
            results.books = entities[0].map(ds.fromDatastore);
            if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
                results.next = req.protocol + "://" + req.get("Host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
            return results;
        })
        .catch((err) => { console.log(`Caught error in get_books: ${err}`); throw err; });
}

function edit_book(book, title, author, genre) {
    const key = ds.datastore.key([BOOKS, parseInt(book.id, 10)]);

    if (!is_undefined(title)) {
        book.title = title;
    }

    if (!is_undefined(author)) {
        book.author = author;
    }

    if (!is_undefined(genre)) {
        book.genre = genre;
    }

    return ds.datastore.save({"key": key, "data": book})
        .then(() => {
            book.id = key.id;
            return book;
        }) 
        .catch((err) => { console.log(`edit_book caught ${err}`); throw err; });
}

function delete_book(book) {
    const key = ds.datastore.key([BOOKS, parseInt(book.id, 10)]);
    return ds.datastore.delete(key)
        .then(() => { return; })
        .catch((err) => { throw err; });
}

router
.post('/', checkJwt, (req, res) => {
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
        add_book(req.body.title, req.body.author, req.body.genre, req.user.sub)
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
.get('/:book_id', checkJwt, (req, res) => {
    
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else {
        get_book(req.params.book_id)
            .then((book) => {
                if (book.owner != req.user.sub) {
                    res.status(403).send({"Error": "Not the owner for this book."});
                } else {
                    book.self = req.protocol + '://' + req.get('Host') + '/books/' + book.id;   
                    res.status(200).send(book);    
                }
            })
            .catch((err) => {
                console.log(`get /book_id caught: ${err}`);
                res.status(404).send({"Error": "No book with this book_id exists"});
            });
    }
})
.get('/', checkJwt, (req, res) => {
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else {
        get_books(req, req.user.sub)
            .then((entities) => {
                entities.books.forEach((book) => {
                    book.self = req.protocol + '://' + req.get('Host') + '/libraries/' + book.id;
                });
                res.status(200).send(entities);
            })
            .catch((err) => {
                res.status(500).send(server_err);
            });
    }
})
.patch('/:book_id', (req, res) => {
    const err_msg = {"Error":  "The request object is either missing either all of the attributes or contains an invalid attribute."};
    
    res.set("Content", "application/json");
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else if(req.get('content-type') !== 'application/json'){
        res.status(415).send(json_content_err);
    } else if (is_undefined(req.body) || is_undefined(req.body.title) && is_undefined(req.body.author) && is_undefined(req.body.genre)) {
        res.status(400).send(err_msg);
    } else {
        var isValid = true;
        // now make sure that defined parameters are valid:
        if (!is_undefined(req.body.name)) {
            if (!is_valid_string(req.body.title, 255)) {
                isValid = false;
            }
        }
        if (!is_undefined(req.body.city)) {
            if (!is_valid_string(req.body.author, 255)) {
                isValid = false;
            }
        }
        if (!is_undefined(req.body.author)) {
            if (!is_valid_string(req.body.author, 255)) {
                isValid = false;
            }
        }
        if (!isValid){
            res.status(400).send(err_msg);
        } else {
            get_book(req.params.book_id)
                .then((book) => {
                    edit_book(book, req.body.title, req.body.author, req.body.genre)
                        .then((updated) => {
                            updated.self = req.protocol + '://' + req.get('Host') + '/books/' + book.id;
                            res.status(200).send(updated);
                        })
                        .catch((err) => {
                            res.status(500).send(server_err);
                        });
                })
                .catch((err) => {
                    console.log(`${err}`);
                    res.status(404).send({"Error": "No book with this book_id exists"});
                });
        }
    }
})
.put('/:book_id', (req, res) => {
    const err_msg = {"Error": "The request object is either missing an attribute or contains an invalid attribute."};
    
    res.set("Content", "application/json");
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else if(req.get('content-type') !== 'application/json'){
        res.status(415).send(json_content_err);
    } else if (is_undefined(req.body) || is_undefined(req.body.title) || is_undefined(req.body.author) || is_undefined(req.body.genre)) {
        res.status(400).send(err_msg);
    } else {
        get_book(req.params.book_id)
            .then((book) => {
                edit_book(book, req.body.title, req.body.author, req.body.genre)
                    .then((updated) => {
                        updated.self = req.protocol + '://' + req.get('Host') + '/books/' + book.id;
                        res.status(200).send(updated);
                    })
                    .catch((err) => {
                        res.status(500).send(server_err);
                    });
            })
            .catch((err) => {
                console.log(`${err}`);
                res.status(404).send({"Error": "No book with this book_id exists"});
            });
    }
})
.delete('/:book_id', (req, res) => {
    get_book(req.params.book_id)
        .then((book) => {
            if (book.owner !== null) {
                res.status(403).send({"Error": "Cannot delete book as it is rented by a user. Remove the book from the user first."})
            } else {
                if (book.library !== null) {
                    get_library(book.library)
                        .then((library) => {
                            remove_book_from_library(book, library).catch((err) => { throw err; })
                        })
                        .catch((err) => {
                            console.log(`caught error ${err}`);
                            throw err;
                        });
                }
                delete_book(book)
                    .then(() => {
                        res.status(204).end();
                    })
                    .catch((err) => {
                        console.log(`Error from delete_book: ${err}`);
                        throw err;
                    });
            }
        })
        .catch((err) => {
            console.log(`Couldnt find book ${err}`);
            res.status(404).send({"Error": "No book with this book_id exists"})
        });
})

module.exports = router;