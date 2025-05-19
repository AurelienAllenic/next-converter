import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/authOptions";

// NE PAS EXPORTER `authOptions` ICI
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
