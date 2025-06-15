import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { getServerSession } from "next-auth";


export const GET = async (request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized Request", { status: 401 });
  }

  try {
    await connect();
    const groups = await Group.find();

    return new NextResponse(JSON.stringify(groups), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return new NextResponse("Database Error!", { status: 500 });
  }
};
