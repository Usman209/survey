const express = require('express');
const router = express.Router();
const locationController = require('./controller'); 

router.post('/', locationController.saveLocation);


module.exports = router;
