import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify";

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number; // epoch seconds
    error?: "RefreshFailed";
  }
}

declare module "next-auth" {
  interface Session {
    error?: "RefreshFailed";
  }
}

// Exchange the refresh token for a new access token. Returns the token
// unchanged if it is still valid for at least another minute.
export async function ensureFreshToken(token: JWT): Promise<JWT> {
  if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) return token;
  if (!token.refreshToken) return { ...token, error: "RefreshFailed" };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    }),
  });
  const body = await res.json();
  if (!res.ok) return { ...token, error: "RefreshFailed" };

  return {
    ...token,
    accessToken: body.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + body.expires_in,
    // Google only sometimes rotates the refresh token.
    refreshToken: body.refresh_token ?? token.refreshToken,
    error: undefined,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Runs locally only, so trust the localhost Host header (also under `next start`).
  trustHost: true,
  providers: [
    Google({
      authorization: {
        params: {
          scope: `openid email profile ${GMAIL_SCOPE}`,
          access_type: "offline",
          // Always show the account chooser, then re-consent so Google returns a refresh token.
          prompt: "select_account consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }
      return ensureFreshToken(token);
    },
    // Tokens stay in the encrypted cookie and are never sent to the browser.
    async session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
});
