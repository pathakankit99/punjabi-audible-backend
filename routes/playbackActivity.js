const express = require("express");
const router = express.Router();

const playbackActivity = require("../controllers/playbackActivity");

const { validate } = require("../middlewares/polices");

router.get("/list", validate, playbackActivity.list);
router.get("/listenLevel", validate, playbackActivity.listenLevel);
router.get("/stats", validate, playbackActivity.stats);
router.get("/:id", validate, playbackActivity.findOne);
router.post("/create", validate, playbackActivity.create);
router.put("/:id/update", validate, playbackActivity.update);

module.exports = router;
