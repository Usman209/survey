const express = require('express');
const router = express.Router();
const surveyController = require('./controller'); // Adjust the path as needed


const { 
    
    checkDBConnection, 
    
} = require("../../lib/utils/connection");


// Define routes
router.get('/', surveyController.getCollectedData); // Create a new survey


router.post('/',   surveyController.syncCollectedData); // Create a new survey


router.get('/count', surveyController.getCollectionCount);

module.exports = router;
