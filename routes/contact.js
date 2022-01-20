const express = require("express");
const router = express.Router();

const contactController = require("../controllers/contact");

const { validate } = require("../middlewares/polices");

router.get("/list", contactController.list);
router.get("/:id", contactController.findOne);
router.post("/create", contactController.create);
// router.put("/:id/update", validate, contactController.update);
// router.delete("/:id", validate, contactController.delete);

module.exports = router;
