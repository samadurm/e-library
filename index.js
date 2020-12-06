const router = module.exports = require('express').Router();

router.use('/books', require('./routes/books'));
router.use('/libraries', require('./routes/libraries'));