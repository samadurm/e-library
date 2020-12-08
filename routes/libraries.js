const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./../datastore');

const LIBRARIES = 'LIBRARIES';
const BOOKS = 'BOOKS';
const server_err = {"Error": "Internal Server Error"};
const json_accept_err = {"Error": "Must accept JSON format."};
const json_content_err = {"Error": "Content must be in JSON format."};
const method_not_allowed = {"Error": "Method not allowed"};

router.use(bodyParser.json());


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
    console.log(Object.keys(req.query));
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

function edit_library(library, name, city, isPublic) {
    
    const key = ds.datastore.key([LIBRARIES, parseInt(library.id, 10)]);

    if (!is_undefined(name)) {
        library.name = name;
    }
    if (!is_undefined(city)) {
        library.city = city;
    }
    if (!is_undefined(isPublic)) {
        library.isPublic = isPublic;
    }

    return ds.datastore.save({"key": key, "data": library})
        .then(() => {
            library.id = key.id;
            return library;
        })
        .catch((err) => { console.log(`edit_library caught ${err}`); throw err; });
}

function delete_library(library) {
    const key = ds.datastore.key([LIBRARIES, parseInt(library.id, 10)]);

    library.books.forEach((book_id) => {
        get_book(book_id)
            .then((book) => {
                book.library = null;
                var book_key = ds.datastore.key([BOOKS, parseInt(book.id, 10)]);  
                return ds.datastore.save({"key": book_key, "data": book});      
            })
            .catch((err) => {
                console.log(`Caught error in delete_library: ${err}`);
                throw err;
            });

    });

    return ds.datastore.delete(key)
        .then(() => { return; })
        .catch((err) => { throw err; });
}

