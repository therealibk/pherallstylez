"use server";

import { signOut } from "@/lib/auth";

export async function logout(): Promise<void> {
  // signOut internally throws a Next.js RedirectError — control does not return here
  await signOut({ redirectTo: "/admin/login" });
}
