const express = require("express");
const router = express.Router();

const orderController = require("../controllers/order");

const { validate,getUserIftoken } = require("../middlewares/polices");

router.get("/list", getUserIftoken, orderController.list);
router.get("/:id", validate, orderController.findOne);
router.post("/create", validate, orderController.create);
router.post("/success", validate, orderController.success);
router.post("/inapp", validate, orderController.inapp);

module.exports = router;
