import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r px-4 py-6 flex flex-col gap-1 shrink-0">
        <p className="text-sm font-semibold px-2 mb-4">Pherall Admin</p>
        <nav className="space-y-1 text-sm">
          <a
            href="/admin/dashboard"
            className="block px-2 py-1.5 rounded hover:bg-accent"
          >
            Dashboard
          </a>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
