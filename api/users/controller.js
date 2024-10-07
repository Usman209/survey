const bcrypt = require("bcryptjs");
const USER = require("../../lib/schema/users.schema");
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
} = require("../../lib/utils/sanitization");

exports.userProfile = async (req, res) => {
  try {

    let user = await findById({ model: USER, id: req?.params?.id  });

    return sendResponse(res, EResponseCode.SUCCESS, "User Profile", user);
  } catch (e) {
    errReturned(res, e);
  }
};

exports.userList = async (req, res) => {
  try {
    const users = await pagenate({
      model: USER,
      projection: "name email role status",
    });
    return sendResponse(res, EResponseCode.SUCCESS, "User list", users);
  } catch (err) {
    errReturned(res, err);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { error, value } = updatePasswordSchemaValidator.validate(req.body);
    if (error) return errReturned(res, error.message);

    const salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(value.newpassword, salt);

    let user = await findById({ model: USER, id: req?.user?.id });

    const validPass = await bcrypt.compare(value.oldpassword, user.password);
    if (!validPass) return errReturned(res, "Invalid Password");

    let status = await findByIdAndUpdate({
      model: USER,
      id: req?.user?.id,
      updateData: { password: hashedPassword },
    });

    if (status["nModified"])
      return sendResponse(res, EResponseCode.NOTFOUND, "Already updated");

    return sendResponse(
      res,
      EResponseCode.SUCCESS,
      "Password has been updated"
    );
  } catch (error) {
    console.log(error);
    errReturned(res, error);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req?.params?.id 

    const { error, value } = updateProfileSchemaValidator.validate(req.body, {
      stripUnknown: true, // Exclude unknown fields, including "_id"
    });    if (error) {
      return errReturned(res, error.message);
    }
    
    const hasNewImage = value.profileImg !== undefined && value.profileImg !== null;

    // If a new image is provided, delete the previous image
    if (hasNewImage) {
      const user = await findById({ model: USER, id: userId  });

      if (user && user.profileImg) {
        // Assuming user.image is the field where the image path is stored
        // Delete the previous image
        await fs.unlink(user.profileImg);
      }
    }

    const profile = await findByIdAndUpdate({
      model: USER,
      id: userId,
      updateData: value,
    });
    return sendResponse(res, EResponseCode.SUCCESS, "success", profile);
  } catch (error) {
    console.log(error);
    errReturned(res, error);
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
