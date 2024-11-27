const { errReturned, sendResponse } = require('../../lib/utils/dto');
const Campaign = require('../../lib/schema/campaign.schema'); 
const moment = require('moment');

exports.createCampaign = async (req, res) => {
  try {
    const { campaignName, startDate, endDate } = req.body;

    // Check if campaign name already exists
    const existingCampaignByName = await Campaign.findOne({ campaignName });
    if (existingCampaignByName) {
      return errReturned(res, "Campaign name already exists. Please choose a unique name.");
    }

    // Convert the start and end dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate the campaign duration in days
    const durationInDays = (end - start) / (1000 * 60 * 60 * 24); // Convert milliseconds to days

    // Check if the duration is less than 7 days

    if (durationInDays < 7) {
      return errReturned(res, "The campaign duration should be at least 7 days.");
    }

    // Check if the duration exceeds 9 days
    if (durationInDays > 9) {
      return errReturned(res, "The campaign duration should not exceed 9 days.");
    }

    // Check for overlapping campaigns
    const overlappingCampaign = await Campaign.findOne({
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ]
    });

    if (overlappingCampaign) {
      return errReturned(res, `The dates of this campaign overlap with the campaign: ${overlappingCampaign.campaignName}`);
    }

    // Create and save the new campaign
    const campaign = new Campaign(req.body);
    const savedCampaign = await campaign.save();

    return sendResponse(res, 201, "Campaign created successfully.", savedCampaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getAllCampaigns = async (req, res) => {
  try {
    // Fetch campaigns from the database and populate creator info
    const campaigns = await Campaign.find()
      .populate({
        path: 'createdBy',
        select: 'firstName cnic role'
      });

    const formattedCampaigns = campaigns
      .map(campaign => {
        const campaignObj = campaign.toObject();

        // Format start and end dates using native JavaScript
        if (campaignObj.startDate) {
          const startDate = new Date(campaignObj.startDate);
          // Format startDate to 'YYYY-MM-DD'
          campaignObj.startDate = startDate.toISOString().split('T')[0];
        }
        
        if (campaignObj.endDate) {
          const endDate = new Date(campaignObj.endDate);
          // Format endDate to 'YYYY-MM-DD'
          campaignObj.endDate = endDate.toISOString().split('T')[0];
        }

        // Return the formatted campaign object
        return campaignObj;
      });

    return sendResponse(res, 200, "All campaigns fetched successfully.", formattedCampaigns);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getAllCampaignsIncludingCurrent = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate({
        path: 'createdBy',
        select: 'firstName cnic role'
      });

    const currentDate = new Date();
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(currentDate.getDate() + 1); // Set tomorrow's date

    const formattedCampaigns = campaigns
      .map(campaign => {
        const campaignObj = campaign.toObject();
        
        // Format start and end dates using native JavaScript
        if (campaignObj.startDate) {
          const startDate = new Date(campaignObj.startDate);
          
          // Skip campaigns with start date in the future or tomorrow
          if (startDate > currentDate || startDate.toDateString() === tomorrowDate.toDateString()) {
            return null;
          }

          campaignObj.startDate = startDate.toISOString().split('T')[0];
        }
        
        if (campaignObj.endDate) {
          const endDate = new Date(campaignObj.endDate);
          campaignObj.endDate = endDate.toISOString().split('T')[0];
        }
        
        return campaignObj;
      })
      .filter(campaign => campaign !== null); // Remove null entries for campaigns to exclude

    return sendResponse(res, 200, "Campaigns fetched successfully.", formattedCampaigns);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id); 
    if (!campaign) return errReturned(res, "Campaign not found.");
    return sendResponse(res, 200, "Campaign fetched successfully.", campaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCampaign) return errReturned(res, "Campaign not found.");
    return sendResponse(res, 200, "Campaign updated successfully.", updatedCampaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return errReturned(res, "Campaign not found.");

    
    if (campaign.status === 'ACTIVE') {
      return errReturned(res, "Active campaigns cannot be deleted.");
    }

    await Campaign.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, "Campaign deleted successfully.");
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.activateCampaign = async (req, res) => {
  try {
    // Check if there is already an active campaign
    const activeCampaign = await Campaign.findOne({ status: 'ACTIVE' });

    // If an active campaign exists
    const currentDate = new Date();

    if (activeCampaign) {
      const activeCampaignStartDate = new Date(activeCampaign.startDate);

      // If the active campaign's start date has passed, inform the user but do not deactivate it
      if (activeCampaignStartDate <= currentDate) {
        // Just inform the user about the past active campaign
        return sendResponse(res, 200, `The active campaign "${activeCampaign.campaignName}" has passed its start date. Please deactivate it before activating a new campaign.`);
      } else {
        // If the active campaign is still in the future, prevent activation of a new campaign
        return errReturned(res, `There is already an active future campaign: ${activeCampaign.campaignName}. Please deactivate it first.`);
      }
    }

    // Find the campaign to activate
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return errReturned(res, "Campaign not found.");

    // Check if the requested campaign has a future start date
    const campaignStartDate = new Date(campaign.startDate);
    if (campaignStartDate <= currentDate) {
      return errReturned(res, "You can only activate future campaigns.");
    }

    // Activate the new campaign
    campaign.status = 'ACTIVE';
    await campaign.save();

    return sendResponse(res, 200, "Campaign activated successfully.", campaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.deactivateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return errReturned(res, "Campaign not found.");

    campaign.status = 'INACTIVE';
    await campaign.save();

    return sendResponse(res, 200, "Campaign deactivated successfully.", campaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
