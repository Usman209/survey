const bcrypt = require("bcryptjs");
const Team = require('../../lib/schema/team.schema');

const USER = require("../../lib/schema/users.schema");
const mongoose = require('mongoose');


const redisClient = require('../../config/redis'); // Adjust the path based on your file structure


require("dotenv").config();

const { sendResponse, errReturned } = require("../../lib/utils/dto");
const { EResponseCode } = require("../../lib/utils/enum");
const {
  findByIdAndUpdate,
  findById,
  pagenate,
} = require("../../lib/utils/abstractRepository");

const {
  updateProfileSchemaValidator,
  updatePasswordSchemaValidator,
  userRegisterSchemaValidator,
} = require("../../lib/utils/sanitization");
const { generateRandomEmail } = require("../../lib/utils/generateEmailAddress");

exports.userProfile = async (req, res) => {
  try {

    let user = await findById({ model: USER, id: req?.params?.id  });

    return sendResponse(res, EResponseCode.SUCCESS, "User Profile", user);
  } catch (e) {
    errReturned(res, e);
  }
};

// exports.userList = async (req, res) => {
//   try {
//     const users = await pagenate({
//       model: USER,
//       projection: "firstName email role status",
//     });
//     return sendResponse(res, EResponseCode.SUCCESS, "User list", users);
//   } catch (err) {
//     errReturned(res, err);
//   }
// };


exports.userList = async (req, res) => {
  try {
    const { id, role } = req.user; // Assuming you have user info in req.user

    let  result = [];

    if (role === "UCMO") {
      
      const aics = await USER.find({ ucmo: id, role: "AIC" });

      for (const aic of aics) {
        // Ensure you fetch FLWs associated with this specific AIC
        const flws = await USER.find({ aic: aic._id, role: "FLW" });
        result.push({ aic, flws });
      }

    } else if (role === "AIC") {
      // If the logged-in user is an AIC, fetch all FLWs under this AIC
       users = await USER.find({ aic: id, role: "FLW" });
    }
    
    else if (role === "FLW") {
      const flw = await USER.findById(id);
      return sendResponse(res, 200, "Your information retrieved successfully.", flw);
    }
    
    else {
      // If the user is an admin, get all users
      users = await pagenate({
        model: USER,
        projection: "firstName email role cnic status",
      });
    }

    return sendResponse(res, EResponseCode.SUCCESS, "User list", users);
  } catch (err) {
    return errReturned(res, err);
  }
};


exports.users = async (req, res) => {
  try {
    // Fetch alusers excluding those with the "ADMIN" role
    const result = await USER.find({ role: { $ne: "ADMIN" } }).select("firstName email role cnic status isEmployee gender isFirstLogin phone");

    return sendResponse(res, EResponseCode.SUCCESS, "User list", result);
  } catch (err) {
    return errReturned(res, err);
  }
};



exports.getUCMOsByUC = async (req, res) => {
  try {
    const { uc } = req.params; // Get UC from route parameters (e.g., "123G")
    
    // Query for users with role 'UCMO' and territory.uc matching the input UC
    const ucmos = await USER.find({
      "territory.uc": uc,
      role: "UCMO", // Filter by the role 'UCMO'
    });

    if (ucmos.length === 0) {
      return sendResponse(res, 404, "No UCMOs found for this UC.");
    }

    return sendResponse(res, 200, "List of UCMOs", ucmos); // Return the UCMOs
  } catch (err) {
    return sendResponse(res, 500, "Internal server error", err.message);
  }
};



exports.getAICSsByUC = async (req, res) => {
  try {
    const { uc } = req.params; 
    
    const aics = await USER.find({
      "territory.uc":uc,
      role: "AIC", // Filter by the role 'UCMO'
    });

    if (aics.length === 0) {
      return sendResponse(res, 404, "No UCMOs found for this UC.");
    }

    return sendResponse(res, 200, "List of AICs", aics); // Return the UCMOs
  } catch (err) {
    return sendResponse(res, 500, "Internal server error", err.message);
  }
};


exports.getFLWsByUC = async (req, res) => {
  try {
    const { uc } = req.params; // Get UC from the route parameters (e.g., "110A")
    const { siteType } = req.query; // Get siteType from the query parameters (e.g., ?siteType=Fixed)

    // Step 1: Query teams to find all FLWs that are part of any team with the specified UC
    const teams = await Team.find({
      "territory.uc": uc,
    }).populate("flws"); // Populate the 'flws' field to get the actual FLW objects

    // Create a set of FLW IDs that are already part of a team
    const flwsInTeams = new Set();
    teams.forEach(team => {
      team.flws.forEach(flw => {
        flwsInTeams.add(flw._id.toString());
      });
    });

    // Step 2: Construct the query for FLWs
    const query = {
      "territory.uc": uc, // Ensure that we filter by UC
      role: "FLW",
      _id: { $nin: Array.from(flwsInTeams) }, // Exclude FLWs that are already in teams
    };

    // If siteType is passed and is valid, include it in the query
    if (siteType && ['Trsite', 'Fixed'].includes(siteType)) {
      query.siteType = siteType; // Filter by siteType if provided and valid
    }


    // Step 3: Query for FLWs based on the constructed query
    const flws = await USER.find(query);


    // If no FLWs found, return an appropriate message
    if (flws.length === 0) {
      return sendResponse(res, 404, `No FLWs found for UC ${uc} and siteType ${siteType ? siteType : "any"}.`);
    }

    // Return the list of FLWs who are not in any team
    return sendResponse(res, 200, "List of FLWs not in any team", flws);
  } catch (err) {
    return sendResponse(res, 500, "Internal server error", err.message);
  }
};












