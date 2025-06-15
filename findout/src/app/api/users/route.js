import { NextResponse } from "next/server";
import connect from "@/utils/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const GET = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  await connect();

  if (email) {
    const user = await User.findOne({ email });
    return new NextResponse(JSON.stringify(user), { status: 200 });
  }

  return new NextResponse("Email not provided", { status: 400 });
};
