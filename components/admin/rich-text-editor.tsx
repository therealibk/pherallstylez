"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { isRichTextJson, type TipTapNode } from "@/lib/rich-text";

// Convert stored TipTap JSON to HTML so existing content loads correctly in TinyMCE.
// Uses the same logic as the public RichTextContent renderer, producing plain HTML strings.
function tipTapNodeToHtml(node: TipTapNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(tipTapNodeToHtml).join("");

    case "paragraph": {
      const inner = (node.content ?? []).map(tipTapNodeToHtml).join("");
      const align = node.attrs?.textAlign as string | undefined;
      const style = align && align !== "left" ? ` style="text-align:${align}"` : "";
      return `<p${style}>${inner || "&nbsp;"}</p>`;
    }

    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      const inner = (node.content ?? []).map(tipTapNodeToHtml).join("");
      const align = node.attrs?.textAlign as string | undefined;
      const style = align && align !== "left" ? ` style="text-align:${align}"` : "";
      return `<h${level}${style}>${inner}</h${level}>`;
    }

    case "bulletList":
      return `<ul>${(node.content ?? []).map(tipTapNodeToHtml).join("")}</ul>`;

    case "orderedList":
      return `<ol>${(node.content ?? []).map(tipTapNodeToHtml).join("")}</ol>`;

    case "listItem":
      return `<li>${(node.content ?? []).map(tipTapNodeToHtml).join("")}</li>`;

    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(tipTapNodeToHtml).join("")}</blockquote>`;

    case "hardBreak":
      return "<br>";

    case "horizontalRule":
      return "<hr>";

    case "codeBlock":
      return `<pre><code>${(node.content ?? []).map(tipTapNodeToHtml).join("")}</code></pre>`;

    case "text": {
      let text = (node.text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case "bold":      text = `<strong>${text}</strong>`; break;
          case "italic":    text = `<em>${text}</em>`; break;
          case "underline": text = `<u>${text}</u>`; break;
          case "strike":    text = `<s>${text}</s>`; break;
          case "code":      text = `<code>${text}</code>`; break;
          case "link": {
            const href = String(mark.attrs?.["href"] ?? "");
            if (href) text = `<a href="${href.replace(/"/g, "&quot;")}">${text}</a>`;
            break;
          }
        }
      }
      return text;
    }

    default:
      return (node.content ?? []).map(tipTapNodeToHtml).join("");
  }
}

function toHtml(value: string): string {
  if (!value) return "";
  if (isRichTextJson(value)) {
    try {
      const doc = JSON.parse(value) as TipTapNode;
      return tipTapNodeToHtml(doc);
    } catch {
      return value;
    }
  }
  return value; // already HTML or plain text
}

// TinyMCE Editor loaded client-only (no SSR)
const Editor = dynamic(
  () => import("@tinymce/tinymce-react").then((m) => m.Editor),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-md border bg-muted" /> },
);

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 240 }: Props) {
  // Convert TipTap JSON → HTML on first render only
  const initialHtml = useRef(toHtml(value));

  return (
    <Editor
      apiKey="vtq4nqxpdel8o23pkiuuxzo453rilexchls7aswoo0h0jms2"
      initialValue={initialHtml.current}
      onEditorChange={(content) => onChange(content)}
      init={{
        height: minHeight,
        menubar: false,
        branding: false,
        promotion: false,
        plugins: [
          "advlist", "autolink", "lists", "link", "charmap",
          "searchreplace", "visualblocks", "code",
          "insertdatetime", "table", "wordcount",
        ],
        toolbar:
          "undo redo | styles | bold italic underline | " +
          "alignleft aligncenter alignright | " +
          "bullist numlist | link | removeformat | code",
        placeholder: placeholder ?? "Start typing…",
        content_style:
          "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #374151; }",
        skin: "oxide",
      }}
    />
  );
}
