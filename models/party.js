const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const party = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      valueType: "String",
      enum: ["author", "publisher", "narrator"],
    },
    phone: {
      code: {
        type: String,
      },
      number: {
        type: String,
        trim: true,
      },
    },
    address: {
      line1: {
        type: String,
      },
      line2: {
        type: String,
      },
      state: {
        type: String,
      },
      zip: {
        type: String,
      },
      country: {
        type: String,
      },
      city: {
        type: String,
      },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Party = mongoose.model("Party", party);

// make this available to our users in our Node applications
module.exports = Party;
