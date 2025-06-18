import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const POST = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { name, description, membersId, ownerId, adminIds } =
      await req.json();

    await connect();

    const existing = await Group.findOne({ name });
    if (existing)
      return new NextResponse("Group name already exists", { status: 409 });

    const newGroup = new Group({
      name,
      description,
      membersId,
      ownerId,
      adminIds,
    });

    await newGroup.save();

    return new NextResponse("Group created successfully", { status: 201 });
  } catch (err) {
    console.error("Group creation failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
