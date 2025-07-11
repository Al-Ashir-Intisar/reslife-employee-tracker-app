import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connect from "@/utils/db";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";


// API route to start or end a work shift for a user in a group
export const POST = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionUserId = session.user._id;

  try {
    const {
      groupId,
      userId,
      // Start-shift fields:
      startTime,
      startLocation,
      estimatedDurationMinutes,
      // End-shift fields:
      actualEndTime,
      endLocation,
      taskIds, // Array of task IDs to associate with this shift
    } = await req.json();

    if (userId !== session.user._id?.toString()) {
      return NextResponse.json(
        { message: "Forbidden: user mismatch." },
        { status: 403 }
      );
    }

    if (!groupId || !userId) {
      return NextResponse.json(
        { message: "Missing group or user" },
        { status: 400 }
      );
    }

    await connect();
    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    // Find or create groupMembership for this user and group
    let membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );

    if (!membership) {
      // Check: is user a member of the group? (security)
      const Group =
        require("@/models/Group").default || require("@/models/Group");
      const group = await Group.findById(groupId);

      if (!group) {
        return NextResponse.json(
          { message: "Group not found" },
          { status: 404 }
        );
      }
      // Check if user is listed as a member of this group
      if (!group.membersId.map((id) => id.toString()).includes(userId)) {
        return NextResponse.json(
          { message: "User is not a member of this group" },
          { status: 403 }
        );
      }
      // If so, create groupMembership for this user/group
      let membershipDefault = {
        groupId: group._id,
        role: "",
        certifications: [],
        customAttributes: [],
        workShifts: [],
        tasks: [],
        addedBy: new mongoose.Types.ObjectId(sessionUserId),
        addedAt: new Date(),
      };
      user.groupMemberships.push(membershipDefault);
    }

    membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );

    // --- 1. END SHIFT: If ending shift ---
    if (actualEndTime && endLocation) {
      const workShifts = membership.workShifts || [];
      // Find last open shift
      const openIdx = workShifts.findIndex((ws) => !ws.actualEndTime);
      if (openIdx === -1) {
        return NextResponse.json(
          { message: "No open shift to end." },
          { status: 400 }
        );
      }

      // End the open shift
      workShifts[openIdx].actualEndTime = new Date(actualEndTime);
      workShifts[openIdx].endLocation = endLocation;
      user.markModified("groupMemberships");
      await user.save();
      return NextResponse.json({ message: "Shift ended!" }, { status: 200 });
    }

    // --- 2. START SHIFT: If starting shift ---
    if (!startTime || !startLocation || !estimatedDurationMinutes) {
      return NextResponse.json(
        { message: "Missing start shift fields." },
        { status: 400 }
      );
    }
    if (Number(estimatedDurationMinutes) > 300) {
      return NextResponse.json(
        { message: "Shift cannot be longer than 300 minutes." },
        { status: 400 }
      );
    }

    // Get the last shift
    const workShifts = membership.workShifts || [];
    const lastShift =
      workShifts.length > 0 ? workShifts[workShifts.length - 1] : null;

    // Auto-end previous shift if still open and estimatedEndTime has passed
    if (lastShift && !lastShift.actualEndTime && lastShift.estimatedEndTime) {
      if (new Date() > lastShift.estimatedEndTime) {
        lastShift.actualEndTime = lastShift.estimatedEndTime;
        lastShift.endLocation = null; // Optionally mark as auto-closed
      }
    }

    // Prevent overlapping
    if (lastShift) {
      const endTime = lastShift.actualEndTime || lastShift.estimatedEndTime;
      if (!endTime || new Date(startTime) < endTime) {
        return NextResponse.json(
          {
            message:
              "Previous shift not finished or overlaps new shift. Please wait.",
          },
          { status: 400 }
        );
      }
    }

    const newShift = {
      startTime: new Date(startTime),
      startLocation,
      estimatedEndTime: new Date(
        Date.now() + Number(estimatedDurationMinutes) * 60000
      ),
      actualEndTime: null,
      endLocation: null,
      taskIds: taskIds || [], // Initialize with empty array if not provided
      addedBy: new mongoose.Types.ObjectId(session.user._id),
      addedAt: new Date(),
    };

    if (!membership.workShifts) membership.workShifts = [];
    membership.workShifts.push(newShift);
    user.markModified("groupMemberships");
    await user.save();

    return NextResponse.json({ message: "Shift started!" }, { status: 200 });
  } catch (err) {
    console.error("Error starting/ending shift:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};

// api for deleting the shift
export const DELETE = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionUserId = session.user._id || session.user.id;

  try {
    const { groupId, userId, shiftId } = await req.json();

    if (!groupId || !userId || !shiftId)
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );

    if (userId !== sessionUserId) {
      return NextResponse.json(
        { message: "Forbidden: user mismatch." },
        { status: 403 }
      );
    }

    await connect();
    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );
    if (!membership)
      return NextResponse.json(
        { message: "Membership not found" },
        { status: 404 }
      );

    const prevLength = membership.workShifts.length;
    membership.workShifts = membership.workShifts.filter(
      (shift) => !(shift._id && shift._id.toString() === shiftId)
    );

    if (membership.workShifts.length === prevLength)
      return NextResponse.json({ message: "Shift not found" }, { status: 404 });

    user.markModified("groupMemberships");
    await user.save();

    return NextResponse.json({ message: "Shift removed!" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting shift:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};

// api for updating the shift tasks
export const PATCH = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const sessionUserId = session.user._id;

  try {
    const { groupId, userId, shiftId, taskIds } = await req.json();

    if (!groupId || !userId || !shiftId || !Array.isArray(taskIds))
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    if (userId !== sessionUserId) {
      return NextResponse.json(
        { message: "Forbidden: user mismatch." },
        { status: 403 }
      );
    }

    await connect();
    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const membership = user.groupMemberships.find(
      (m) => m.groupId.toString() === groupId
    );
    if (!membership)
      return NextResponse.json(
        { message: "Membership not found" },
        { status: 404 }
      );

    const shift = membership.workShifts.find(
      (shift) => shift._id && shift._id.toString() === shiftId
    );
    if (!shift)
      return NextResponse.json(
        { message: "Shift not found" },
        { status: 404 }
      );

    shift.taskIds = taskIds;
    user.markModified("groupMemberships");
    await user.save();

    return NextResponse.json({ message: "Shift tasks updated!" }, { status: 200 });
  } catch (err) {
    console.error("Error updating shift tasks:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
};
