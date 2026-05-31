const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    loginCode: {
      type: String,
      select: false,
    },
    loginCodeExpires: {
      type: Date,
      select: false,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    twitterHandle: {
      type: String,
      default: "",
    },
    portfolioTitle: {
      type: String,
      maxlength: 100,
      default: "",
    },
    isPublicProfile: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
