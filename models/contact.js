const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const contactsSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    message: { type: String },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const Contact = mongoose.model("Contact", contactsSchema);

// make this available to our users in our Node applications
module.exports = Contact;
