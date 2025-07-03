import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export const PUT = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { groupId, newMemberIds } = await req.json();

    await connect();

    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const userId = new mongoose.Types.ObjectId(session.user._id);

    const group = await Group.findById(groupObjectId);
    if (!group) return new NextResponse("Group not found", { status: 404 });

    const isAdmin = group.adminIds.some(
      (adminId) => adminId.toString() === userId.toString()
    );

    if (!isAdmin) {
      return new NextResponse("Forbidden: Only admins can add members", {
        status: 403,
      });
    }

    const newMemberObjectIds = newMemberIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const updatedGroup = await Group.findByIdAndUpdate(
      groupObjectId,
      { $addToSet: { membersId: { $each: newMemberObjectIds } } },
      { new: true }
    );

    // Update each user's groupIds
    await Promise.all(
      newMemberObjectIds.map(async (userId) => {
        const res = await User.findByIdAndUpdate(userId, {
          $addToSet: { groupIds: groupObjectId },
        });
        console.log(`Updated user ${userId} =>`, res);
      })
    );

    return NextResponse.json(updatedGroup, { status: 200 });
  } catch (error) {
    console.error("Error adding members:", error);
    return new NextResponse("Failed to add members", { status: 500 });
  }
};
