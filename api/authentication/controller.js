const _ = require("lodash");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { sendResponse, errReturned } = require("../../lib/utils/dto");
const { EResponseCode } = require("../../lib/utils/enum");
const User = require("../../lib/schema/users.schema");
const { emailRegistration, forgotPasswordEmail } = require("../../lib/utils/email");
const {
  userRegisterSchemaValidator,
  userLoginSchemaValidator,
} = require("../../lib/utils/sanitization");

require("dotenv").config();

exports.login = async (req, res) => {
  try {
    const { error, value } = userLoginSchemaValidator.validate(req.body);
    if (error) {
      return errReturned(res, error.message);
    }

    const { cnic, password } = value;

    // Find user by CNIC
    const user = await User.findOne({ cnic });
    if (!user) return errReturned(res, "User Not Found");

    // Check if user is inactive
    if (user.status === 'INACTIVE') {
      return errReturned(res, "User is inactive and cannot log in.");
    }

    

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return errReturned(res, "Invalid Password");

    let response = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      cnic: user.cnic, // Include CNIC in the response if needed
      phone: user.contact, // Adjusted to use the correct field
      role: user.role
    };

    const token = jwt.sign(response, process.env.TOKEN_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.header("auth-token", token).json({ token, user: response });
  } catch (error) {
    console.log('Error from here ===', error);
    return errReturned(res, error.message || "An error occurred");
  }
};


// Logout route
exports.logout = async (req, res) => {

  console.log(' header ', req.header('auth-token'));

  try {
    res.setHeader("auth-token", "");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log('error ', error);
    return errReturned(res, error);
  }
};


exports.register = async (req, res) => {
  console.log(req.body);
  try {
    const { error, value } = userRegisterSchemaValidator.validate(req.body);
    if (error) {
      return errReturned(res, error.message);
    }

    const { email, cnic, phone } = value;
    const emailExist = await User.findOne({ email });
    if (emailExist) return errReturned(res, "Email Already Exists");

    // Generate password from CNIC and phone
    const generatedPassword = `${cnic.slice(0, 5)}${phone.slice(-3)}`;
    value.password = await bcrypt.hash(generatedPassword, await bcrypt.genSalt(10));

    const user = new User(value);
    const data = await user.save();
    console.log(data);

    return sendResponse(res, EResponseCode.SUCCESS, "Please check your email for verification.!", user);
  } catch (error) {
    return errReturned(res, error);
  }
};


exports.resetPassword = async (req, res) => {
  try {

    console.log('from here ', req.body);
    const token = req.header('auth-token')


    // let payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));

    const user_password = req.body.password;
    if (!token) {
      return res.json({
        success: false,
        error: 'token must be required'
      })
    }
    if (!user_password) {
      return res.json({ success: false, error: 'password must be required' })
    }
    const verify = await jwt.verify(token, process.env.TOKEN_SECRET)


    if (!verify) {
      return res.json({
        success: 'false',
        error: "Token is not valid"
      })
    }

    const userObj = await User.findOne({ _id: verify.id })
    if (!userObj) return res.json({ success: false, error: "User not found!" })


    const salt = await bcrypt.genSalt(10);
    userObj.password = await bcrypt.hash(user_password, salt);


    userObj.user_token = ""
    await userObj.save();

    return res.json({
      success: true,
      message: 'User password is reset successuflly'
    })
  } catch (err) {
    console.log(err);

    res.json({ success: false, error: err.message })
  }

}


exports.forgotPassword = async (req, res) => {

  const user_email = req.body.email;
  console.log(req.body);

  try {

    if (!user_email) {
      return res.json({
        success: false,
        message: 'user email must be required'
      })
    }

    const data = await User.findOne({ email: user_email })


    if (!data) {

      return sendResponse(
        res,
        EResponseCode.NOTFOUND,
        "Email not Found"
      );
    }


    const token = jwt.sign({
      id: data._id
    }, process.env.TOKEN_SECRET, { expiresIn: 150 * 60 });

    // return res.json({ success: true, message: 'Please check your email' })
    return sendResponse(res, EResponseCode.SUCCESS, "Please check your email");
  } catch (error) {


    console.log('error is ', error);
  }
}

exports.verify = async (req, res) => {
  console.log(req.body);

  try {

    return sendResponse(res, EResponseCode.SUCCESS);


  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

exports.verfiyEmail = async (req, res) => {

  try {

    console.log(req.body);
    const token = req.header('auth-token')


    //  let payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));

    //  console.log('code from here ',payload.id);

    if (!token) {
      return res.json({
        success: false,
        error: 'token must be required'
      })
    }

    const verify = await jwt.verify(token, process.env.TOKEN_SECRET)

    if (!verify) {
      return res.json({
        success: 'false',
        error: "Token is not valid"
      })
    }

    const userObj = await User.findOne({ _id: verify.id })
    if (!userObj) return res.json({ success: false, error: "User not found!" })


    userObj.emailVerified = true;
    await userObj.save();

    return res.json({
      success: true,
      message: 'Congratulations! Your email address has been successfully verified.'
    })
  } catch (err) {

    res.json({ success: false, error: err.message })
  }
}

