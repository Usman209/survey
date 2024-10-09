const express = require("express");
const router = express.Router();
const { authenticateAndAuthorize } = require("../../lib/utils/verifyToken");


const controller = require("./controller");
const { EUserRole } = require("../../lib/utils/enum");


router
  .route("/")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.userList)
  .patch(authenticateAndAuthorize([EUserRole.ADMIN]), controller.updatePassword);

  router
  .route("/flws")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getAllFLWs);

router
  .route("/ucmos")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getAllUCMOs);

router
  .route("/aics")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getAllAICs);

  router
  .route("/role")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getUsersByRole); 

  router
  .route("/ucmos/:ucmoId/aics")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getAICsByUCMO); // Get all AICs under a specific UCMO

router
  .route("/aics/:aicId/flws")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getFLWsByAIC); // Get all FLWs under a specific AIC


  router
  .route("/ucmos/:ucmoId/with-aics-flws")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.getUCMOWithAICsAndFLWs);

  router
  .route("/search")
  .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.searchUsers);



router.post('/add-admin', controller.addAdmin);
router.post('/add-umco', controller.addUmco);
router.post('/add-aic', controller.addAic);
router.post('/add-flw', controller.addFlw);

  

router.route('/:id')
// .get(authenticateAndAuthorize([EUserRole.ADMIN]), controller.userDetail)
.get(controller.userProfile)
.put(controller.updateProfile);

module.exports = router;
