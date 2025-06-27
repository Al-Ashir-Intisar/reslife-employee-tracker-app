import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";

export const PUT = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { groupId, pendingAttrChanges } = await req.json();
    const { edited = [], deleted = [] } = pendingAttrChanges;

    await connect();

    const group = await Group.findById(groupId);
    if (!group) {
      return new NextResponse("Group not found", { status: 404 });
    }

    const sessionUserId = session.user._id || session.user.id;
    const isAdmin = group.adminIds.some(
      (id) => id.toString() === sessionUserId.toString()
    );

    if (!isAdmin) {
      return new NextResponse("Forbidden: not a group admin", { status: 403 });
    }

    // --- Process Edited Attributes ---
    for (const { userId, attr } of edited) {
      const user = await User.findById(userId);
      if (!user) continue;

      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) continue;

      // Find the existing attribute
      const existing = membership.customAttributes.find(
        (a) => a.key === attr.key
      );
      if (existing) {
        // Update value based on type
        switch (attr.type) {
          case "string":
            existing.valueString = attr.valueString ?? "";
            break;
          case "number":
            existing.valueNumber = attr.valueNumber ?? null;
            break;
          case "boolean":
            existing.valueBoolean = typeof attr.valueBoolean === "boolean" ? attr.valueBoolean : null;
            break;
          case "date":
            existing.valueDate = attr.valueDate ? new Date(attr.valueDate) : null;
            break;
          case "duration":
            existing.valueDurationMinutes = attr.valueDurationMinutes ?? null;
            break;
        }
        existing.updatedAt = new Date();
        existing.updatedBy = new mongoose.Types.ObjectId(sessionUserId);
        user.markModified("groupMemberships");
        await user.save();
      }
    }

    // --- Process Deleted Attributes ---
    for (const { userId, attr } of deleted) {
      const user = await User.findById(userId);
      if (!user) continue;

      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) continue;

      membership.customAttributes = membership.customAttributes.filter(
        (a) => a.key !== attr.key
      );
      user.markModified("groupMemberships");
      await user.save();
    }

    return NextResponse.json({ message: "Custom attributes updated" }, { status: 200 });
  } catch (err) {
    console.error("Bulk update attrs error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
