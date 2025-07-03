import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export const PATCH = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { groupId, announcement } = await req.json();
  await connect();

  const group = await Group.findById(groupId);
  if (!group)
    return NextResponse.json({ message: "Group not found" }, { status: 404 });

  const sessionUserId = session.user._id;
  const isAdmin = group.adminIds.map(id => id.toString()).includes(sessionUserId);
  if (!isAdmin)
    return NextResponse.json({ message: "Forbidden: session user must be an admin of the group" }, { status: 403 });

  group.announcement = announcement;
  await group.save();

  return NextResponse.json({ message: "Announcement updated" }, { status: 200 });
};
