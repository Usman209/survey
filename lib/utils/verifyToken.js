const jwt = require('jsonwebtoken')
const USER = require('../../lib/schema/users.schema');

const { sendResponse } = require('./dto');
const { EUserRole, EResponseCode } = require('./enum');
const { findById } = require('./abstractRepository')

exports.authUser = async function (req, res, next){
    const token = req.header('auth-token')

    console.log('from auth',token);
    try {
        if(!token) return sendResponse(res, EResponseCode.UNAUTHORIZED,  {"token":'Authentication required'})
        const verified = await jwt.verify(token, process.env.TOKEN_SECRET)
        let userRole = await findById({ model: USER, id: verified?.id });
        if(userRole?.role.toString() !== EUserRole.USER){
          return sendResponse(res, EResponseCode.UNAUTHORIZED,  'Authentication required');
        } 
        req.user = verified
        next()
    } catch (error) {
      console.log('error', error);
        res.status(400).send({"token":'Invalid Token'})
    }
  }

exports.authAdmin = async function (req, res, next){
    const token = req.header('auth-token')
    try {
        if(!token) return sendResponse(res, EResponseCode.UNAUTHORIZED,  {"token":'Authentication required'})
        const verified = await jwt.verify(token, process.env.TOKEN_SECRET, async (err, user)=>{
          if(err){
            return sendResponse(res, EResponseCode.UNAUTHORIZED,"Expired",{"message":"Token Expired please login again"});
          }
          return user
        })
        let userRole = await User.findOne({_id:verified._id})
      
        if(userRole.role.toString() !== EUserRole.USER) return sendResponse(res, EResponseCode.UNAUTHORIZED,  'only admin can access this route');
        req.user = verified
        
        next()
    } catch (error) {
        res.status(400).send({"token":'Invalid Token'})
    }
  }

