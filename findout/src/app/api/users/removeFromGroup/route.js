// /api/users/removeFromGroup/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";

export const DELETE = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { groupId, memberId } = await req.json();
  if (!groupId || !memberId) {
    return NextResponse.json(
      { message: "Missing groupId or memberId" },
      { status: 400 }
    );
  }

  await connect();

  try {
    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ message: "Group not found" }, { status: 404 });

    // Check if session user is an admin
    const isAdmin = group.adminIds.some(
      (id) => id.toString() === session.user._id
    );

    // Check if the session user is the user to be removed
    const isSameUser = session.user._id === memberId;


    if (!isAdmin || !isSameUser) {
      return NextResponse.json(
        { message: "Forbidden: Session user is not an admin of this group nor is the owner of this profile" },
        { status: 403 }
      );
    }

    // Prevent removing the group owner
    if (group.ownerId.toString() === memberId) {
      return NextResponse.json(
        { message: "Cannot remove the group owner." },
        { status: 403 }
      );
    }

    const user = await User.findById(memberId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    // Remove group membership from user
    user.groupMemberships = user.groupMemberships.filter(
      (gm) => gm.groupId.toString() !== groupId
    );

    // Remove groupId from user.groupIds
    user.groupIds = user.groupIds.filter((id) => id.toString() !== groupId);
    await user.save();

    // Remove user from group's members/admins
    group.membersId = group.membersId.filter(
      (id) => id.toString() !== memberId
    );
    group.adminIds = group.adminIds.filter((id) => id.toString() !== memberId);
    await group.save();

    return NextResponse.json(
      { message: "User removed from group" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error removing user from group:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};
