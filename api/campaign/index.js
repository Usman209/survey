const express = require('express');
const router = express.Router();
const campaignController = require('./controller'); // Adjust the path as needed

const { authenticateAndAuthorize } = require("../../lib/utils/verifyToken");
const { EUserRole } = require('../../lib/utils/enum');



// authenticateAndAuthorize([EUserRole.SUPER_ADMIN])


// Create a new campaign
router.post('/',   campaignController.createCampaign);

// Get all campaigns
router.get('/',  campaignController.getAllCampaigns);

router.get('/',  campaignController.getAllCampaignsIncludingCurrent);

router.get('/search',   campaignController.searchCampaign);



// Get a campaign by ID
router.get('/:id',   campaignController.getCampaignById);

router.get('/active/:id',   campaignController.activateCampaign);

router.get('/inactive/:id',campaignController.deactivateCampaign);




// Update a campaign by ID
router.put('/:id',  campaignController.updateCampaign);

// Delete a campaign by ID
router.delete('/:id', campaignController.deleteCampaign);



module.exports = router;
