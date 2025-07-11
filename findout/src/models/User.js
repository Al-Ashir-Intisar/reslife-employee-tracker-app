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
    groupMemberships: [
      {
        groupId: {
          type: mongoose.Types.ObjectId,
          ref: "Group",
          required: true,
        },
        role: {
          type: String,
          default: "member",
        },
        certifications: [
          {
            name: String,
            issuedBy: String,
            issuedAt: Date,
            expiresAt: Date,
            addedBy: { type: mongoose.Types.ObjectId, ref: "User" },
            notes: String,
          },
        ],
        customAttributes: [
          {
            key: { type: String, required: true }, // e.g. "hasLaptop", "hoursWorked", "badgeLevel"
            type: {
              type: String,
              enum: ["string", "number", "boolean", "date", "duration"],
              required: true,
            },
            valueString: String,
            valueNumber: Number,
            valueBoolean: Boolean,
            valueDate: Date,
            valueDurationMinutes: Number, // e.g. 150 = 2h30m
            addedBy: { type: mongoose.Types.ObjectId, ref: "User" },
            addedAt: { type: Date, default: Date.now },
          },
        ],
        workShifts: [
          {
            startTime: { type: Date, required: true },
            startLocation: { lat: Number, lng: Number },
            estimatedEndTime: Date,
            actualEndTime: Date,
            endLocation: { lat: Number, lng: Number },
            // CHANGE THIS:
            // taskId: { type: mongoose.Types.ObjectId, ref: "Task" },
            taskIds: [{ type: mongoose.Types.ObjectId, ref: "Task" }], // <--- Make it an array!
            addedBy: { type: mongoose.Types.ObjectId, ref: "User" },
            addedAt: { type: Date, default: Date.now },
          },
        ],

        tasks: [
          {
            description: {
              type: String,
              required: true,
              maxlength: 280, // Reasonable max length
            },
            deadline: {
              type: Date,
              required: true,
            },
            assignedBy: {
              type: mongoose.Types.ObjectId,
              ref: "User",
              required: true,
            },
            assignedAt: {
              type: Date,
              default: Date.now,
            },
            completed: {
              type: Boolean,
              default: false,
            },
          },
        ],
        addedBy: { type: mongoose.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// This will prevent overwrite errors AND ensure fresh schema on reloads
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
