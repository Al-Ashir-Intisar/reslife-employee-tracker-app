import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export const POST = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { ids } = await req.json();

  await connect();

  // Convert strings to ObjectId
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  const groups = await Group.find({ _id: { $in: objectIds } });
  return new NextResponse(JSON.stringify(groups), { status: 200 });
};
