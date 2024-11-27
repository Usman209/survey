const { errReturned, sendResponse } = require('../../lib/utils/dto');
const Campaign = require('../../lib/schema/campaign.schema'); 

exports.createCampaign = async (req, res) => {
  try {
    const { campaignName, startDate, endDate } = req.body;

    const existingCampaignByName = await Campaign.findOne({ campaignName });
    if (existingCampaignByName) {
      return errReturned(res, "Campaign name already exists. Please choose a unique name.");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationInDays = (end - start) / (1000 * 60 * 60 * 24); // Convert milliseconds to days

    if (durationInDays > 9) {
      return errReturned(res, "The campaign duration should not exceed 9 days.");
    }
    if (existingCampaignByNumber) {
      return errReturned(res, "Campaign number already exists. Please choose a unique number.");
    }

    const overlappingCampaign = await Campaign.findOne({
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } } 
      ]
    });

    if (overlappingCampaign) {
      return errReturned(res, `The dates of this campaign overlap with the campaign: ${overlappingCampaign.campaignName}`);
    }

    const campaign = new Campaign(req.body);
    const savedCampaign = await campaign.save();

    return sendResponse(res, 201, "Campaign created successfully.", savedCampaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate({
        path: 'createdBy',
        select: 'firstName cnic role' // Specify the fields you want to retrieve
      });

    return sendResponse(res, 200, "Campaigns fetched successfully.", campaigns);
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
    const activeCampaign = await Campaign.findOne({ status: 'ACTIVE' });
    if (activeCampaign) {
      return errReturned(res, `There is already an active campaign: ${activeCampaign.campaignName}. Please deactivate it first.`);
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return errReturned(res, "Campaign not found.");

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
