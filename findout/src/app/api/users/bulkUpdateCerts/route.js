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

    // --- Process Edited Certs ---
    for (const { userId, cert } of edited) {
      const user = await User.findById(userId);
      if (!user) continue;

      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) continue;

      const existing = membership.certifications.find(
        (c) => c._id.toString() === cert._id
      );
      if (existing) {
        existing.expiresAt = new Date(cert.expiresAt);
        existing.addedAt = new Date();
        existing.addedBy = new mongoose.Types.ObjectId(sessionUserId);

        // Mark nested path as modified
        user.markModified("groupMemberships");
        await user.save();
      }
    }

    // --- Process Deleted Certs ---
    for (const { userId, cert } of deleted) {
      const user = await User.findById(userId);
      if (!user) continue;

      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) continue;

      membership.certifications = membership.certifications.filter(
        (c) => c._id.toString() !== cert._id
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
