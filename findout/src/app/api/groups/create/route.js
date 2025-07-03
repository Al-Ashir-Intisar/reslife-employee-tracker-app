import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User";
import mongoose from "mongoose";

export const POST = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { name, description, membersId, ownerId, adminIds } =
      await req.json();

    await connect();
    const membersObjectId = membersId.map(
      (id) => new mongoose.Types.ObjectId(id)
    );
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
    const adminObjectIds = adminIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const existing = await Group.findOne({ name });
    if (existing)
      return new NextResponse("Group name already exists", { status: 409 });
    const newGroup = new Group({
      name,
      description,
      membersId: membersObjectId,
      ownerId: ownerObjectId,
      adminIds: adminObjectIds,
      announcement: "Now group admins can add an announcement for the group! Try it out.", // initialize as empty
    });

    await newGroup.save();

    // Update each user's groupIds
    await Promise.all(
      membersObjectId.map(async (userId) => {
        const res = await User.findByIdAndUpdate(userId, {
          $addToSet: { groupIds: newGroup._id },
        });
        console.log(`Updated user ${userId} =>`, res);
      })
    );

    return new NextResponse("Group created successfully", { status: 201 });
  } catch (err) {
    console.error("Group creation failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
