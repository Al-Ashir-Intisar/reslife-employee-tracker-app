import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import User from "@/models/User";
import Group from "@/models/Group";

export const PUT = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { groupId, pendingTaskChanges } = await req.json();
    const { edited = [], deleted = [] } = pendingTaskChanges;

    await connect();
    const group = await Group.findById(groupId);
    if (!group) return new NextResponse("Group not found", { status: 404 });

    const sessionUserId = session.user._id || session.user.id;
    const isAdmin = group.adminIds.some(
      (id) => id.toString() === sessionUserId.toString()
    );
    if (!isAdmin)
      return new NextResponse("Forbidden: not a group admin", { status: 403 });

    // Complete/incomplete (edit) tasks
    for (const { userId, taskId, completed } of edited) {
      const user = await User.findById(userId);
      if (!user) continue;
      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership || !membership.tasks) continue;
      const task = membership.tasks.find(
        (t) => t._id && t._id.toString() === taskId
      );
      if (!task) continue;
      task.completed = !!completed;
      user.markModified("groupMemberships");
      await user.save();
    }

    // Delete tasks
    for (const { userId, taskId } of deleted) {
      const user = await User.findById(userId);
      if (!user) continue;
      const membership = user.groupMemberships.find(
        (m) => m.groupId.toString() === groupId
      );
      if (!membership || !membership.tasks) continue;
      membership.tasks = membership.tasks.filter(
        (t) => !(t._id && t._id.toString() === taskId)
      );
      user.markModified("groupMemberships");
      await user.save();
    }

    return NextResponse.json({ message: "Tasks updated" }, { status: 200 });
  } catch (err) {
    console.error("Bulk update tasks error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
