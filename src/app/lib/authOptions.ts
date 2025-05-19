import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";
import dbConnect from "@/app/lib/mongodb"; // chemin à adapter selon ta structure
import User from "@/app/models/User"; // idem, adapte selon ton fichier User.ts ou User.js
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  // autres propriétés si nécessaire
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null;

        await dbConnect();

        const user = (await User.findOne({
          email: credentials.email,
        })) as IUser | null;
        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
