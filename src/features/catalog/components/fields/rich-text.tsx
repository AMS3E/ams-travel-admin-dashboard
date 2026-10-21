"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Bold, Check, Heading2, Italic, Link2, List, ListOrdered, Redo2, Undo2, Unlink, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/*
 * A long text written with a toolbar — bold, italic, a heading, lists, links —
 * and kept as Markdown, which is what the app draws. The form holds the
 * Markdown string; this box shows it formatted and hands back Markdown on
 * every change. Plain text already in a record is Markdown as it is.
 */

interface RichTextProps {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (markdown: string) => void;
  readonly onBlur?: () => void;
  readonly describedBy?: string;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
}

interface ToolProps {
  readonly label: string;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly children: ReactNode;
}

/** One toolbar button. Pressing it keeps the text's focus and selection, so the command lands where the writer is. */
function Tool({ label, active = false, disabled = false, onPress, children }: ToolProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-7 place-items-center rounded-md text-ink-soft transition-colors hover:bg-sand hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-teal-soft text-teal",
      )}
      disabled={disabled}
      onClick={onPress}
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export default function RichText({ id, value, onChange, onBlur, describedBy, invalid = false, disabled = false, placeholder }: RichTextProps) {
  /* The Markdown this box last handed out, so a value coming back from the form is not re-set under the writer's hands. */
  const t = useTranslations("forms.richText");
  const written = useRef(value);
  /* The link being typed; null while the little box is closed. */
  const [link, setLink] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        code: false,
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: "min-h-40 px-3 py-2 text-sm leading-relaxed text-ink outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      const markdown = current.getMarkdown();
      written.current = markdown;
      onChange(markdown);
    },
    onBlur: () => onBlur?.(),
  });

  /* The form's value changed from outside — a record loaded, a reset — so show it. */
  useEffect(() => {
    if (!editor || value === written.current) return;
    written.current = value;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            heading: current.isActive("heading", { level: 2 }),
            bullets: current.isActive("bulletList"),
            numbers: current.isActive("orderedList"),
            link: current.isActive("link"),
            canUndo: current.can().undo(),
            canRedo: current.can().redo(),
          }
        : null,
  });

  function openLink() {
    if (!editor) return;
    if (state?.link) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const current = editor.getAttributes("link").href;
    setLink(typeof current === "string" ? current : "");
  }

  function applyLink() {
    if (!editor || link === null) return;
    const href = link.trim();
    if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLink(null);
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-paper shadow-xs transition-[color,box-shadow] focus-within:ring-2 focus-within:ring-teal/30",
        invalid ? "border-heritage" : "border-line-strong",
        disabled && "opacity-60",
      )}
    >
      <div aria-label={t("toolbar")} className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1" role="toolbar">
        <Tool active={state?.bold} disabled={disabled} label={t("bold")} onPress={() => editor?.chain().focus().toggleBold().run()}>
          <Bold aria-hidden className="size-3.5" />
        </Tool>
        <Tool active={state?.italic} disabled={disabled} label={t("italic")} onPress={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic aria-hidden className="size-3.5" />
        </Tool>
        <Tool active={state?.heading} disabled={disabled} label={t("heading")} onPress={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 aria-hidden className="size-3.5" />
        </Tool>
        <span aria-hidden className="mx-1 h-4 w-px bg-line" />
        <Tool active={state?.bullets} disabled={disabled} label={t("bullets")} onPress={() => editor?.chain().focus().toggleBulletList().run()}>
          <List aria-hidden className="size-3.5" />
        </Tool>
        <Tool active={state?.numbers} disabled={disabled} label={t("numbers")} onPress={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered aria-hidden className="size-3.5" />
        </Tool>
        <span aria-hidden className="mx-1 h-4 w-px bg-line" />
        <Tool active={state?.link} disabled={disabled} label={state?.link ? t("removeLink") : t("link")} onPress={openLink}>
          {state?.link ? <Unlink aria-hidden className="size-3.5" /> : <Link2 aria-hidden className="size-3.5" />}
        </Tool>
        <span className="flex-1" />
        <Tool disabled={disabled || !state?.canUndo} label={t("undo")} onPress={() => editor?.chain().focus().undo().run()}>
          <Undo2 aria-hidden className="size-3.5" />
        </Tool>
        <Tool disabled={disabled || !state?.canRedo} label={t("redo")} onPress={() => editor?.chain().focus().redo().run()}>
          <Redo2 aria-hidden className="size-3.5" />
        </Tool>
      </div>

      {link !== null ? (
        <div className="flex items-center gap-1.5 border-b border-line bg-sand px-2 py-1.5">
          <Input
            aria-label={t("linkAddress")}
            autoFocus
            className="h-7 flex-1 text-xs"
            inputMode="url"
            onChange={(event) => setLink(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") setLink(null);
            }}
            placeholder="https://…"
            value={link}
          />
          <button aria-label={t("addLink")} className="grid size-7 place-items-center rounded-md text-teal hover:bg-teal-soft" onClick={applyLink} type="button">
            <Check aria-hidden className="size-3.5" />
          </button>
          <button aria-label={t("cancel")} className="grid size-7 place-items-center rounded-md text-muted hover:bg-sand-deep" onClick={() => setLink(null)} type="button">
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : null}

      <EditorContent
        className="[&_.tiptap_a]:text-teal [&_.tiptap_a]:underline [&_.tiptap_blockquote]:border-l-2 [&_.tiptap_blockquote]:border-line-strong [&_.tiptap_blockquote]:pl-3 [&_.tiptap_h2]:text-base [&_.tiptap_h2]:font-semibold [&_.tiptap_h3]:text-sm [&_.tiptap_h3]:font-semibold [&_.tiptap_li+li]:mt-0.5 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_p+p]:mt-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul+p]:mt-2 [&_.tiptap_ol+p]:mt-2 [&_.tiptap_p+ul]:mt-2 [&_.tiptap_p+ol]:mt-2 [&_.tiptap_h2+p]:mt-1 [&_.tiptap_p+h2]:mt-3"
        editor={editor}
      />
    </div>
  );
}
