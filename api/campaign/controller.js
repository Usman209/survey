const { errReturned, sendResponse } = require('../../lib/utils/dto');
const Campaign = require('../../lib/schema/campaign.schema'); 
const moment = require('moment');
// Import the Redis client
const redisClient = require("../../config/redis");


exports.createCampaign = async (req, res) => {
  try {
    const { campaignName, startDate, endDate } = req.body;

    // Check if campaign name already exists
    const existingCampaignByName = await Campaign.findOne({ campaignName });
    if (existingCampaignByName) {
      return errReturned(res, "Campaign name already exists. Please choose a unique name.");
    }

    // Convert the start and end dates to Date objects and normalize to midnight
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(0, 0, 0, 0); // Set to midnight for start date
    end.setHours(23, 59, 59, 999); // Set to the last moment of the end date

    // Calculate the campaign duration in days (including both start and end days)
    const durationInDays = Math.ceil((end - start + 1) / (1000 * 60 * 60 * 24)); // Add 1 to include the start day

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




exports.searchCampaign = async (req, res) => {
  try {
    const { campaignName } = req.query;

    // If no campaign name is provided, return an error
    if (!campaignName) {
      return errReturned(res, "Campaign name is required for the search.");
    }

    // Search campaigns by name (case-insensitive)
    const campaigns = await Campaign.find({
      campaignName: { $regex: campaignName, $options: 'i' }, // Case-insensitive search
    });

    if (campaigns.length === 0) {
      return sendResponse(res, 404, "No campaigns found with that name.");
    }

    return sendResponse(res, 200, "Campaigns fetched successfully.", campaigns);
  } catch (error) {
    return errReturned(res, error.message);
  }
};




exports.getAllCampaigns = async (req, res) => {
  try {

    // Fetch campaigns from the database and populate creator info
    const campaigns = await Campaign.find().populate({
      path: 'createdBy',
      select: 'firstName cnic role'
    });

    const formattedCampaigns = campaigns.map(campaign => {
      const campaignObj = campaign.toObject();
      // Format dates and check active status (same logic as before)
      if (campaignObj.startDate) {
        const startDate = new Date(campaignObj.startDate);
        campaignObj.startDate = startDate.toISOString().split('T')[0];
        if (startDate > new Date()) {
          campaignObj.isActive = false;
        }
      }

      if (campaignObj.endDate) {
        const endDate = new Date(campaignObj.endDate);
        campaignObj.endDate = endDate.toISOString().split('T')[0];
        if (endDate < new Date()) {
          campaignObj.isActive = false;
        }
      }

      if (campaignObj.isActive === undefined) {
        campaignObj.isActive = true;
      }

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
    await redisClient.del('all_campaigns');
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
    await redisClient.del('all_campaigns');
    return sendResponse(res, 200, "Campaign deleted successfully.");
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.activateCampaign = async (req, res) => {
  try {
    // Check if there is already an active campaign
    const activeCampaign = await Campaign.findOne({ status: 'ACTIVE' });

    // Get the current date
    const currentDate = new Date();

    // If an active campaign exists
    if (activeCampaign) {
      const activeCampaignStartDate = new Date(activeCampaign.startDate);
      const activeCampaignEndDate = new Date(activeCampaign.endDate);

      // If both the start date and the end date of the active campaign have passed
      if (activeCampaignStartDate < currentDate && activeCampaignEndDate < currentDate) {
        return sendResponse(res, 200, `The active campaign "${activeCampaign.campaignName}" has passed its start and end date. Please deactivate it before activating a new campaign.`);
      } 

      // If the active campaign's start date is today or in the past and the end date is still in the future (current campaign)
      if (activeCampaignStartDate <= currentDate && activeCampaignEndDate >= currentDate) {
        return errReturned(res, `There is already an active campaign: "${activeCampaign.campaignName}". Please deactivate it first.`);
      }
    }

    // Find the campaign to activate
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return errReturned(res, "Campaign not found.");

    const campaignStartDate = new Date(campaign.startDate);
    const campaignEndDate = new Date(campaign.endDate);

    if (campaignEndDate <= currentDate) {
      // If the campaign's end date is in the past, return an error (can't activate finished campaigns)
      return errReturned(res, "You cannot activate a campaign that has already ended.");
    }

    // Activate the campaign (if the start date is today or in the future, and the end date is in the future)
    campaign.status = 'ACTIVE';
    await campaign.save();
    await redisClient.del('all_campaigns');

    // Check if the campaign is a future campaign or a current campaign
    if (campaignStartDate > currentDate) {
      return sendResponse(res, 200, `Future campaign "${campaign.campaignName}" activated successfully.`, campaign);
    } else if (campaignStartDate <= currentDate && campaignEndDate >= currentDate) {
      return sendResponse(res, 200, `Current campaign "${campaign.campaignName}" activated successfully.`, campaign);
    }

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
    await redisClient.del('all_campaigns');

    return sendResponse(res, 200, "Campaign deactivated successfully.", campaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
