const express = require('express');
const router = express.Router();
const { createString, getAllStrings, getStringById, updateString, deleteString } = require('../controllers/testing');

// Define routes
router.post('/strings', createString);
router.get('/strings', getAllStrings);
router.get('/strings/:id', getStringById);
router.put('/strings/:id', updateString);
router.delete('/strings/:id', deleteString);

module.exports = router;