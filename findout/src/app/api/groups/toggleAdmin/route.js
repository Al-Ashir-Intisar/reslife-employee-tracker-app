import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import Group from "@/models/Group";
import mongoose from "mongoose";

export const PUT = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { groupId, userId, makeAdmin } = await req.json();
    await connect();

    const group = await Group.findById(groupId);
    if (!group) return new NextResponse("Group not found", { status: 404 });

    const sessionUserId = session.user._id;
    if (group.ownerId.toString() !== sessionUserId.toString()) {
      return new NextResponse("Forbidden: Only group owner can modify admins", {
        status: 403,
      });
    }

    const targetUserId = new mongoose.Types.ObjectId(userId);

    if (makeAdmin) {
      // Add if not already present
      if (!group.adminIds.includes(targetUserId)) {
        group.adminIds.push(targetUserId);
      }
    } else {
      // Remove if exists
      group.adminIds = group.adminIds.filter(
        (id) => id.toString() !== targetUserId.toString()
      );
    }

    await group.save();
    return NextResponse.json(
      { message: "Admin status updated" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Toggle admin error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
