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

    await connect().catch((err) => {
      console.error("DB connect error:", err);
      throw err;
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return new NextResponse("User created successfully", { status: 201 });
  } catch (error) {
    console.error("Registration route error:", error); // <-- SEE THIS IN TERMINAL
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

