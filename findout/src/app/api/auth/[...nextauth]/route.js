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
          if (isPasswordValid)
            return {
              id: user._id,
              name: user.name,
              email: user.email,
            };
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

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // console.log("🔐 signIn callback hit");
        // console.log("🧑 user:", user);
        // console.log("🔗 account:", account);

        if (account.provider === "google") {
          await connect();
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // console.log("🆕 Creating new Google user:", user.email);

            const randomPassword = Math.random().toString(36).slice(-8); // 8+ chars
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            await User.create({
              name: user.name ?? "GoogleUser",
              email: user.email,
              password: hashedPassword, // ✅ satisfies schema
              groupsIds: [],
            });
          }
        }

        return true;
      } catch (err) {
        console.error("❌ Error in signIn callback:");
        return false;
      }
    },

    async session({ session }) {
      await connect();
      const dbUser = await User.findOne({ email: session.user.email });
      if (dbUser) {
        session.user._id = dbUser._id.toString();
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
