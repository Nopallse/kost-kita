import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Full Name", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password, name } = parsed.data;

        let user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user) {
          // Instant registration with any email (no email verification needed)
          const hashedPassword = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              name: name || email.split("@")[0],
              password: hashedPassword,
              emailVerified: new Date(),
            },
          });
          return user;
        }

        if (user.password) {
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return null;
          }
        }

        return user;
      },
    }),
  ],
});
