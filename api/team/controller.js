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

    // Check if any FLW is already in another team
    const flwIds = req.body.flws; // Assuming FLWs are passed in the request body
    if (flwIds && flwIds.length > 0) {
      const existingTeams = await Team.find({ flws: { $in: flwIds } });

      if (existingTeams.length > 0) {
        return errReturned(res, "One or more FLWs are already assigned to another team.");
      }
    }

    // Create a new team with the generated team name
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
    // Filter out fields that are null from the request body
    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([_, value]) => value !== null)
    );

    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!updatedTeam) {
      return errReturned(res, "Team not found.");
    }

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



exports.getTeamDetailsByUserId = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from request parameters

    // Find the user by ID
    const user = await USER.findById(id);

    if (!user) {
      return errReturned(res, "User not found.");
    }

    let teamDetails;

    if (user.role === 'FLW') {
      teamDetails = await Team.find({ flws: id })
        .populate('ucmo aic')
        .select('territory teamName ucmo aic flws');
    } else if (user.role === 'AIC') {
      teamDetails = await Team.find({ aic: id })
        .populate('flws ucmo')
        .select('territory teamName flws ucmo');
    } else if (user.role === 'UCMO') {
      teamDetails = await Team.find({ ucmo: id })
        .populate('flws aic')
        .select('territory teamName flws aic');
    } else {
      return errReturned(res, "User role not recognized.");
    }

    if (teamDetails.length === 0) {
      return errReturned(res, "No teams found for this user.");
    }

    const response = [];

    const ucMap = new Map();

    teamDetails.forEach(team => {
      const ucKey = team.territory.uc;

      if (!ucMap.has(ucKey)) {
        ucMap.set(ucKey, {
          uc: ucKey,
          territory: team.territory, // Store territory details
          teamNames: [],
          aics: [],
          flws: [], // Initialize FLWs array
          ucmo: null // Initialize UCMO
        });
      }

      // Add team name
      ucMap.get(ucKey).teamNames.push(team.teamName);

      // If role is FLW, include UCMO and AIC details
      if (user.role === 'FLW') {
        if (team.ucmo) {
          ucMap.get(ucKey).ucmo = {
            _id: team.ucmo._id,
            firstName: team.ucmo.firstName,
            lastName: team.ucmo.lastName,
            email: team.ucmo.email,
            phone: team.ucmo.phone,
            status: team.ucmo.status,
            role: team.ucmo.role,
          };
        }

        if (team.aic) {
          ucMap.get(ucKey).aics.push({
            _id: team.aic._id,
            firstName: team.aic.firstName,
            lastName: team.aic.lastName,
            email: team.aic.email,
            cnic: team.aic.cnic,
            phone: team.aic.phone,
            status: team.aic.status,
            role: team.aic.role,
          });
        }
      }

      // Handle AIC role
      if (user.role === 'AIC') {
        if (team.ucmo) {
          ucMap.get(ucKey).ucmo = {
            _id: team.ucmo._id,
            firstName: team.ucmo.firstName,
            lastName: team.ucmo.lastName,
            email: team.ucmo.email,
            phone: team.ucmo.phone,
            status: team.ucmo.status,
            role: team.ucmo.role,
          };
        }

        // Add FLWs to the array
        if (team.flws && team.flws.length > 0) {
          team.flws.forEach(fl => {
            ucMap.get(ucKey).flws.push({
              _id: fl._id,
              firstName: fl.firstName,
              lastName: fl.lastName,
              email: fl.email,
              phone: fl.phone,
              status: fl.status,
              role: fl.role,
            });
          });
        }
      }

      // Handle UCMO role
      if (user.role === 'UCMO' && team.aic) {
        ucMap.get(ucKey).aics.push({
          _id: team.aic._id,
          firstName: team.aic.firstName,
          lastName: team.aic.lastName,
          email: team.aic.email,
          cnic: team.aic.cnic,
          phone: team.aic.phone,
          status: team.aic.status,
          role: team.aic.role,
        });
      }
    });

    // Convert the map to an array and flatten the structure
    ucMap.forEach(value => {
      const flatResponse = {
        uc: value.uc,
        territory: value.territory,
        teamNames: value.teamNames,
        aics: value.aics,
        ucmo: value.ucmo, // Include UCMO details
        flws: value.flws   // Include FLWs array
      };
      response.push(flatResponse);
    });

    return sendResponse(res, 200, "Team details fetched successfully.", response);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
