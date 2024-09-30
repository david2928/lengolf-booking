// routes/index.js

const express = require('express');
const router = express.Router();

const apiRouter = require('./api'); // routes/api/index.js

// Mount the API router at the root of this router
router.use('/', apiRouter);

module.exports = router;
