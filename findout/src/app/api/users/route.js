import { NextResponse } from "next/server";
import connect from "@/utils/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

export const GET = async (req) => {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const id = searchParams.get("id");

  await connect();

  try {
    if (email) {
      const user = await User.findOne({ email });
      return new NextResponse(JSON.stringify(user), { status: 200 });
    }

    if (id) {
      // ✅ ensure valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return new NextResponse("Invalid user ID", { status: 400 });
      }

      const user = await User.findById(id);
      if (!user) return new NextResponse("User not found", { status: 404 });

      return new NextResponse(JSON.stringify(user), { status: 200 });
    }

    return new NextResponse("Missing query parameter", { status: 400 });
  } catch (err) {
    console.error("User fetch error:", err);
    return new NextResponse("Server error", { status: 500 });
  }
};
