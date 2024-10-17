const { errReturned, sendResponse } = require('../../lib/utils/dto');
const Campaign = require('../../lib/schema/campaign.schema'); 

exports.createCampaign = async (req, res) => {
  try {
    const campaign = new Campaign(req.body);
    const savedCampaign = await campaign.save();
    return sendResponse(res, 201, "Campaign created successfully.", savedCampaign);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find(); 
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
