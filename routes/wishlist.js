const express = require("express");
const router = express.Router();

const wishListController = require("../controllers/wishlist");

const { validate, getUserIftoken } = require("../middlewares/polices");

router.get("/list", getUserIftoken,wishListController.list);
router.post("/create", validate, wishListController.create);
router.delete("/:id", validate, wishListController.delete);

module.exports = router;
