import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
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
    const newMemberObjectIds = newMemberIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const updatedGroup = await Group.findByIdAndUpdate(
      groupObjectId,
      { $addToSet: { membersId: { $each: newMemberObjectIds } } },
      { new: true }
    );

    return NextResponse.json(updatedGroup, { status: 200 });
  } catch (error) {
    console.error("Error adding members:", error);
    return new NextResponse("Failed to add members", { status: 500 });
  }
};