function add_book_to_library(book, library) {
    book.library = library.id;
    library.books.push(book.id);

    console.log(JSON.stringify(book));
    console.log(JSON.stringify(library));

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

router
.post("/", (req, res) => {
    const err_response = {"Error": "The request object is missing at least one of the required attributes, or one of the attributes is invalid."};
    const accepts = req.accepts(['application/json']);
    res.set("Content", "application/json");

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).send(json_content_err);
    } else if (is_undefined(req.body) || is_undefined(req.body.name) || is_undefined(req.body.city) || is_undefined(req.body.isPublic)) {
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
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else {
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
    }
})
.get('/:library_id', (req, res) => {

    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else {
        get_library(req.params.library_id)
        .then((library) => {
            library.self = req.protocol + '://' + req.get('Host') + '/libraries/' + library.id;
            res.status(200).send(library);
        })
        .catch((err) => {
            res.status(404).send({"Error": "No library with this library_id exists"});
        });
    }
})
.patch('/:library_id', (req, res) => {
    const err_msg = {"Error":  "The request object is either missing either all of the attributes or contains an invalid attribute."};
    
    res.set("Content", "application/json");
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else if(req.get('content-type') !== 'application/json'){
        res.status(415).send(json_content_err);
    } else if (is_undefined(req.body) || is_undefined(req.body.name) && is_undefined(req.body.city) && is_undefined(req.body.isPublic)) {
        res.status(400).send(err_msg);
    } else {
        var isValid = true;
        // now make sure that defined parameters are valid:
        if (!is_undefined(req.body.name)) {
            if (!is_valid_string(req.body.name, 255)) {
                isValid = false;
            }
        }
        if (!is_undefined(req.body.city)) {
            if (!is_valid_string(req.body.city, 255)) {
                isValid = false;
            }
        }
        if (!is_undefined(req.body.isPublic)) {
            if (!is_bool(req.body.isPublic)) {
                isValid = false;
            }
        }
        if (!isValid){
            res.status(400).send(err_msg);
        } else {
            get_library(req.params.library_id)
                .then((library) => {
                    edit_library(library, req.body.name, req.body.city, req.body.isPublic)
                        .then((updated) => {
                            updated.self = req.protocol + '://' + req.get('Host') + '/libraries/' + library.id;
                            res.status(200).send(updated);
                        })
                        .catch((err) => { 
                            console.log(err); 
                            res.status(500).send(server_err);
                        });
                })
                .catch((err) => {
                    console.log(`Library not found: ${err}`);
                    res.status(404).send({"Error": "No library with this library_id exists"});
                });
        }
    }
})
.put('/:library_id', (req, res) => {
    const err_msg = {"Error":  "The request object is either missing an attribute or contains an invalid attribute."};
    
    res.set("Content", "application/json");
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send(json_accept_err);
    } else if(req.get('content-type') !== 'application/json'){
        res.status(415).send(json_content_err);
    } else if (is_undefined(req.body) || is_undefined(req.body.name) || is_undefined(req.body.city) || is_undefined(req.body.isPublic)) {
        res.status(400).send(err_msg);
    } else {
        var isValid = true;
        // now make sure that defined parameters are valid:

        if (!is_valid_string(req.body.name, 255)) {
            isValid = false;
        }
        if (!is_valid_string(req.body.city, 255)) {
            isValid = false;
        }
        if (!is_bool(req.body.isPublic)) {
            isValid = false;
        }

        if (!isValid){
            res.status(400).send(err_msg);
        } else {
            get_library(req.params.library_id)
                .then((library) => {
                    edit_library(library, req.body.name, req.body.city, req.body.isPublic)
                        .then((updated) => {
                            updated.self = req.protocol + '://' + req.get('Host') + '/libraries/' + library.id;
                            res.status(200).send(updated);
                        })
                        .catch((err) => { 
                            console.log(err); 
                            res.status(500).send(server_err);
                        });
                })
                .catch((err) => {
                    console.log(`Library not found: ${err}`);
                    res.status(404).send({"Error": "No library with this library_id exists."});
                });
        }
    }
})
.delete('/:library_id', (req, res) => {
    get_library(req.params.library_id)
        .then((library) => {
            delete_library(library)
                .then(() => {
                    res.status(204).end();
                })
                .catch((err) => {
                    console.log(`delete_library caught ${err}`);
                    res.status(500).send(server_err);
                })
        })
        .catch((err) => { 
            console.log(err); 
            res.status(404).send({"Error": "No library with this library_id exists."});
        });
})
.put('/:library_id/:book_id', (req, res) => {
    get_book(req.params.book_id)
        .then((book) => {
            get_library(req.params.library_id)
                .then((library) => {
                    if (book.library !== null) {
                        res.status(403).send({"Error": "The book is already assigned to a library"});
                    } else {
                        add_book_to_library(book, library)
                            .then(() => {
                                res.status(204).end();
                            })
                            .catch((err) => {
                                console.log(`caught error after add_book_to_library: ${err}`);
                                res.status(500).send(server_err);
                            });
                        }
                })
                .catch((err) => {
                    console.log(`got error ${err}`);
                    res.status(404).send({"Error": "The specified library and/or book does not exist"});
                });
        })
        .catch((err) => {
            res.status(404).send({"Error": "The specified library and/or book does not exist"});
        });
})
.delete('/:library_id/:book_id', (req, res) => {
    get_book(req.params.book_id)
        .then((book) => {
            get_library(req.params.library_id)
                .then((library) => {
                    if (book.library !== Number(req.params.library_id)) {
                        res.status(403).send({"Error": "The book is not assigned to the given library"});
                    } else {
                        remove_book_from_library(book, library)
                            .then(() => {
                                res.status(204).end();
                            })
                            .catch((err) => {
                                console.log(`caught error after remove_book_from_library: ${err}`);
                                res.status(500).send(server_err);
                            });
                    }
                })
                .catch((err) => {
                    console.log(`got error ${err}`);
                    res.status(404).send({"Error": "No book exists with this book_id at the library with this library_id."});
                });
            })
        .catch((err) => {
            res.status(404).send({"Error": "No book exists with this book_id at the library with this library_id."});
        });
})

//unsupported methods
.put('/', (req, res) => {
    res.status(405).send(method_not_allowed);
})
.patch('/', (req, res) => {
    res.status(405).send(method_not_allowed);
})
.delete('/', (req, res) => {
    res.status(405).send(method_not_allowed);
});

module.exports = router;