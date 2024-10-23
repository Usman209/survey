const express = require("express");
const router = express.Router();
const { authenticateAndAuthorize } = require("../../lib/utils/verifyToken");


const controller = require("./controller");
const { EUserRole } = require("../../lib/utils/enum");


router
  .route("/")
  .get(controller.userList)

  router.route("/updatepass/:id").put(controller.updatePassword)

  router
  .route("/flws")
  .get( controller.getAllFLWs);

router
  .route("/ucmos")
  .get( controller.getAllUCMOs);

router
  .route("/aics")
  .get( controller.getAllAICs);

  router
  .route("/role")
  .get( controller.getUsersByRole); 

  router
  .route("/umco/:ucmoId/aics")
  .get( controller.getAICsByUCMO); // Get all AICs under a specific UCMO

router
  .route("/aics/:aicId/flws")
  .get(controller.getFLWsByAIC); // Get all FLWs under a specific AIC


  router
  .route("/ucmos/:ucmoId/with-aics-flws")
  .get( controller.getUCMOWithAICsAndFLWs);

  router
  .route("/search")
  .get( controller.searchUsers);



router.post('/add-admin', controller.addAdmin);
router.post('/add-umco', controller.addUmco);
router.post('/add-aic', controller.addAic);
router.post('/add-flw', controller.addFlw);

router.get('/flw-search', controller.searchFlw);


router.get('/all-ucmo', controller.getAllUCMOs);
router.get('/all-admin', controller.getAllAdmins);

router.get('/all-aic', controller.getAllAICs);
router.get('/all-flw', controller.getAllFLWs);







router.get('/ucmo/:id', controller.getUsersByUcmo);
router.get('/ucmoids/:id', controller.getUserIdsByUcmo);

router.get('/ucmo/aics/:id', controller.getAICsByUCMO);

router.get('/aic/:id', controller.getFLWsByAIC);
router.get('/aicids/:id', controller.getFLWIdsByAIC);



// router.patch('/assign-update-territory', controller.assignTerritoryToUser);



router.get('/active/:id', controller.activateUser);
router.get('/inactive/:id', controller.deactivateUser);

  

router.route('/:id')
// .get( controller.userDetail)
.get(controller.userProfile)
.put(authenticateAndAuthorize(['UCMO', 'AIC', 'ADMIN']), controller.updateProfile);
module.exports = router;
