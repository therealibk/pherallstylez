import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  const displayName = session.user?.name ?? session.user?.email ?? "Admin";

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r px-4 py-6 flex flex-col gap-1 shrink-0">
        <p className="text-sm font-semibold px-2 mb-4">Pherall Admin</p>

        <nav className="flex-1 space-y-1 text-sm">
          <Link
            href="/admin/dashboard"
            className="block px-2 py-1.5 rounded hover:bg-accent"
          >
            Dashboard
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t space-y-2">
          <p className="px-2 text-xs text-muted-foreground truncate">
            {displayName}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
