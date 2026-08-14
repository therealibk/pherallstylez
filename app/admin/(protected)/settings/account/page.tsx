import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { getAccountData } from "@/lib/actions/account";
import { ProfileForm } from "@/components/admin/settings/profile-form";
import { PasswordForm } from "@/components/admin/settings/password-form";

export const metadata: Metadata = {
  title: "Account Settings — Pherall Admin",
};

export default async function AccountSettingsPage() {
  const account = await getAccountData();

  if (!account) {
    redirect("/admin/login");
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-10">
      <PageHeader
        title="Account"
        description="Update your personal administrator details and password."
      />

      {/* Profile */}
      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-base font-semibold mb-1">
          Profile
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Update your administrator name and email address.
        </p>
        <div className="rounded-xl border border-border bg-card p-5">
          <ProfileForm initialName={account.name} initialEmail={account.email} />
        </div>
      </section>

      {/* Password */}
      <section aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-base font-semibold mb-1">
          Change password
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Update your password to keep your account secure.
        </p>
        <div className="rounded-xl border border-border bg-card p-5">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
