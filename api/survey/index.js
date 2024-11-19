const express = require('express');
const router = express.Router();
const surveyController = require('./controller'); // Adjust the path as needed


const { 
    dbConnection, 
    checkDBConnection, 
    initializeDatabase,
    getConnectionStatus 
} = require("../../lib/utils/connection");


// Define routes
router.get('/', surveyController.getCollectedData); // Create a new survey


router.post('/',  surveyController.syncCollectedData); // Create a new survey


router.get('/count', surveyController.getCollectionCount);

module.exports = router;
