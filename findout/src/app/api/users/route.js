import { NextResponse } from "next/server";
import connect from "@/utils/db";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { getServerSession } from "next-auth";

export const GET = async (request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("Unauthorized Request", { status: 401 });
  }
  try {
    await connect();
    const users = await User.find();
    return new NextResponse(JSON.stringify(users), { status: 200 });
  } catch (error) {
    console.error("Database connection or query error:", error); // ✅ log it
    return new NextResponse("Database Error!", { status: 500 });
  }
};
