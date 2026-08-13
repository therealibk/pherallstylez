import type { PolicyType } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";

interface Props {
  type: PolicyType;
}

export async function PolicyPageContent({ type }: Props) {
  const policy = await db.policy.findUnique({ where: { type } });

  if (!policy || !policy.published) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-24">
        <h1 className="text-3xl font-semibold tracking-tight">
          Policy Not Available
        </h1>
        <p className="mt-4 text-muted-foreground">
          This policy is not currently published.
        </p>
      </section>
    );
  }

  const paragraphs = policy.content
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter(Boolean);

  const updatedDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(policy.updatedAt);

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{policy.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Version {policy.version} · Last updated {updatedDate}
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))
        ) : (
          <p className="text-muted-foreground">No content available yet.</p>
        )}
      </div>
    </section>
  );
}
