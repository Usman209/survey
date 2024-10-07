const express = require('express');
const router = express.Router();
const campaignController = require('./controller'); // Adjust the path as needed

// Create a new campaign
router.post('/', campaignController.createCampaign);

// Get all campaigns
router.get('/', campaignController.getAllCampaigns);

// Get a campaign by ID
router.get('/:id', campaignController.getCampaignById);

// Update a campaign by ID
router.put('/:id', campaignController.updateCampaign);

// Delete a campaign by ID
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;
