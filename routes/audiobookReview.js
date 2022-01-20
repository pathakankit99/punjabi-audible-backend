const express = require("express");
const router = express.Router();

const audiobookReviewController = require("../controllers/audiobookReview");

const { validate } = require("../middlewares/polices");

router.get("/list", audiobookReviewController.list);
router.get("/:id", audiobookReviewController.findOne);
router.post("/create", validate, audiobookReviewController.create);
router.put("/:id/update", validate, audiobookReviewController.update);
router.delete("/:id", validate, audiobookReviewController.delete);

module.exports = router;