exports.updatePassword = async (req, res) => {
  try {
    
    const { error, value } = updatePasswordSchemaValidator.validate(req.body);
    if (error) return errReturned(res, error.message);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(value.newpassword, salt);

    const user = await USER.findById(req.params.id);


    // Check if the user exists
    if (!user) return errReturned(res, "User  not found");

    // Directly update the password without validating the old password
    await findByIdAndUpdate({
      model: USER,
      id: req.params.id,
      updateData: {  isFirstLogin: false,password: hashedPassword },
    });

    return sendResponse(res, EResponseCode.SUCCESS, "Password has been updated");
  } catch (error) {
    console.error(error);
    return errReturned(res, "An error occurred while updating the password");
  }
};



const removeFLWFromTeam = async (teamId, flwId) => {
  const team = await Team.findById(teamId);
  if (!team) throw new Error("Team not found.");

  if (!team.flws.includes(flwId)) {
    throw new Error("FLW not found in this team.");
  }

  team.flws = team.flws.filter(flw => flw.toString() !== flwId);
  await team.save();
  await redisClient.del('all_teams'); // Invalidate cache
};



// exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req?.params?.id;

//     const { error, value } = updateProfileSchemaValidator.validate(req.body, {
//       stripUnknown: true,
//     });
//     if (error) {
//       return errReturned(res, error.message);
//     }

//     // Fetch the current user profile
//     const currentUser = await USER.findById(userId).select('role territory aic flws');

//     // Check if the territory.uc value is changing
//     const newUc = value?.territory?.uc;
//     const currentUc = currentUser?.territory?.uc;

//     // If uc is changing, ensure that no other user already has this UC
//     if (newUc && newUc !== currentUc) {
//       const existingUserWithUc = await USER.findOne({
//         "territory.uc": newUc,
//       }).select('_id');
      
//       // if (existingUserWithUc) {
//       //   return errReturned(res, `User with territory UC ${newUc} already exists.`);
//       // }
//     }

//     // Check if a new password is provided
//     if (value.password) {
//       const salt = await bcrypt.genSalt(10);
//       value.password = await bcrypt.hash(value.password, salt);
//     }

//     // Attempt to update the user profile
//     const updatedProfile = await findByIdAndUpdate({
//       model: USER,
//       id: userId,
//       updateData: value,
//     });

//     // Ensure the user was successfully updated
//     if (!updatedProfile) {
//       return errReturned(res, "User update failed.");
//     }

//     if (newUc && newUc !== currentUc) {
//       console.log(`territory.uc is changing from ${currentUc} to ${newUc}`);
//       await updateTeamsForRole(currentUser, updatedProfile);
//     } else {
//       console.log(`territory.uc did not change (current: ${currentUc}, new: ${newUc})`);
//     }
//     // Invalidate caches based on role change
//     // await invalidateCaches(currentUser, updatedProfile);

//     return sendResponse(res, EResponseCode.SUCCESS, "Profile updated successfully", updatedProfile);
//   } catch (error) {
//     console.error(error);
//     return errReturned(res, "An error occurred while updating the profile");
//   }
// };


exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.params?.id;

    const { error, value } = updateProfileSchemaValidator.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return errReturned(res, error.message);
    }

    // Fetch the current user profile
    const currentUser = await USER.findById(userId).select('role territory aic flws');

    // Check if the territory.uc value is changing
    const newUc = value?.territory?.uc;
    const currentUc = currentUser?.territory?.uc;


    // Check if the role is changing
    const newRole = value?.role;
    const currentRole = currentUser?.role;

    // Check if a new password is provided
    if (value.password) {
      const salt = await bcrypt.genSalt(10);
      value.password = await bcrypt.hash(value.password, salt);
    }

    // Attempt to update the user profile
    const updatedProfile = await findByIdAndUpdate({
      model: USER,
      id: userId,
      updateData: value,
    });

    // Ensure the user was successfully updated
    if (!updatedProfile) {
      return errReturned(res, "User update failed.");
    }

    // If the territory.uc has changed, update related teams
    if (newUc && newUc !== currentUc) {
      console.log(`territory.uc is changing from ${currentUc} to ${newUc}`);
      await updateTeams(currentUser, updatedProfile);
    }

    // If the role has changed, update related teams or perform other necessary logic
    if (newRole && newRole !== currentRole) {
      console.log(`role is changing from ${currentRole} to ${newRole}`);
      await updateTeams(currentUser, updatedProfile);
    } else {
      console.log(`role did not change (current: ${currentRole}, new: ${newRole})`);
    }

    // Invalidate caches based on role change
    // await invalidateCaches(currentUser, updatedProfile);

    return sendResponse(res, EResponseCode.SUCCESS, "Profile updated successfully", updatedProfile);
  } catch (error) {
    console.error(error);
    return errReturned(res, "An error occurred while updating the profile");
  }
};





