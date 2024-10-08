const express = require("express");
const router = express.Router();
const { authUser } = require("../../lib/utils/verifyToken");


const controller = require("./controller");


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

  router
  .route("/search")
  .get(authUser, controller.searchUsers);



router.post('/add-admin', controller.addAdmin);
router.post('/add-umco', controller.addUmco);
router.post('/add-aic', controller.addAic);
router.post('/add-flw', controller.addFlw);

  

router.route('/:id')
// .get(authUser, controller.userDetail)
.get(controller.userProfile)
.put(controller.updateProfile);

module.exports = router;
