const express = require("express");
const router = express.Router();

const countryController = require("../controllers/country");

const { validate } = require("../middlewares/polices");

router.get("/list", countryController.list);
router.get("/:id", countryController.findOne);
router.post("/create", validate, countryController.create);
router.put("/:id/update", validate, countryController.update);
router.delete("/:id", validate, countryController.delete);

module.exports = router;
