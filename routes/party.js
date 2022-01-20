const express = require("express");
const router = express.Router();

const partyController = require("../controllers/party");

const { validate } = require("../middlewares/polices");

router.get("/list", partyController.list);
router.get("/:id", partyController.findOne);
router.post("/create", validate, partyController.create);
router.put("/:id/update", validate, partyController.update);
router.delete("/:id", validate, partyController.delete);

module.exports = router;
