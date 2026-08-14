import { parseRichText, isSafeUrl, type TipTapNode, type TipTapMark } from "@/lib/rich-text";

// ── Mark application ──────────────────────────────────────────────────────────

function applyMarks(content: React.ReactNode, marks: TipTapMark[], keyPrefix: string): React.ReactNode {
  let node = content;
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    const key = `${keyPrefix}-m${i}`;
    switch (mark.type) {
      case "bold":
        node = <strong key={key}>{node}</strong>;
        break;
      case "italic":
        node = <em key={key}>{node}</em>;
        break;
      case "underline":
        node = <u key={key}>{node}</u>;
        break;
      case "strike":
        node = <s key={key}>{node}</s>;
        break;
      case "code":
        node = <code key={key} className="rounded bg-muted px-1 py-0.5 text-sm font-mono">{node}</code>;
        break;
      case "link": {
        const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "#";
        // Only render safe URLs — silently degrade to plain text for unsafe ones
        if (!isSafeUrl(href)) { break; }
        const target = mark.attrs?.target === "_blank" ? "_blank" : undefined;
        const rel = target ? "noopener noreferrer" : undefined;
        node = (
          <a key={key} href={href} target={target} rel={rel} className="underline underline-offset-2 hover:opacity-80">
            {node}
          </a>
        );
        break;
      }
    }
  }
  return node;
}

// ── Node renderer ─────────────────────────────────────────────────────────────

function renderNode(node: TipTapNode, keyPrefix: string): React.ReactNode {
  const children = node.content?.map((child, i) => renderNode(child, `${keyPrefix}-${i}`));

  // Resolve text-align from attrs
  const align = typeof node.attrs?.textAlign === "string" ? node.attrs.textAlign : undefined;
  const alignStyle = align && align !== "left" ? { textAlign: align as React.CSSProperties["textAlign"] } : undefined;

  switch (node.type) {
    case "doc":
      return <>{children}</>;

    case "paragraph":
      return (
        <p key={keyPrefix} style={alignStyle}>
          {children?.length ? children : null}
        </p>
      );

    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 2;
      const Tag = `h${Math.min(Math.max(level, 1), 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Tag key={keyPrefix} style={alignStyle}>{children}</Tag>;
    }

    case "bulletList":
      return <ul key={keyPrefix}>{children}</ul>;

    case "orderedList":
      return <ol key={keyPrefix}>{children}</ol>;

    case "listItem":
      return <li key={keyPrefix}>{children}</li>;

    case "blockquote":
      return <blockquote key={keyPrefix}>{children}</blockquote>;

    case "horizontalRule":
      return <hr key={keyPrefix} />;

    case "hardBreak":
      return <br key={keyPrefix} />;

    case "codeBlock":
      return (
        <pre key={keyPrefix} className="rounded bg-muted p-4 overflow-x-auto text-sm font-mono">
          <code>{children}</code>
        </pre>
      );

    case "text": {
      const text = node.text ?? "";
      if (!node.marks || node.marks.length === 0) return text;
      return applyMarks(text, node.marks, keyPrefix);
    }

    default:
      // Unknown node type — render children if any, otherwise nothing
      return children ? <>{children}</> : null;
  }
}

// ── Plain text fallback ───────────────────────────────────────────────────────

function PlainTextContent({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {p}
        </p>
      ))}
    </>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  className?: string;
}

/**
 * Safely renders rich text content stored as either:
 *   - a serialised TipTap JSON document (new content)
 *   - plain text with \n\n paragraph breaks (legacy content)
 *
 * Never uses dangerouslySetInnerHTML. Link URLs are validated against a safe
 * allowlist (https, http, mailto, tel); unsafe URLs are silently degraded to
 * plain text.
 */
export function RichTextContent({ content, className }: Props) {
  if (!content?.trim()) return null;

  const doc = parseRichText(content);

  return (
    <div className={className}>
      {doc ? renderNode(doc, "root") : <PlainTextContent content={content} />}
    </div>
  );
}
