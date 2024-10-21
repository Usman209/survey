const express = require('express');
const router = express.Router();
const surveyController = require('./controller'); // Adjust the path as needed

// Define routes
router.get('/', surveyController.getCollectedData); // Create a new survey


router.post('/', surveyController.syncCollectedData); // Create a new survey

module.exports = router;
