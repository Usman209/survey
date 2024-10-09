const express = require("express");
const router = express.Router();
const { authenticateAndAuthorize } = require("../../lib/utils/verifyToken");


const controller = require("./controller")


router.post("/login", controller.login); 

router.post("/register", controller.register);
router.post("/logout",  controller.logout); 
router.post("/verifyToken" ,controller.verify); 
router.post("/resetPassword" ,controller.resetPassword); 





module.exports = router;