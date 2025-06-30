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
    const { groupId, pendingCertChanges } = await req.json();
    const { edited = [], deleted = [] } = pendingCertChanges;

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

    // --- Add/Edit Certifications ---
    for (const { userId, cert } of edited) {
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

      // Check if certification with this name exists (case-insensitive)
      const existing = membership.certifications.find(
        (c) => c.name.trim().toLowerCase() === cert.name.trim().toLowerCase()
      );

      if (existing) {
        // Update existing cert
        existing.expiresAt = cert.expiresAt;
        existing.addedAt = new Date();
        existing.addedBy = new mongoose.Types.ObjectId(sessionUserId);
      } else {
        // Add new cert
        membership.certifications.push({
          ...cert,
          addedAt: new Date(),
          addedBy: new mongoose.Types.ObjectId(sessionUserId),
        });
      }
      user.markModified("groupMemberships");
      await user.save();
    }

    // --- Delete Certifications ---
    for (const { userId, cert } of deleted) {
      const user = await User.findById(userId);
      if (!user) continue;

      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) continue;

      membership.certifications = membership.certifications.filter(
        (c) => c.name.trim().toLowerCase() !== cert.name.trim().toLowerCase()
      );
      user.markModified("groupMemberships");
      await user.save();
    }

    return NextResponse.json(
      { message: "Certifications updated" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Bulk update certs error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
