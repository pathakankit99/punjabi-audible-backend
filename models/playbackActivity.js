const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const playbackActivitySchema = new Schema(
  {
    audioBook: {
      type: Schema.Types.ObjectId,
      ref: "AudioBook",
      required: true,
    },
    episode: { type: Schema.Types.String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: false },
    lastPlayed: { type: Number },
    playbackTime: { type: Number, required: true },
    finished: {
      type: Boolean,
      default: false,
    },
    speed: {
      type: Number,
    },
    bookmark: {
      type: Number,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);
// the schema is useless so far
// we need to create a model using it
const PlaybackActivity = mongoose.model(
  "PlaybackActivity",
  playbackActivitySchema,
);

// make this available to our users in our Node applications
module.exports = PlaybackActivity;
