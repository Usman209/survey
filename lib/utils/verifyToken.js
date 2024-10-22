const jwt = require('jsonwebtoken')
const USER = require('../../lib/schema/users.schema');

const { sendResponse } = require('./dto');
const { EUserRole, EResponseCode } = require('./enum');
const { findById } = require('./abstractRepository')


const authenticateAndAuthorize = (allowedRoles) => {
  return async (req, res, next) => {
    const token = req.header('auth-token');
    
    try {
      if (!token) {
        return sendResponse(res, EResponseCode.UNAUTHORIZED, { "token": 'Authentication required' });
      }

      const verified = jwt.verify(token, process.env.TOKEN_SECRET);
      req.user = verified; // Attach user info to request

      // Fetch user role
      const userRole = await findById({ model: USER, id: verified.id });

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole?.role.toString())) {
        return sendResponse(res, EResponseCode.UNAUTHORIZED, 'Access denied');
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      
      return sendResponse(res, EResponseCode.UNAUTHORIZED, { "token": 'Invalid Token' });
    }
  };
};

module.exports = {
  authenticateAndAuthorize
};

