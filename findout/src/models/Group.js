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
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model("Group", groupSchema);
