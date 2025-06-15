// app/api/auth/[...nextauth]/route.js

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import connect from "@/utils/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      async authorize(credentials) {
        await connect();

        const user = await User.findOne({ email: credentials.email });
        if (user) {
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (isPasswordValid) return user;
          throw new Error("Invalid credentials");
        }
        throw new Error("No user found with this email");
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    error: "/dashboard/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
