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
  const sessionUserId = session.user._id || session.user.id;

  try {
    const { groupId, tasks } = await req.json();
    if (!groupId || !tasks?.length)
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );

    await connect();
    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ message: "Group not found" }, { status: 404 });

    // Only admin can assign tasks
    const isAdmin = group.adminIds
      .map((id) => id.toString())
      .includes(sessionUserId);
    if (!isAdmin)
      return NextResponse.json(
        { message: "Forbidden: not admin" },
        { status: 403 }
      );

    // For each user, assign the task
    for (const { userId, task } of tasks) {
      const user = await User.findById(userId);
      if (!user) continue;
      let membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership) {
        if (!group.membersId.map((id) => id.toString()).includes(userId))
          continue;
        membership = {
          groupId: group._id,
          role: "",
          certifications: [],
          customAttributes: [],
          workShifts: [],
          tasks: [],
          addedBy: new mongoose.Types.ObjectId(sessionUserId),
          addedAt: new Date(),
          _id: new mongoose.Types.ObjectId(),
        };
        user.groupMemberships.push(membership);
        membership = user.groupMemberships[user.groupMemberships.length - 1];
      }
      if (!membership.tasks) membership.tasks = [];
      membership.tasks.push({
        description: task.description,
        deadline: new Date(task.deadline),
        assignedBy: new mongoose.Types.ObjectId(sessionUserId),
        assignedAt: new Date(),
        completed: false,
      });
      user.markModified("groupMemberships");
      await user.save();
    }

    return NextResponse.json({ message: "Tasks assigned!" }, { status: 200 });
  } catch (err) {
    console.error("Bulk assign tasks error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};
