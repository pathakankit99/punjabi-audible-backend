const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs"),
  SALT_WORK_FACTOR = 10;

const userSchema = new Schema(
  {
    name: { type: String, valueType: "String", required: true },
    password: { type: String, bcrypt: true },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    phone: {
      type: String,
      valueType: "String",
      trim: true,
    },
    profile_url: { type: String, valueType: "String" },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      trim: true,
      required: true,
    },
    gender: {
      type: String,
      trim: true,
      valueType: "String",
      enum: ["Male","Female","Others"],
    },
    isActive: { type: Boolean, default: true, valueType: "Boolean" },
    isVerified: { type: Boolean, default: false, valueType: "Boolean" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  },
);

userSchema.pre("save", function (next) {
  var user = this;
  if (!user.isModified("password")) return next();
  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
    if (err) return next(err);
    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function (err, hash) {
      if (err) return next(err);
      // override the cleartext password with the hashed one
      user.password = hash;
      next();
    });
  });
});

userSchema.pre("update", function (next) {
  var user = this;
  const password = user.getUpdate().password;
  if (!password) {
    return next();
  }
  try {
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
      if (err) {
        return next(err);
      }
      // hash the password using our new salt
      bcrypt.hash(user.getUpdate().password, salt, function (err, hash) {
        if (err) {
          return next(err);
        }
        // override the cleartext password with the hashed one
        user.getUpdate().password = hash;
        next();
      });
    });
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

const User = mongoose.model("User", userSchema);

// make this available to our users in our Node applications
module.exports = User;
