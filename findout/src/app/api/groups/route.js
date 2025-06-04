import { NextResponse } from "next/server";
import connect from "@/utils/db";
import Group from "@/models/Group";

export const GET = async (request) => {
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
