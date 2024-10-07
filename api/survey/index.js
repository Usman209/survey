const express = require('express');
const router = express.Router();
const surveyController = require('./controller'); // Adjust the path as needed

// Define routes
router.post('/', surveyController.createOrUpdateSurvey); // Create a new survey
router.get('/', surveyController.getSurveys); // Get all surveys
router.get('/:id', surveyController.getSurveyById); // Get survey by ID
router.put('/:id', surveyController.updateSurvey); // Update survey by ID
router.delete('/:id', surveyController.deleteSurvey); // Delete survey by ID

module.exports = router;
