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

    // --- Add/Edit Custom Attributes ---
    for (const { userId, attr } of edited) {
      // 1. Ensure the user is in group.membersId
      if (!group.membersId.some((id) => id.toString() === userId.toString())) {
        return new NextResponse(
          `User with id ${userId} is not a member of this group`,
          { status: 400 }
        );
      }

      // 2. Find user and create membership if needed
      const user = await User.findById(userId);
      if (!user) continue;

      let membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) {
        let membershipDefault = {
          groupId: new mongoose.Types.ObjectId(groupId),
          role: "member",
          certifications: [],
          customAttributes: [],
          workShifts: [],
          addedBy: new mongoose.Types.ObjectId(sessionUserId),
          addedAt: new Date(),
        };
        user.groupMemberships.push(membershipDefault);
      }

      membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );

      // Check if attribute with this key already exists
      const existing = membership.customAttributes.find(
        (a) => a.key === attr.key
      );

      if (existing) {
        // Update existing value based on type
        existing.type = attr.type;
        existing.valueString = attr.valueString ?? existing.valueString;
        existing.valueNumber = attr.valueNumber ?? existing.valueNumber;
        existing.valueBoolean =
          attr.valueBoolean !== undefined
            ? attr.valueBoolean
            : existing.valueBoolean;
        existing.valueDate = attr.valueDate ?? existing.valueDate;
        existing.valueDurationMinutes =
          attr.valueDurationMinutes ?? existing.valueDurationMinutes;
        existing.addedBy = new mongoose.Types.ObjectId(sessionUserId);
        existing.addedAt = new Date();
      } else {
        // Add new attribute
        membership.customAttributes.push({
          ...attr,
          addedBy: new mongoose.Types.ObjectId(sessionUserId),
          addedAt: new Date(),
        });
      }

      user.markModified("groupMemberships");
      await user.save();
    }

    // --- Delete Custom Attributes ---
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

    return NextResponse.json(
      { message: "Custom attributes updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Bulk update attrs error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
