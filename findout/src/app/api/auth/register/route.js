import { NextResponse } from "next/server";
import connect from "@/utils/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const POST = async (request) => {
  try {
    const { name, email, password, confirmPassword } = await request.json();

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    await connect();

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return new NextResponse(
        "User with this email already exists. Try a different email OR",
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return new NextResponse("User created successfully", { status: 201 });
  } catch (error) {
    console.error("Registration route error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};
