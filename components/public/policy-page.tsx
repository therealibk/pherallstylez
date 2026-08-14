import type { PolicyType } from "@/lib/generated/prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { RichTextContent } from "@/components/public/rich-text-content";

interface Props {
  type: PolicyType;
}

export async function PolicyPageContent({ type }: Props) {
  const policy = await db.policy.findUnique({ where: { type } });

  if (!policy || !policy.published) {
    return (
      <div>
        <div style={{ background: "var(--secondary,#f5f5f5)" }}>
          <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
            <h1
              className="text-4xl font-semibold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              Policy Not Available
            </h1>
            <p className="mt-4 text-muted-foreground">
              This policy is not currently published.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const updatedDate = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(policy.updatedAt);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-3xl mx-auto px-6 py-14 md:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Home
          </Link>
          <h1
            className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {policy.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Version {policy.version} · Last updated {updatedDate}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="prose-sm max-w-none [&_p]:mb-3 [&_p]:leading-relaxed [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-4 [&_li]:mb-1.5 [&_li]:leading-relaxed [&_a]:underline [&_a]:underline-offset-4">
          {policy.content ? (
            <RichTextContent content={policy.content} />
          ) : (
            <p className="text-muted-foreground">No content available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
