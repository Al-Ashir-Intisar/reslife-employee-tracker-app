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

  try {
    const { groupId, memberId, type, itemIds } = await req.json();

    if (!groupId || !memberId || !type || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { message: "Missing or invalid fields" },
        { status: 400 }
      );
    }

    await connect();

    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ message: "Group not found" }, { status: 404 });

    const isAdmin = group.adminIds.some(
      (id) => id.toString() === session.user._id
    );
    if (!isAdmin)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const user = await User.findById(memberId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const membership = user.groupMemberships.find(
      (gm) => gm.groupId.toString() === groupId
    );
    if (!membership)
      return NextResponse.json({ message: "Membership not found" }, { status: 404 });

    if (type === "certification") {
      membership.certifications = membership.certifications.filter(
        (c) => !itemIds.includes(c._id.toString())
      );
    } else if (type === "customAttribute") {
      membership.customAttributes = membership.customAttributes.filter(
        (a) => !itemIds.includes(a._id.toString())
      );
    } else {
      return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    await user.save();

    return NextResponse.json({ message: "Items deleted" }, { status: 200 });
  } catch (err) {
    console.error("Bulk delete error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