const updateTeams = async (currentUser, updatedProfile) => {
  try {
    console.log('Updating teams for role:', updatedProfile.role);
    const userId = updatedProfile._id;

    // Handling the FLW role update (removing from team)
    if (updatedProfile.role === 'FLW') {
      console.log('Updating teams for FLW role...');
      const result = await Team.updateMany(
        { "flws": userId },  // Matching teams with this FLW
        { $pull: { "flws": userId } }  // Pull this FLW from the teams
      );
      console.log(`FLW role update result: ${result.nModified} teams updated.`); // Logging nModified
    }

    // Handling the UCMO role update (removing from team)
    if (updatedProfile.role === 'UCMO') {
      console.log('Updating teams for UCMO role...');
      const result = await Team.updateMany(
        { "ucmo": userId },  // Matching teams with this UCMO
        { $unset: { "ucmo": "" } }  // Removing the UCMO from teams
      );
      console.log(`UCMO role update result: ${result.nModified} teams updated.`);
    }

    // Handling the AIC role update (removing from team)
    if (updatedProfile.role === 'AIC') {
      console.log('Updating teams for AIC role...');
      const result = await Team.updateMany(
        { "aic": userId },  // Matching teams with this AIC
        { $unset: { "aic": "" } }  // Removing the AIC from teams
      );
      console.log(`AIC role update result: ${result.nModified} teams updated.`);
    }

  } catch (error) {
    console.error('Error updating teams:', error);
  }
};

const handleFLWUpdate = async (updatedProfile, currentUser, value) => {
  const team = await Team.findOne({ flws: updatedProfile._id }).select('flws aic');

  console.log(team);
  

  if (team) {
    const userInFlws = team.flws.some(fl => fl.equals(updatedProfile._id));
    
    const incomingAIC = value.aic; // AIC from request body
    const currentAIC = currentUser.aic; // AIC from the database

    const isIncomingAICValid = incomingAIC && mongoose.Types.ObjectId.isValid(incomingAIC);
    const teamAIC = team.aic; // AIC from team document

    const currentAICMismatch = currentAIC && !currentAIC.equals(teamAIC);
    const incomingAICObjectId = isIncomingAICValid ? new mongoose.Types.ObjectId(incomingAIC) : null;

    const incomingAICMismatch = incomingAICObjectId && !incomingAICObjectId.equals(teamAIC);

    if (userInFlws && (currentAICMismatch || incomingAICMismatch)) {

      await removeFLWFromTeam(team._id, updatedProfile._id);
    
    } else {
      console.log('AICs are valid or match, no removal needed.');
    }
  }
};


const handleAICUpdate = async (updatedProfile, value) => {
  const teams = await Team.find({ aic: updatedProfile._id }).select('flws aic ucmo');

  const incomingUCMO = value.ucmo; // UCMO from request body
  const isIncomingUCMOValid = incomingUCMO && mongoose.Types.ObjectId.isValid(incomingUCMO);
  const incomingUCMOObjectId = isIncomingUCMOValid ? new mongoose.Types.ObjectId(incomingUCMO) : null;

  for (const team of teams) {
    const teamUCMO = team.ucmo; // UCMO from team document

    if (incomingUCMOObjectId && !incomingUCMOObjectId.equals(teamUCMO)) {
      await Team.findByIdAndUpdate(team._id, {
        flws: [],
        aic: null,
        ucmo: null,
      });

      console.log('All FLWs removed from the team due to UCMO mismatch.');
    } else {
      console.log('UCMOs are valid or match, no removal needed.');
    }
  }
};

const invalidateCaches = async (currentUser, updatedProfile) => {
  if (currentUser.role !== updatedProfile.role) {
    await redisClient.del('flw_list');
    await redisClient.del('ucmo_list');
    await redisClient.del('admin_list');
    await redisClient.del('aic_list');
  } else {
    switch (updatedProfile.role) {
      case 'FLW':
        await redisClient.del('flw_list');
        break;
      case 'UCMO':
        await redisClient.del('ucmo_list');
        break;
      case 'ADMIN':
        await redisClient.del('admin_list');
        break;
      case 'AIC':
        await redisClient.del('aic_list');
        break;
      default:
        break;
    }
  }
};





