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
      required: false, 
    },
    groupIds: {
      type: Array,
      required: false,
    },
  },
  { timestamps: true }
);

// This will prevent overwrite errors AND ensure fresh schema on reloads
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
