import { Suspense } from "react";
import { connection } from "next/server";
import { auth, signIn, signOut } from "@/auth";
import { Cleaner } from "@/components/Cleaner";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Email Cleaner</h1>
        <p className="text-sm text-zinc-500">
          Find old or unwanted Gmail messages with custom filters and move them to Trash in bulk.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <AuthGate />
      </Suspense>
    </main>
  );
}

async function AuthGate() {
  // auth() uses crypto.getRandomValues() before reading headers, so opt into
  // request-time rendering first or prerendering flags it as unstable.
  await connection();
  const session = await auth();

  if (!session?.user || session.error) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        {session?.error && (
          <p className="mb-3 text-sm text-red-600">Your Google session expired. Please sign in again.</p>
        )}
        <button className="hover:cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          Sign in with Google
        </button>
      </form>
    );
  }

  return (
    <>
      <form
        className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <span>
          Signed in as <strong>{session.user.email}</strong>
        </span>
        <button className="text-zinc-500 underline hover:cursor-pointer">Sign out</button>
      </form>
      <Cleaner />
    </>
  );
}