exports.userDetail = async (req, res) => {
  try {
    let user = await findById({ model: USER, id: req?.params?.id });

    return sendResponse(res, EResponseCode.SUCCESS, "User Detail", user);
  } catch (error) {
    errReturned(res, error);
  }
};


exports.getAllFLWs1 = async (req, res) => {
  try {
    // Get pagination parameters from query (defaults for page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the number of items to skip for pagination
    const skip = (page - 1) * limit;

    // Query FLWs from database with pagination, excluding soft-deleted users
    const flws = await USER.find(
      {
        role: 'FLW',
        $or: [
          { isDeleted: { $ne: true } }, // Exclude isDeleted: true
          { isDeleted: { $exists: false } } // Include users who don't have the isDeleted field
        ]
      },
      "firstName lastName email role cnic phone status createdBy updatedBy siteType territory"
    )
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role')
      .populate('aic', 'firstName lastName cnic'); // Populate AIC details

    // Fetch all teams to enrich FLWs data
    const teams = await Team.find().populate('aic', 'firstName lastName cnic')
      .populate('ucmo', 'firstName lastName cnic');

    // Enrich FLWs with teams' data
    const enrichedFLWs = await Promise.all(flws.map(async (flw) => {
      const matchingTeams = teams.filter(team => team.flws.some(flwId => flwId.toString() === flw._id.toString()));
      return {
        ...flw.toObject(),
        teams: matchingTeams.map(team => ({
          teamName: team.teamName,
          ucmoDetails: team.ucmo ? {
            firstName: team.ucmo.firstName,
            lastName: team.ucmo.lastName,
            cnic: team.ucmo.cnic
          } : null,
          aicDetails: team.aic ? {
            firstName: team.aic.firstName,
            lastName: team.aic.lastName,
            cnic: team.aic.cnic
          } : null,
        })) || [],
      };
    }));

    // Return the enriched FLWs data along with pagination info
    return sendResponse(res, EResponseCode.SUCCESS, "FLW list", {
      currentPage: page,
      totalItems: await USER.countDocuments({
        role: 'FLW',
        $or: [
          { isDeleted: { $ne: true } }, // Exclude isDeleted: true
          { isDeleted: { $exists: false } } // Include users who don't have the isDeleted field
        ]
      }),
      totalPages: Math.ceil(await USER.countDocuments({
        role: 'FLW',
        $or: [
          { isDeleted: { $ne: true } },
          { isDeleted: { $exists: false } }
        ]
      }) / limit),
      itemsPerPage: limit,
      data: enrichedFLWs
    });

  } catch (err) {
    console.error("Error fetching FLWs:", err);
    return errReturned(res, err);
  }
};


exports.getFLWsNotInAnyTeam = async (req, res) => {
  try {
    // Get all teams and their associated FLWs
    const teams = await Team.find().populate('flws');
    
    // Flatten the list of all FLWs in the teams
    const flwsInTeams = teams.reduce((acc, team) => {
      team.flws.forEach(flw => acc.push(flw._id.toString()));
      return acc;
    }, []);
    
    // Query the FLWs that are not part of any team
    const flwsNotInTeams = await USER.find({
      role: 'FLW',
      _id: { $nin: flwsInTeams }
    });

    // Count of FLWs not in any team
    const count = flwsNotInTeams.length;

    // Return the response with the FLWs and the count
    return sendResponse(res, 200, `FLWs not added to any team. Total: ${count}`, { flws: flwsNotInTeams, count: count });
  } catch (error) {
    console.error("Error fetching FLWs not in any team:", error);
    return errReturned(res, error.message);
  }
};


exports.getActiveFLWsAssignedToTeams = async (req, res) => {
  try {
    // Get all teams and their associated FLWs
    const teams = await Team.find().populate('flws');
    
    // Flatten the list of all FLWs in the teams and filter those with ACTIVE status
    const activeFLWs = teams.reduce((acc, team) => {
      team.flws.forEach(flw => {
        // Check if FLW has ACTIVE status and not already in the array
        if (flw.status === 'ACTIVE' && !acc.some(existingFlw => existingFlw._id.toString() === flw._id.toString())) {
          acc.push(flw);
        }
      });
      return acc;
    }, []);

    // Count of FLWs who are assigned to teams and have ACTIVE status
    const count = activeFLWs.length;

    // Return the response with the FLWs and the count
    return sendResponse(res, 200, `Active FLWs assigned to teams. Total: ${count}`, { flws: activeFLWs, count: count });
  } catch (error) {
    console.error("Error fetching active FLWs assigned to teams:", error);
    return errReturned(res, error.message);
  }
};





