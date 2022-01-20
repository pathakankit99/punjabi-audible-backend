const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const audiobookReview = new Schema(
  {
    rating: { type: Number, required: true},
    description: { type: String},
    audiobook: { type: Schema.Types.ObjectId, ref: "AudioBook", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const AudiobookReview = mongoose.model("AudiobookReview", audiobookReview);

// make this available to our users in our Node applications
module.exports = AudiobookReview;
