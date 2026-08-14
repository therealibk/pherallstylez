import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar displayName={displayName} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader displayName={displayName} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