exports.getAllFLWs = async (req, res) => {
  try {
   
    const flws = await USER.find({ role: 'FLW' }, "firstName lastName email role cnic phone status createdBy updatedBy siteType territory")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role')
      .populate('aic', 'firstName lastName cnic'); // Populate UCMO details


    const teams = await Team.find().populate('aic', 'firstName lastName cnic')
      .populate('ucmo', 'firstName lastName cnic');

    const enrichedFLWs = await Promise.all(flws.map(async (flw) => {
      const matchingTeams = teams.filter(team => team.flws.some(flwId => flwId.toString() === flw._id.toString()));
      return {
        ...flw.toObject(),
        teams: matchingTeams.map(team => ({
          teamName: team.teamName,
          ucmoDetails: team.ucmo ? {
            firstName: team.ucmo.firstName,
            lastName: team.ucmo.lastName,
            cnic: team.ucmo.cnic
          } : null,
          aicDetails: team.aic ? {
            firstName: team.aic.firstName,
            lastName: team.aic.lastName,
            cnic: team.aic.cnic
          } : null,
        })) || [],
      };
    }));

    return sendResponse(res, EResponseCode.SUCCESS, "FLW list", enrichedFLWs);
  } catch (err) {
    console.error("Error fetching FLWs:", err);
    return errReturned(res, err);
  }
};


// Get all UCMOs
exports.getAllUCMOs = async (req, res) => {
  try {
    // Fetch users with role 'UCMO', excluding those with isDeleted: true
    const ucmos = await USER.find({ 
      role: 'UCMO', 
      $or: [
        { isDeleted: { $ne: true } }, // Exclude isDeleted: true
        { isDeleted: { $exists: false } } // Also include users who don't have the isDeleted field (if any)
      ]
    }, "firstName lastName role cnic phone status territory")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role');

    return sendResponse(res, EResponseCode.SUCCESS, "UCMO list", ucmos);
  } catch (err) {
    return errReturned(res, err);
  }
};




exports.getRoleStatusCount = async (req, res) => {
  try {
    // Count active and inactive UCMOs
    const ucmoActiveCount = await USER.countDocuments({ role: 'UCMO', status: 'ACTIVE' });
    const ucmoInactiveCount = await USER.countDocuments({ role: 'UCMO', status: 'INACTIVE' });

    // Count active and inactive AICs
    const aicActiveCount = await USER.countDocuments({ role: 'AIC', status: 'ACTIVE' });
    const aicInactiveCount = await USER.countDocuments({ role: 'AIC', status: 'INACTIVE' });

    // Count active and inactive FLWs
    const flwActiveCount = await USER.countDocuments({ role: 'FLW', status: 'ACTIVE' });
    const flwInactiveCount = await USER.countDocuments({ role: 'FLW', status: 'INACTIVE' });

    // Prepare the response data
    const result = {
      UCMO: {
        active: ucmoActiveCount,
        inactive: ucmoInactiveCount
      },
      AIC: {
        active: aicActiveCount,
        inactive: aicInactiveCount
      },
      FLW: {
        active: flwActiveCount,
        inactive: flwInactiveCount
      }
    };

    // Send the response with the counts
    return sendResponse(res, EResponseCode.SUCCESS, "Role status counts", result);
  } catch (err) {
    return errReturned(res, err);
  }
};



exports.toggleDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id; // Get the user ID from the request params

    console.log(userId);

    // Find the user by ID and toggle the isDeleted field to true (as a boolean)
    const user = await USER.findByIdAndUpdate(
      userId,
      { $set: { isDeleted: Boolean(true) } }, // Explicitly cast isDeleted to boolean
      { new: true } // Return the updated user object
    );

    if (!user) {
      return sendResponse(res, EResponseCode.NOT_FOUND, "User not found");
    }

    return sendResponse(res, EResponseCode.SUCCESS, "User soft deleted", user);
  } catch (err) {
    return errReturned(res, err);
  }
};





// Get all Admins
exports.getAllAdmins = async (req, res) => {
  try {

    const admins = await USER.find({ role: 'ADMIN' }, "firstName lastName email role cnic phone status territory")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role');

    return sendResponse(res, EResponseCode.SUCCESS, "Admin list", admins);
  } catch (err) {
    return errReturned(res, err);
  }
};

exports.getAllAICs1 = async (req, res) => {
  try {
    // Get pagination parameters from query (defaults for page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Calculate the number of items to skip for pagination
    const skip = (page - 1) * limit;

    // Fetch AICs from the database with pagination and populate relevant fields, excluding soft deleted users
    const aics = await USER.find(
      {
        role: 'AIC',
        $or: [
          { isDeleted: { $ne: true } }, // Exclude isDeleted: true
          { isDeleted: { $exists: false } } // Include users who don't have the isDeleted field
        ]
      },
      "firstName lastName email role cnic phone status createdBy updatedBy ucmo territory"
    )
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role')
      .populate('ucmo', 'firstName lastName cnic'); // Populate UCMO details

    // Enrich AICs with UCMO details
    const enrichedAICs = aics.map((aic) => {
      return {
        ...aic.toObject(),
        ucmoDetails: aic.ucmo ? {
          firstName: aic.ucmo.firstName,
          lastName: aic.ucmo.lastName,
          cnic: aic.ucmo.cnic
        } : null,
      };
    });

    // Get the total number of AICs for pagination info, excluding soft-deleted users
    const totalAICs = await USER.countDocuments({
      role: 'AIC',
      $or: [
        { isDeleted: { $ne: true } },
        { isDeleted: { $exists: false } }
      ]
    });

    // Return the enriched AICs data along with pagination info
    return sendResponse(res, EResponseCode.SUCCESS, "AIC list", {
      currentPage: page,
      totalItems: totalAICs,
      totalPages: Math.ceil(totalAICs / limit),
      itemsPerPage: limit,
      data: enrichedAICs
    });
  } catch (err) {
    console.error("Error fetching AICs:", err);
    return errReturned(res, err);
  }
};


