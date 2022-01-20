const express = require("express");
const router = express.Router();

const userActivity = require("../controllers/userActivity");

const { validate } = require("../middlewares/polices");

router.get("/list", userActivity.list);
router.get("/:id", userActivity.findOne);
router.post("/create", validate, userActivity.create);
router.put("/:id/update", validate, userActivity.update);
router.delete("/:id", validate, userActivity.delete);

module.exports = router;
