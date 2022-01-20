const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// create a schema

const userActivity = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    audiobooks: [
      {
        audiobook_id: {
          type: Schema.Types.ObjectId,
          ref: "AudioBook",
          required: true,
        },
        episodes: [
          {
            key: {
              type: Number,
            },
            time: {
              type: Number,
            },
            finished: {
              type: Boolean,
            },
            speed: {
              type: Number,
            },
            bookmark: {
              type: Number,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

// audio:[{book:owirf, epise:[{epi:, timr}]}]
// the schema is useless so far
// we need to create a model using it
const UserActivity = mongoose.model("UserActivity", userActivity);

// make this available to our users in our Node applications
module.exports = UserActivity;