exports.getAllAICs = async (req, res) => {
  try {


    // Fetch AICs from the database and populate relevant fields
    const aics = await USER.find(
      { role: 'AIC' },
      "firstName lastName email role cnic phone status createdBy updatedBy ucmo territory"
    )
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role')
      .populate('ucmo', 'firstName lastName cnic'); // Populate UCMO details

    // Enrich AICs with UCMO details
    const enrichedAICs = aics.map((aic) => {
      return {
        ...aic.toObject(),
        ucmoDetails: aic.ucmo ? {
          firstName: aic.ucmo.firstName,
          lastName: aic.ucmo.lastName,
          cnic: aic.ucmo.cnic
        } : null,
      };
    });

    // Cache the enriched AICs
    return sendResponse(res, EResponseCode.SUCCESS, "AIC list", enrichedAICs);
  } catch (err) {
    console.error("Error fetching AICs:", err);
    return errReturned(res, err);
  }
};





// // Update Profile and Invalidate Cache
// exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req?.params?.id;

//     const { error, value } = updateProfileSchemaValidator.validate(req.body, {
//       stripUnknown: true,
//     });
//     if (error) {
//       return errReturned(res, error.message);
//     }

//     // Check if a new password is provided
//     if (value.password) {
//       const salt = await bcrypt.genSalt(10);
//       value.password = await bcrypt.hash(value.password, salt);
//     }

//     const profile = await findByIdAndUpdate({
//       model: USER,
//       id: userId,
//       updateData: value,
//     });

//     // Invalidate caches for user lists
//     await redisClient.del('flw_list');
//     await redisClient.del('ucmo_list');
//     await redisClient.del('admin_list');
//     await redisClient.del('aic_list');

//     return sendResponse(res, EResponseCode.SUCCESS, "Profile updated successfully", profile);
//   } catch (error) {
//     console.error(error);
//     return errReturned(res, "An error occurred while updating the profile");
//   }
// };



exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query; // Get the role from query parameters

    // Validate role input
    const validRoles = ['FLW', 'UCMO', 'AIC'];
    if (!validRoles.includes(role)) {
      return sendResponse(res, EResponseCode.BADREQUEST, "Invalid role provided");
    }

    const users = await USER.find({ role }, "firstName lastName email role cnic phone status territory")
    .populate('createdBy', 'firstName lastName cnic role')
    .populate('updatedBy', 'firstName lastName cnic role');
    return sendResponse(res, EResponseCode.SUCCESS, `${role} list`, users);
  } catch (err) {
    errReturned(res, err);
  }
};


