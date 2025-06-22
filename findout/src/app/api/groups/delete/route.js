// /app/api/groups/delete/route.js
import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export const DELETE = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { groupId } = await req.json();

  await connect();

  try {
    const group = await Group.findById(groupId);
    if (!group) return new NextResponse("Group not found", { status: 404 });

    if (group.ownerId.toString() !== session.user._id) {
      return new NextResponse(
        "Forbidden: Only the owner can delete the group",
        { status: 403 }
      );
    }

    await Group.findByIdAndDelete(groupId);

    // Remove groupId from all members of the group and their memberships details
    await User.updateMany(
      {
        groupIds: new mongoose.Types.ObjectId(groupId),
      },
      {
        $pull: {
          groupIds: new mongoose.Types.ObjectId(groupId),
          groupMemberships: { groupId: new mongoose.Types.ObjectId(groupId) },
        },
      }
    );

    return new NextResponse("Group deleted successfully", { status: 200 });
  } catch (err) {
    console.error("Delete failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
