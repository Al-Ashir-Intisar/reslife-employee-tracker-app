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
      if (!group.memberIds.map((id) => id.toString()).includes(userId)) {
        return NextResponse.json(
          { message: "User is not a member of this group" },
          { status: 403 }
        );
      }
      // If so, create groupMembership for this user/group
      membership = {
        groupId: group._id,
        role: "",
        certifications: [],
        customAttributes: [],
        workShifts: [],
      };
      user.groupMemberships.push(membership);
      // Now membership points to the in-memory object, so further code will work
      membership = user.groupMemberships[user.groupMemberships.length - 1];
    }

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