exports.getAICsByUCMO = async (req, res) => {
  try {
    const { ucmoId } = req.params;
    const aics = await USER.find({ role: 'AIC', ucmo: ucmoId }, "firstName lastName email cnic phone role status territory")
    .populate('createdBy', 'firstName lastName cnic role')
    .populate('updatedBy', 'firstName lastName cnic role');
    return sendResponse(res, EResponseCode.SUCCESS, "AICs under UCMO", aics);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.getFLWsByAIC = async (req, res) => {
  try {
    const { aicId } = req.params;
    const flws = await USER.find({ role: 'FLW', aic: aicId }, "firstName lastName email cnic phone role status territory siteType")
    .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role');
    return sendResponse(res, EResponseCode.SUCCESS, "FLWs under AIC", flws);
  } catch (err) {
    errReturned(res, err);
  }
};


exports.getUCMOWithAICsAndFLWs = async (req, res) => {
  try {
    const { ucmoId } = req.params;

    // Fetch the UCMO
    const ucmo = await USER.findById(ucmoId);
    if (!ucmo) {
      return sendResponse(res, EResponseCode.NOT_FOUND, "UCMO not found");
    }

    // Fetch all AICs under the UCMO
    const aics = await USER.find({ role: 'AIC', ucmo: ucmoId });

    // Fetch FLWs for each AIC
    const aicsWithFLWs = await Promise.all(
      aics.map(async (aic) => {
        const flws = await USER.find({ role: 'FLW', aic: aic._id });
        return { ...aic.toObject(), flws }; // Include FLWs in the AIC object
      })
    );

    // Response structure
    const response = {
      ucmo,
      aics: aicsWithFLWs,
    };

    return sendResponse(res, EResponseCode.SUCCESS, "UCMO with AICs and FLWs", response);
  } catch (err) {
    errReturned(res, err);
  }
};



exports.searchUsers = async (req, res) => {
  try {
    const { role, firstName, lastName, cnic, email, phone, status } = req.query;

    // Build the query object
    const query = {};

    // Add conditions based on provided query parameters
    if (role) {
      query.role = role;
    }
    if (firstName) {
      query.firstName = { $regex: firstName, $options: 'i' }; // Case-insensitive search
    }
    if (lastName) {
      query.lastName = { $regex: lastName, $options: 'i' }; // Case-insensitive search
    }
    if (cnic) {
      query.cnic = { $regex: cnic, $options: 'i' }; // Case-insensitive search for CNIC
    }
    if (email) {
      query.email = { $regex: email, $options: 'i' }; // Case-insensitive search
    }
    if (phone) {
      query.phone = { $regex: phone, $options: 'i' }; // Case-insensitive search for phone
    }
    if (status) {
      query.status = status;
    }

    // Fetch users matching the query without pagination
    const users = await USER.find(query, "firstName lastName email role cnic phone status createdBy updatedBy aic ucmo siteType")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role')
      .populate('aic', 'firstName lastName cnic')
      .populate('ucmo', 'firstName lastName cnic'); // Populate UCMO details (only if relevant)

    // Enrich users with teams' data and additional role-specific information
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      let userDetails = user.toObject();

      // Handle users with 'AIC' role
      if (userDetails.role === 'AIC') {
        userDetails = {
          ...userDetails,
          ucmoDetails: userDetails.ucmo ? {
            firstName: userDetails.ucmo.firstName,
            lastName: userDetails.ucmo.lastName,
            cnic: userDetails.ucmo.cnic
          } : null,
        };

        // Enrich with team details (if user is AIC)
        const matchingTeams = await Team.find({ 'flws': user._id })
          .populate('aic', 'firstName lastName cnic')
          .populate('ucmo', 'firstName lastName cnic');
        const teams = matchingTeams.map(team => ({
          teamName: team.teamName,
          ucmoDetails: team.ucmo ? {
            firstName: team.ucmo.firstName,
            lastName: team.ucmo.lastName,
            cnic: team.ucmo.cnic
          } : null,
          aicDetails: team.aic ? {
            firstName: team.aic.firstName,
            lastName: team.aic.lastName,
            cnic: team.aic.cnic
          } : null,
        }));

        userDetails = { ...userDetails, teams };
      }

      // Handle users with 'FLW' role
      if (userDetails.role === 'FLW') {
        const matchingTeams = await Team.find({ 'flws': user._id })
          .populate('aic', 'firstName lastName cnic siteType')  // Include siteType for AIC
          .populate('ucmo', 'firstName lastName cnic siteType'); // Include siteType for UCMO

        const teams = matchingTeams.map(team => ({
          teamName: team.teamName,
          ucmoDetails: team.ucmo ? {
            firstName: team.ucmo.firstName,
            lastName: team.ucmo.lastName,
            cnic: team.ucmo.cnic,
            siteType: team.ucmo.siteType // Include siteType for UCMO
          } : null,
          aicDetails: team.aic ? {
            firstName: team.aic.firstName,
            lastName: team.aic.lastName,
            cnic: team.aic.cnic,
            siteType: team.aic.siteType // Include siteType for AIC
          } : null,
        }));

        userDetails = { ...userDetails, teams };
      }

      // If the user role is 'ADMIN' or 'UCMO', just return the user details without teams or additional role-based information
      if (userDetails.role === 'ADMIN' || userDetails.role === 'UCMO') {
        userDetails = {
          ...userDetails,
          teams: [],  // No teams data for 'ADMIN' or 'UCMO'
          ucmoDetails: null,  // No UCMO details for 'ADMIN' or 'UCMO'
        };
      }

      return userDetails;
    }));

    // Return the enriched user data without pagination info
    return sendResponse(res, EResponseCode.SUCCESS, "User search results", enrichedUsers);
  } catch (err) {
    console.error("Error fetching users:", err);
    return errReturned(res, err);
  }
};





