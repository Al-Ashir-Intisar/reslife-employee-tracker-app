import mongoose from "mongoose";

const { Schema } = mongoose;

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    membersId: {
      type: Array,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    ownerId: {
      type: String,
      required: true,
    },
    adminIds: {
      type: Array,
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model("Group", groupSchema);
