var express = require("express");
var router = express.Router();

var user_controller = require("../controllers/user");
const { validate } = require("../middlewares/polices");

router.get("/test", validate, user_controller.test);
router.get("/list", user_controller.list);
router.get("/currentuser", validate, user_controller.currentUser);
router.get("/:id", validate, user_controller.findOne);
router.post("/registration", user_controller.create);
router.put("/update", validate, user_controller.update);
router.put("/updatepassword", validate, user_controller.updatePassword);
router.delete("/:id", validate, user_controller.delete);
router.post("/login", user_controller.login);
router.get("/:id/refreshToken", user_controller.createRefreshToken);
router.post("/forgotpassword", user_controller.forgotpassword);
router.post("/:id/verification", user_controller.verification);
router.post("/:id/resendOtp", user_controller.resendOtp);
router.put("/resetpassword",user_controller.resetPassword);
router.post(
  "/upload/profileImage",
  validate,
  user_controller.uploadProfileImage,
);

router.post("/google/auth", user_controller.googleAuth);

module.exports = router;
