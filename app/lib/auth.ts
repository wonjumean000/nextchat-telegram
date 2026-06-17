import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const VALID_USERS = [
  { email: "admin@nextchat.com", password: "admin123", name: "Admin" },
  { email: "user1@nextchat.com", password: "user123", name: "User1" },
  { email: "user2@nextchat.com", password: "user456", name: "User2" },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = VALID_USERS.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password,
        );

        if (user) {
          return {
            id: user.email,
            email: user.email,
            name: user.name,
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
