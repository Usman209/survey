const express = require('express');
const router = express.Router();
const campaignController = require('./controller'); // Adjust the path as needed

const { authenticateAndAuthorize } = require("../../lib/utils/verifyToken");
const { EUserRole } = require('../../lib/utils/enum');




// Create a new campaign
router.post('/',   authenticateAndAuthorize([EUserRole.SUPER_ADMIN]), campaignController.createCampaign);

// Get all campaigns
router.get('/',  authenticateAndAuthorize([EUserRole.SUPER_ADMIN]), campaignController.getAllCampaigns);

// Get a campaign by ID
router.get('/:id',  authenticateAndAuthorize([EUserRole.SUPER_ADMIN]), campaignController.getCampaignById);

router.get('/active/:id',  authenticateAndAuthorize([EUserRole.SUPER_ADMIN]), campaignController.activateCampaign);

router.get('/inactive/:id',  authenticateAndAuthorize([EUserRole.SUPER_ADMIN]),campaignController.deactivateCampaign);




// Update a campaign by ID
router.put('/:id',  campaignController.updateCampaign);

// Delete a campaign by ID
router.delete('/:id', campaignController.deleteCampaign);



module.exports = router;
