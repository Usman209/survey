const bcrypt = require("bcryptjs");
const Team = require('../../lib/schema/team.schema');

const USER = require("../../lib/schema/users.schema");


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


exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.params?.id;

    const { error, value } = updateProfileSchemaValidator.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return errReturned(res, error.message);
    }

    // Check if a new password is provided
    if (value.password) {
      const salt = await bcrypt.genSalt(10);
      value.password = await bcrypt.hash(value.password, salt);
    }

    // Fetch the current user role before the update
    const currentUser = await USER.findById(userId).select('role');
    const updatedProfile = await findByIdAndUpdate({
      model: USER,
      id: userId,
      updateData: value,
    });

    // Invalidate caches based on role change
    if (currentUser.role !== updatedProfile.role) {
      // If the role has changed, invalidate all caches
      await redisClient.del('flw_list');
      await redisClient.del('ucmo_list');
      await redisClient.del('admin_list');
      await redisClient.del('aic_list');
    } else {
      // If the role hasn't changed, only invalidate the specific cache
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
          break; // No cache invalidation needed for other roles
      }
    }

    return sendResponse(res, EResponseCode.SUCCESS, "Profile updated successfully", updatedProfile);
  } catch (error) {
    console.error(error);
    return errReturned(res, "An error occurred while updating the profile");
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


// Get all FLWs
exports.getAllFLWs = async (req, res) => {
  try {
    const cacheKey = 'flw_list';
    const cachedFLWs = await redisClient.get(cacheKey);

    if (cachedFLWs) {
      return sendResponse(res, EResponseCode.SUCCESS, "FLW list", JSON.parse(cachedFLWs));
    }

    const flws = await USER.find({ role: 'FLW' }, "firstName lastName email role cnic phone status createdBy updatedBy")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role');

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

    await redisClient.set(cacheKey, JSON.stringify(enrichedFLWs), 'EX', 3600); // Set expiration time in seconds
    return sendResponse(res, EResponseCode.SUCCESS, "FLW list", enrichedFLWs);
  } catch (err) {
    console.error("Error fetching FLWs:", err);
    return errReturned(res, err);
  }
};

// Get all UCMOs
exports.getAllUCMOs = async (req, res) => {
  try {
    const cacheKey = 'ucmo_list';
    const cachedUCMOs = await redisClient.get(cacheKey);

    if (cachedUCMOs) {
      return sendResponse(res, EResponseCode.SUCCESS, "UCMO list", JSON.parse(cachedUCMOs));
    }

    const ucmos = await USER.find({ role: 'UCMO' }, "firstName lastName email role cnic phone status")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role');

    await redisClient.set(cacheKey, JSON.stringify(ucmos), 'EX', 3600);
    return sendResponse(res, EResponseCode.SUCCESS, "UCMO list", ucmos);
  } catch (err) {
    return errReturned(res, err);
  }
};

// Get all Admins
exports.getAllAdmins = async (req, res) => {
  try {
    const cacheKey = 'admin_list';
    const cachedAdmins = await redisClient.get(cacheKey);

    if (cachedAdmins) {
      return sendResponse(res, EResponseCode.SUCCESS, "Admin list", JSON.parse(cachedAdmins));
    }

    const admins = await USER.find({ role: 'ADMIN' }, "firstName lastName email role cnic phone status")
      .populate('createdBy', 'firstName lastName cnic role')
      .populate('updatedBy', 'firstName lastName cnic role');

    await redisClient.set(cacheKey, JSON.stringify(admins), 'EX', 3600);
    return sendResponse(res, EResponseCode.SUCCESS, "Admin list", admins);
  } catch (err) {
    return errReturned(res, err);
  }
};

exports.getAllAICs = async (req, res) => {
  try {
    const cacheKey = 'aic_list';
    const cachedAICs = await redisClient.get(cacheKey);

    if (cachedAICs) {
      return sendResponse(res, EResponseCode.SUCCESS, "AIC list", JSON.parse(cachedAICs));
    }

    // Fetch AICs from the database and populate relevant fields
    const aics = await USER.find(
      { role: 'AIC' },
      "firstName lastName email role cnic phone status createdBy updatedBy ucmo"
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
    await redisClient.set(cacheKey, JSON.stringify(enrichedAICs), 'EX', 3600);
    return sendResponse(res, EResponseCode.SUCCESS, "AIC list", enrichedAICs);
  } catch (err) {
    console.error("Error fetching AICs:", err);
    return errReturned(res, err);
  }
};



// Update Profile and Invalidate Cache
exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.params?.id;

    const { error, value } = updateProfileSchemaValidator.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return errReturned(res, error.message);
    }

    // Check if a new password is provided
    if (value.password) {
      const salt = await bcrypt.genSalt(10);
      value.password = await bcrypt.hash(value.password, salt);
    }

    const profile = await findByIdAndUpdate({
      model: USER,
      id: userId,
      updateData: value,
    });

    // Invalidate caches for user lists
    await redisClient.del('flw_list');
    await redisClient.del('ucmo_list');
    await redisClient.del('admin_list');
    await redisClient.del('aic_list');

    return sendResponse(res, EResponseCode.SUCCESS, "Profile updated successfully", profile);
  } catch (error) {
    console.error(error);
    return errReturned(res, "An error occurred while updating the profile");
  }
};



exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.query; // Get the role from query parameters

    // Validate role input
    const validRoles = ['FLW', 'UCMO', 'AIC'];
    if (!validRoles.includes(role)) {
      return sendResponse(res, EResponseCode.BADREQUEST, "Invalid role provided");
    }

    const users = await USER.find({ role }, "firstName lastName email role cnic phone status")
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
    const aics = await USER.find({ role: 'AIC', ucmo: ucmoId }, "firstName lastName email cnic phone role status")
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
    const flws = await USER.find({ role: 'FLW', aic: aicId }, "firstName lastName email cnic phone role status")
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
    const { role, firstName, email, status } = req.query;

    // Build the query object
    const query = {};

    // Add conditions based on provided query parameters
    if (role) {
      query.role = role;
    }
    if (firstName) {
      query.firstName = { $regex: firstName, $options: 'i' }; // Case-insensitive search
    }
    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }
    if (status) {
      query.status = status;
    }

    // Fetch users matching the query
    const users = await USER.find(query).select("firstName email cnic role phone status");

    // Return the results
    return sendResponse(res, EResponseCode.SUCCESS, "User search results", users);
  } catch (err) {
    errReturned(res, err);
  }
};



exports.addAdmin = async (req, res) => {
  try {
    const result = await addUserWithRole(req, res, "ADMIN");
    if (result) {
      await redisClient.del('admin_list');
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
    if (!req.body.ucmo) {
      return errReturned(res, "ucmo is required.");
    }
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
    if (!req.body.aic) {
      return errReturned(res, "aic is required.");
    }
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


    const cnicExist = await USER.findOne({ cnic });
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
