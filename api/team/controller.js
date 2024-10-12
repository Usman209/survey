const Team = require('../../lib/schema/team.schema');
const USER = require('../../lib/schema/users.schema');

const { errReturned, sendResponse } = require('../../lib/utils/dto');

// Add FLW to a team
exports.addFLWToTeam = async (req, res) => {
  const { teamId, flwId } = req.body;

  try {
    if (!teamId || !flwId) {
      return errReturned(res, "teamId and flwId are required.");
    }

    const team = await Team.findById(teamId);
    if (!team) return errReturned(res, "Team not found.");

    const existingTeam = await Team.findOne({ flws: flwId });

    if (existingTeam && existingTeam._id.toString() !== teamId) {
      existingTeam.flws = existingTeam.flws.filter(flw => flw.toString() !== flwId);
      await existingTeam.save();
    }

    if (!team.flws.includes(flwId)) {
      team.flws.push(flwId);
      await team.save();
      return sendResponse(res, 200, "FLW added to team successfully.", team);
    } else {
      return errReturned(res, "FLW is already in this team.");
    }
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Remove FLW from a team
exports.removeFLWFromTeam = async (req, res) => {
  const { teamId, flwId } = req.body;

  try {
    if (!teamId || !flwId) {
      return errReturned(res, "teamId and flwId are required.");
    }

    const team = await Team.findById(teamId);
    if (!team) return errReturned(res, "Team not found.");

    // Check if FLW is in the team
    if (!team.flws.includes(flwId)) {
      return errReturned(res, "FLW not found in this team.");
    }

    // Remove the FLW from the team
    team.flws = team.flws.filter(flw => flw.toString() !== flwId);
    await team.save();

    return sendResponse(res, 200, "FLW removed from team successfully.", team);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.createTeam = async (req, res) => {
  try {
    
    const uc = req.body.territory?.uc;
    if (!uc) {
      return errReturned(res, "UC is required.");
    }
    const teamName = await generateUniqueTeamName(uc);

    // Create a new team with the generated team number and unique name
    const team = new Team({
      ...req.body,
      teamName, // Set the unique team name
    });

    const savedTeam = await team.save();
    return sendResponse(res, 201, "Team created successfully.", savedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('flws createdBy');
    return sendResponse(res, 200, "Teams fetched successfully.", teams);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('flws createdBy') // Populate FLWs and the creator
      .populate('aic', '_id firstName lastName phone cnic') // Populate AIC with specific fields
      .populate('ucmo', '_id firstName lastName phone cnic'); // Populate UCMO with specific fields

    if (!team) return errReturned(res, "Team not found.");

    return sendResponse(res, 200, "Team fetched successfully.", team);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.updateTeam = async (req, res) => {
  try {
    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTeam) return errReturned(res, "Team not found.");
    return sendResponse(res, 200, "Team updated successfully.", updatedTeam);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam) return errReturned(res, "Team not found.");
    return sendResponse(res, 200, "Team deleted successfully.");
  } catch (error) {
    return errReturned(res, error.message);
  }
};







exports.getTeamsByUcmo = async (req, res) => {
  try {
    // const { id, role } = req.user;

    const { id, role } = req.query;

    // Initialize an array to hold results
    let result = [];

    if (role === "UCMO") {
      // Step 1: Find all AICs under the specified UCMO
      const aics = await USER.find({ ucmo: id, role: "AIC" });

      // Step 2: Fetch Teams for each AIC
      for (const aic of aics) {
        const teams = await Team.find({ aic: aic._id }); // Fetch teams associated with the AIC
        result.push({ aic, teams });
      }
    } else if (role === "AIC") {
      // Step 1: If the role is AIC, find teams associated with the AIC's ID
      const teams = await Team.find({ aic: id });
      result.push({ aic: { _id: id }, teams }); // Add AIC info
    } else if (role === "FLW") {
      // Step 1: If the role is FLW, find the team associated with the FLW
      const flw = await USER.findById(id);
      const teams = await Team.find({ flws: flw._id }); // Assuming flws array in Team references FLW IDs
      result.push({ flw, teams });
    }
    else if (role === "ADMIN") {
      result = await Team.find({});
    }

    else {
      return sendResponse(res, 403, "Unauthorized role.");
    }

    return sendResponse(res, 200, "Teams retrieved successfully.", result);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.searchTeams = async (req, res) => {
  try {
    const { teamNumber, teamName, district, division, uc, tehsilOrTown, aic, ucmo } = req.query;

    // Create a filter object based on provided query parameters
    const filter = {};
    
    if (teamNumber) filter.teamNumber = teamNumber;
    if (teamName) filter.teamName = new RegExp(teamName, 'i'); // Case-insensitive search
    
    // Filter by territory fields
    if (district) filter.territory = { ...filter.territory, district: new RegExp(district, 'i') };
    if (division) filter.territory = { ...filter.territory, division: new RegExp(division, 'i') };
    if (uc) filter.territory = { ...filter.territory, uc: new RegExp(uc, 'i') };
    if (tehsilOrTown) filter.territory = { ...filter.territory, tehsilOrTown: new RegExp(tehsilOrTown, 'i') };

    // Filter by AIC and UCMO
    if (aic) filter.aic = aic;
    if (ucmo) filter.ucmo = ucmo;

    // Fetch teams based on the filter
    const teams = await Team.find(filter);

    return sendResponse(res, 200, "Teams retrieved successfully.", teams);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



const generateUniqueTeamName = async (uc) => {
  // Initialize variables
  let baseName = `${uc}`;
  let counter = 1;
  let uniqueName = `${baseName}-${counter}`;

  // Check for existing teams with the same name
  while (await Team.findOne({ teamName: uniqueName })) {
    counter++;
    uniqueName = `${baseName}-${counter}`;
  }

  return uniqueName;
};
