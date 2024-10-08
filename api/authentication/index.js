const express = require("express");
const router = express.Router();
const { authUser } = require("../../lib/utils/verifyToken");


const controller = require("./controller")


router.post("/login", controller.login); 

router.post("/register", controller.register);
router.post("/logout", authUser, controller.logout); 
router.post("/verifyToken" ,authUser,controller.verify); 
router.post("/resetPassword" ,authUser,controller.resetPassword); 





module.exports = router;