// /models/User.js

import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false, // 👈 make sure this is false!
    },
    groupsIds: {
      type: Array,
      required: false,
    },
  },
  { timestamps: true }
);

// This will prevent overwrite errors AND ensure fresh schema on reloads
export default mongoose.models.User || mongoose.model("User", userSchema);
