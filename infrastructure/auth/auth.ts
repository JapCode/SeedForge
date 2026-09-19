import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/drizzle/client";
import * as authSchema from "./auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // account: {
  //   accountLinking: {
  //     enabled: true,
  //     trustedProviders: ["google"],
  //     requireLocalEmailVerified: false,
  //   },
  // },
  // Google OAuth is only enabled once GOOGLE_CLIENT_ID and
  // GOOGLE_CLIENT_SECRET are present in the environment.
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
});
