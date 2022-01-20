const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const country = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true },
    provinces: [{ type: Object }],
    iso3: { type: String },
    phone_code: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Country = mongoose.model("Country", country);

// make this available to our users in our Node applications
module.exports = Country;
