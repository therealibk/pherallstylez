import type { PolicyType } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { RichTextContent } from "@/components/public/rich-text-content";

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
      <div className="mt-8 text-sm leading-relaxed text-foreground/90 [&_p]:mb-3 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground">
        {policy.content ? (
          <RichTextContent content={policy.content} />
        ) : (
          <p className="text-muted-foreground">No content available yet.</p>
        )}
      </div>
    </section>
  );
}
