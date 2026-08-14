"use client";

import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { isRichTextJson, isSafeUrl } from "@/lib/rich-text";

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface ToolbarBtnProps {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarBtn({ active, onClick, title, children, disabled }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={[
        "h-7 min-w-7 rounded px-1.5 text-sm font-medium transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-slate-700 text-white"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 inline-block h-5 w-px bg-slate-300 dark:bg-slate-600" />;
}

interface EditorInstance {
  chain: () => {
    focus: () => {
      toggleBold: () => { run: () => void };
      toggleItalic: () => { run: () => void };
      toggleUnderline: () => { run: () => void };
      toggleStrike: () => { run: () => void };
      toggleBulletList: () => { run: () => void };
      toggleOrderedList: () => { run: () => void };
      toggleBlockquote: () => { run: () => void };
      setTextAlign: (align: string) => { run: () => void };
      toggleHeading: (attrs: { level: number }) => { run: () => void };
      unsetAllMarks: () => { clearNodes: () => { run: () => void } };
    };
  };
  isActive: (nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>) => boolean;
  getAttributes: (name: string) => Record<string, unknown>;
  commands: {
    setLink: (attrs: { href: string; target: string; rel: string }) => void;
    unsetLink: () => void;
  };
}

function Toolbar({ editor }: { editor: EditorInstance | null }) {
  if (!editor) return null;

  function handleLink() {
    const prev = editor!.isActive("link") ? (editor!.getAttributes("link").href as string) : "";
    const url = window.prompt("Link URL", prev ?? "");
    if (url === null) return; // cancelled
    if (url === "") {
      editor!.commands.unsetLink();
      return;
    }
    if (!isSafeUrl(url)) {
      alert("Only https://, http://, mailto:, or tel: links are allowed.");
      return;
    }
    editor!.commands.setLink({ href: url, target: "_blank", rel: "noopener noreferrer" });
  }

  const c = editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
      {/* Headings */}
      <ToolbarBtn
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => c.toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarBtn>
      <ToolbarBtn
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => c.toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarBtn>

      <Divider />

      {/* Inline */}
      <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => c.toggleBold().run()}>
        <strong>B</strong>
      </ToolbarBtn>
      <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => c.toggleItalic().run()}>
        <em>I</em>
      </ToolbarBtn>
      <ToolbarBtn title="Underline" active={editor.isActive("underline")} onClick={() => c.toggleUnderline().run()}>
        <span className="underline">U</span>
      </ToolbarBtn>

      <Divider />

      {/* Lists */}
      <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => c.toggleBulletList().run()}>
        ≡
      </ToolbarBtn>
      <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => c.toggleOrderedList().run()}>
        1≡
      </ToolbarBtn>

      <Divider />

      {/* Link */}
      <ToolbarBtn title="Link" active={editor.isActive("link")} onClick={handleLink}>
        🔗
      </ToolbarBtn>

      <Divider />

      {/* Alignment */}
      <ToolbarBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => c.setTextAlign("left").run()}>
        ←
      </ToolbarBtn>
      <ToolbarBtn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => c.setTextAlign("center").run()}>
        ↔
      </ToolbarBtn>
      <ToolbarBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => c.setTextAlign("right").run()}>
        →
      </ToolbarBtn>

      <Divider />

      {/* Blockquote */}
      <ToolbarBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => c.toggleBlockquote().run()}>
        ❝
      </ToolbarBtn>

      <Divider />

      {/* Clear */}
      <ToolbarBtn title="Clear formatting" onClick={() => c.unsetAllMarks().clearNodes().run()}>
        ✕
      </ToolbarBtn>
    </div>
  );
}

// ── Main editor component ─────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function plainTextToDoc(text: string) {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return { type: "doc", content: [{ type: "paragraph" }] };

  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p }],
    })),
  };
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = "160px" }: Props) {
  const getInitialContent = useCallback(() => {
    if (!value) return { type: "doc", content: [{ type: "paragraph" }] };
    if (isRichTextJson(value)) return JSON.parse(value);
    return plainTextToDoc(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Start typing…" }),
    ],
    content: getInitialContent(),
    onUpdate({ editor: e }) {
      onChange(JSON.stringify(e.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external value changes (e.g. when parent resets the form)
  useEffect(() => {
    if (!editor) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const incomingJson = isRichTextJson(value) ? value : JSON.stringify(plainTextToDoc(value));
    if (currentJson !== incomingJson) {
      editor.commands.setContent(JSON.parse(incomingJson));
    }
  }, [value, editor]);

  return (
    <div className="rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring overflow-hidden">
      {/* Toolbar uses a cast because the editor type is complex; behaviour is verified at runtime */}
      <Toolbar editor={editor as unknown as EditorInstance | null} />
      <EditorContent editor={editor} />
    </div>
  );
}
