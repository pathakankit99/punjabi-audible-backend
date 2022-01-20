const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const order = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    audiobook: {
      type: Schema.Types.ObjectId,
      ref: "AudioBook",
      required: true,
    },
    currency: { type: String },
    amount: { type: Number },
    order_id: { type: String },
    status: {
      type: String,
      default: "Created",
      enum: ["Success", "Failure", "Created"],
    },
    paymentId: { type: String },
    signature: { type: String },
    device:{
      type: String,
      default:"",
      enum: ["android", "ios",""],
    }
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Order = mongoose.model("Order", order);

// make this available to our users in our Node applications
module.exports = Order;
