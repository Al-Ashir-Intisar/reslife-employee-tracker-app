import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    membersId: {
      type: [Types.ObjectId],
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    ownerId: {
      type: Types.ObjectId,
      required: true,
    },
    adminIds: {
      type: [Types.ObjectId],
      required: false,
    },
    announcement: {
      message: { type: String, default: "Now group admins can add an announcement for the group! Try it out." },
      updatedAt: { type: Date },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model("Group", groupSchema);