exports.addAdmin = async (req, res) => {
  try {
    const result = await addUserWithRole(req, res, "ADMIN");
    if (result) {
    }
    return result; // Return the result or a relevant response
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.addUmco = async (req, res) => {
  try {
    const result = await addUserWithRole(req, res, "UCMO");
    if (result) {
      await redisClient.del('ucmo_list');
    }
    return result; // Return the result or a relevant response
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.addAic = async (req, res) => {
  try {
    // if (!req.body.ucmo) {
    //   return errReturned(res, "ucmo is required.");
    // }
    const result = await addUserWithRole(req, res, "AIC");
    if (result) {
      await redisClient.del('aic_list');
    }
    return result; // Return the result or a relevant response
  } catch (error) {
    return errReturned(res, error.message);
  }
};

exports.addFlw = async (req, res) => {
  try {
    // if (!req.body.aic) {
    //   return errReturned(res, "aic is required.");
    // }
    const result = await addUserWithRole(req, res, "FLW");
    if (result) {
      await redisClient.del('flw_list');
    }
    return result; // Return the result or a relevant response
  } catch (error) {
    return errReturned(res, error.message);
  }
};


const addUserWithRole = async (req, res, role) => {
  try {
    const { error, value } = userRegisterSchemaValidator.validate(req.body);
    if (error) {
      return errReturned(res, error.message);
    }

    const { cnic, phone } = value;
    let {email} = value;

    if(!email){
      email = generateRandomEmail(value.firstName);
      value.email = email;
    }


    const cnicExist = await USER.findOne({ 
      cnic, 
      $or: [
        { isDeleted: null }, // Case where isDeleted is null
        { isDeleted: false } // Case where isDeleted is false
      ]
    });
    
    if (cnicExist) return errReturned(res, "CNIC Already Exists");
    

    // Generate password from CNIC and phone
    // const generatedPassword = `${cnic.slice(0, 5)}${phone.slice(-3)}`;
    const generatedPassword = "polio123";
    value.password = await bcrypt.hash(generatedPassword, await bcrypt.genSalt(10));

    // Hardcoded role
    value.role = role;

    const user = new USER(value);
    const data = await user.save();

    return sendResponse(res, EResponseCode.SUCCESS, "User added successfully. Please check your email for verification.", user);
  } catch (error) {
    return errReturned(res, error.message || "An error occurred");
  }
};


exports.searchFlw = async (req, res) => {
  try {
    const { firstName, cnic, phone, aic } = req.query;
    const query = { role:'FLW'}; 
    if (firstName) query.firstName = { $regex: firstName, $options: 'i' };
    if (cnic) query.cnic = cnic; // Exact match for CNIC
    if (phone) query.phone = phone; // Exact match for phone
    if (aic) query.aic = aic; // Exact match for AIC

    const flws = await USER.find(query);
    return sendResponse(res, 200, "FLWs retrieved successfully.", flws);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getUsersByUcmo = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all AICs under the specified UCMO
    const aics = await USER.find({ ucmo: id, role: "AIC" });

    // Initialize an array to hold results
    const result = [];

    // Fetch FLWs for each AIC
    for (const aic of aics) {
      // Ensure you fetch FLWs associated with this specific AIC
      const flws = await USER.find({ aic: aic._id, role: "FLW" });
      result.push({ aic, flws });
    }

    return sendResponse(res, 200, "AICs and their FLWs retrieved successfully.", result);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.getAicsByUcmo = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all AICs under the specified UCMO
    const aics = await USER.find({ ucmo: id, role: "AIC" });

    return sendResponse(res, 200, "AICs retrieved successfully.", aics);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getFlwsByAic = async (req, res) => {
  try {
    const { id } = req.params; // AIC ID

    // Find all FLWs associated with the specified AIC
    const flws = await USER.find({ aic: id, role: "FLW" });

    return sendResponse(res, 200, "FLWs retrieved successfully.", flws);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// exports.assignTerritoryToUser = async (req, res) =>{
//   try {
//     const { userId, territoryId } = req.body;

//     let territory = await TERRITORY.findById(territoryId);

//     if(territory === null){
//       return sendResponse(res, EResponseCode.NOTFOUND, "Territory doesn't exist." );
//     }

//     let profile = await findByIdAndUpdate({
//       model: USER,
//       id: userId,
//       updateData: { territory: territoryId },
//       options: {new: true}
//     });

//     if(profile===null){
//       return sendResponse(res, EResponseCode.NOTFOUND, "No user found against provided ID." );
//     }

//     return sendResponse(
//       res,
//       EResponseCode.SUCCESS,
//       "Territory has been assigned",
//       profile
//     );
    
//   } catch (error) {
//     return errReturned(res, error.message);
//   }
// }



// Activate a user by ID
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from the request parameters
    const user = await USER.findById(userId);

    if (!user) {
      return errReturned(res, "User not found.");
    }

    // Set user status to ACTIVE
    user.status = 'ACTIVE'; // Adjust the field name based on your schema
    await user.save();

    return sendResponse(res, EResponseCode.SUCCESS, "User activated successfully.", user);
  } catch (error) {
    return errReturned(res, error.message || "An error occurred");
  }
};

// Deactivate a user by ID
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id; // Extract user ID from the request parameters
    const user = await USER.findById(userId);

    if (!user) {
      return errReturned(res, "User not found.");
    }

    // Set user status to INACTIVE
    user.status = 'INACTIVE'; // Adjust the field name based on your schema
    await user.save();

    return sendResponse(res, EResponseCode.SUCCESS, "User deactivated successfully.", user);
  } catch (error) {
    return errReturned(res, error.message || "An error occurred");
  }
};
