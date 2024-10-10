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
    const teamNumber = await generateUniqueTeamNumber();

    // Create a new team with the generated team number
    const team = new Team({
      ...req.body,
      teamNumber,
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
    const team = await Team.findById(req.params.id).populate('flws createdBy');
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


const generateUniqueTeamNumber = async () => {
  let teamNumber;
  let exists = true;

  while (exists) {
    // Generate a random 4-digit number
    teamNumber = Math.floor(1000 + Math.random() * 9000);

    // Check if it exists in the database
    exists = await USER.findOne({ teamNumber }); // Change USER to your model name
  }

  return teamNumber;
};




exports.searchTeams = async (req, res) => {

  try {
    const { teamNumber, teamName, townOrTehsil, uc, district } = req.query;


    console.log(req.query);


    // Build the query object
    const query = {};
    if (teamNumber) query.teamNumber = teamNumber;
    if (teamName) query.teamName = { $regex: teamName, $options: 'i' }; // Case-insensitive search
    if (townOrTehsil) query.townOrTehsil = { $regex: townOrTehsil, $options: 'i' };
    if (uc) query.uc = { $regex: uc, $options: 'i' };
    if (district) query.district = { $regex: district, $options: 'i' };

    const teams = await Team.find(query);
    return sendResponse(res, 200, "Teams retrieved successfully.", teams);
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

