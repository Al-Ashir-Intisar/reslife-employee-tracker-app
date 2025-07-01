import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";

export const POST = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionUserId = session.user._id || session.user.id;

  try {
    const { groupId, userId, description, deadline } = await req.json();

    // Validate
    if (!groupId || !userId || !description || !deadline)
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );

    // Auth: session user must be assigning to themselves or be group admin
    await connect();
    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ message: "Group not found" }, { status: 404 });

    // Must be self or admin
    const isSelf = userId === sessionUserId;
    const isAdmin = group.adminIds
      .map((id) => id.toString())
      .includes(sessionUserId);
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: not self or admin" },
        { status: 403 }
      );
    }

    // If no membership, create it if user is a member
    let membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );

    if (!membership) {
      let membershipDefault = {
        groupId: group._id,
        role: "",
        certifications: [],
        customAttributes: [],
        workShifts: [],
        tasks: [],
        addedBy: new mongoose.Types.ObjectId(sessionUserId),
        addedAt: new Date(),
        _id: new mongoose.Types.ObjectId(), // Explicit subdoc _id
      };
      user.groupMemberships.push(membershipDefault);
      membership = user.groupMemberships[user.groupMemberships.length - 1];
    }

    // Add task
    const newTask = {
      description,
      deadline: new Date(deadline),
      assignedBy: new mongoose.Types.ObjectId(sessionUserId),
      assignedAt: new Date(),
      completed: false,
    };
    if (!membership.tasks) membership.tasks = [];
    membership.tasks.push(newTask);

    user.markModified("groupMemberships");
    await user.save();

    return NextResponse.json({ message: "Task assigned!" }, { status: 200 });
  } catch (err) {
    console.error("Error assigning task:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const PATCH = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionUserId = session.user._id || session.user.id;

  try {
    const { groupId, userId, taskId, completed } = await req.json();

    if (!groupId || !userId || !taskId)
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );

    await connect();
    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ message: "Group not found" }, { status: 404 });

    const isSelf = userId === sessionUserId;
    const isAdmin = group.adminIds
      .map((id) => id.toString())
      .includes(sessionUserId);
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: not self or admin" },
        { status: 403 }
      );
    }

    let membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );
    if (!membership || !membership.tasks)
      return NextResponse.json({ message: "Task not found" }, { status: 404 });

    const task = membership.tasks.find(
      (t) => t._id && t._id.toString() === taskId
    );
    if (!task)
      return NextResponse.json({ message: "Task not found" }, { status: 404 });

    task.completed = !!completed;
    user.markModified("groupMemberships");
    await user.save();
    return NextResponse.json({ message: "Task updated!" }, { status: 200 });
  } catch (err) {
    console.error("Error updating task:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};

export const DELETE = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionUserId = session.user._id || session.user.id;

  try {
    const { groupId, userId, taskId } = await req.json();

    if (!groupId || !userId || !taskId)
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );

    await connect();
    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const group = await Group.findById(groupId);
    if (!group)
      return NextResponse.json({ message: "Group not found" }, { status: 404 });

    const isSelf = userId === sessionUserId;
    const isAdmin = group.adminIds
      .map((id) => id.toString())
      .includes(sessionUserId);
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: not self or admin" },
        { status: 403 }
      );
    }

    let membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );
    if (!membership || !membership.tasks)
      return NextResponse.json({ message: "Task not found" }, { status: 404 });

    const prevLength = membership.tasks.length;
    membership.tasks = membership.tasks.filter(
      (t) => !(t._id && t._id.toString() === taskId)
    );
    if (membership.tasks.length === prevLength)
      return NextResponse.json({ message: "Task not found" }, { status: 404 });

    user.markModified("groupMemberships");
    await user.save();
    return NextResponse.json({ message: "Task deleted!" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting task:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};
