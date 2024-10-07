const express = require("express");
const router = express.Router();
const { authUser } = require("../../lib/utils/verifyToken");
const path = require('path');
const multer = require('multer');


const controller = require("./controller");




const storage = multer.diskStorage({
  destination: './uploads/user/',
  filename: function (req, file, cb) {
    const { body } = req;
    const userName = body.firstName?.replace(/\s+/g, '-').toLowerCase(); // Modify firstName to lowercase and replace spaces with hyphens
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueFileName = `${userName}-${Date.now()}${extension}`;
    cb(null, uniqueFileName);
  }
});

const upload = multer({
  storage: storage
  // limits: { fileSize: 1 * 1024 * 1024 },
});


router
  .route("/")
  .get(authUser, controller.userList)
  .patch(authUser, controller.updatePassword);

  router
  .route("/flws")
  .get(authUser, controller.getAllFLWs);

router
  .route("/ucmos")
  .get(authUser, controller.getAllUCMOs);

router
  .route("/aics")
  .get(authUser, controller.getAllAICs);

  router
  .route("/role")
  .get(authUser, controller.getUsersByRole); 

  router
  .route("/ucmos/:ucmoId/aics")
  .get(authUser, controller.getAICsByUCMO); // Get all AICs under a specific UCMO

router
  .route("/aics/:aicId/flws")
  .get(authUser, controller.getFLWsByAIC); // Get all FLWs under a specific AIC


  router
  .route("/ucmos/:ucmoId/with-aics-flws")
  .get(authUser, controller.getUCMOWithAICsAndFLWs);



  


router.route('/:id')
// .get(authUser, controller.userDetail)
.get(controller.userProfile)
.put(upload.single('profileImg'),controller.updateProfile);

module.exports = router;
