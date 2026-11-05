// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { mergeAttributes } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Text from '@tiptap/extension-text';
import Typography from '@tiptap/extension-typography';
import { UndoRedo } from '@tiptap/extensions';
import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo2,
} from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

/**
 * One line of inline text, no paragraphs. Legacy CKEditor wrapped the text in `<p>` and then
 * stripped the first `<p>`/`</p>`; the backend strips any block tag that is left, so a stored
 * title or question is always inline HTML. Enter therefore does nothing here.
 */
const SingleLineDocument = Document.extend({ content: 'text*' });

/**
 * Strikethrough written as `<del>`: the backend keeps `del` but strips the `<s>` that Tiptap
 * (and legacy CKEditor) emit by default. Parsing still accepts `s`, `strike` and `del`.
 */
const DelStrike = Strike.extend({
  renderHTML({ HTMLAttributes }) {
    return ['del', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
});

/** Pasted lines become one line, separated by a space instead of running together. */
export function joinLines(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, ' ');
}

/**
 * Same for pasted HTML: block tags are unwrapped and each block end or line break becomes a
 * space. (A space left inside a block is trimmed by the clipboard parser.)
 */
export function joinBlocks(html: string): string {
  return html
    .replace(/<(?:p|div|li|h[1-6]|blockquote|tr)(?:\s[^>]*)?>/gi, '')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|tr)>|<br\s*\/?>/gi, ' ');
}

/** Legacy plugins: Bold, Italic, Strikethrough, Sub-/Superscript, Autoformat, TextTransformation, Undo. */
export const richTextExtensions = [
  SingleLineDocument,
  Text,
  Bold,
  Italic,
  DelStrike,
  Subscript,
  Superscript,
  // Stands in for CKEditor's TextTransformation (quotes, dashes, ellipsis, ©, ½, →).
  // Multiplication is off: "3x4" or "2x" in a language quiz is rarely meant as ×.
  Typography.configure({ multiplication: false }),
  UndoRedo,
];

type Props = {
  label: ReactNode;
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
};

type FormatState = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  superscript: boolean;
  subscript: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

function readFormatState(editor: Editor | null): FormatState {
  return {
    bold: editor?.isActive('bold') ?? false,
    italic: editor?.isActive('italic') ?? false,
    strike: editor?.isActive('strike') ?? false,
    superscript: editor?.isActive('superscript') ?? false,
    subscript: editor?.isActive('subscript') ?? false,
    canUndo: editor?.can().undo() ?? false,
    canRedo: editor?.can().redo() ?? false,
  };
}

/**
 * Port of legacy `lib/inline-editor.svelte` (CKEditor 5 balloon editor) on Tiptap. The
 * formatting buttons sit in a fixed bar above the text instead of a balloon that appears on
 * selection, so they can be found and reached with the keyboard and on touch screens.
 */
export function RichTextInput({ label, value, onChange, invalid, describedBy, className }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const labelId = `${id}-label`;
  const editorId = `${id}-editor`;

  const editor = useEditor({
    extensions: richTextExtensions,
    content: value,
    editorProps: {
      transformPastedText: joinLines,
      transformPastedHTML: joinBlocks,
      attributes: {
        id: editorId,
        role: 'textbox',
        'aria-multiline': 'false',
        'aria-labelledby': labelId,
        'aria-invalid': invalid ? 'true' : 'false',
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        class:
          'min-h-11 w-full min-w-0 px-3 py-2.5 text-base outline-none md:text-sm [&_del]:line-through',
      },
    },
    // useEditor re-applies these options on every render and always calls the latest
    // onUpdate, so aria-invalid and onChange stay current without extra effects.
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
  });

  // The value can change from outside (undoing a deleted question, loading a saved quiz).
  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const state = useEditorState({ editor, selector: ({ editor: e }) => readFormatState(e) });

  const marks = [
    {
      key: 'bold',
      icon: BoldIcon,
      label: t('editor.formatting.bold'),
      toggle: (e: Editor) => e.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      icon: ItalicIcon,
      label: t('editor.formatting.italic'),
      toggle: (e: Editor) => e.chain().focus().toggleItalic().run(),
    },
    {
      key: 'strike',
      icon: Strikethrough,
      label: t('editor.formatting.strikethrough'),
      toggle: (e: Editor) => e.chain().focus().toggleStrike().run(),
    },
    {
      key: 'superscript',
      icon: SuperscriptIcon,
      label: t('editor.formatting.superscript'),
      toggle: (e: Editor) => e.chain().focus().toggleSuperscript().run(),
    },
    {
      key: 'subscript',
      icon: SubscriptIcon,
      label: t('editor.formatting.subscript'),
      toggle: (e: Editor) => e.chain().focus().toggleSubscript().run(),
    },
  ] as const;

  // ARIA toolbar pattern: one Tab stop, arrow keys (and Home/End) move between the buttons.
  // Disabled buttons (undo/redo with nothing to undo) are skipped.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState(0);
  const onToolbarKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key) || !toolbarRef.current) return;
    const buttons = [...toolbarRef.current.querySelectorAll<HTMLButtonElement>('button')];
    const enabled = buttons.filter((button) => !button.disabled);
    const current = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const next = {
      ArrowLeft: (current - 1 + enabled.length) % enabled.length,
      ArrowRight: (current + 1) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    }[event.key as 'ArrowLeft'];
    const target = enabled[next];
    if (!target) return;
    event.preventDefault();
    setActiveTool(buttons.indexOf(target));
    target.focus();
  };
  // Undo and redo are the last two buttons; if the roving stop is disabled, fall back to Bold.
  const undoIndex = marks.length;
  const rovingIndex =
    (activeTool === undoIndex && !state?.canUndo) ||
    (activeTool === undoIndex + 1 && !state?.canRedo)
      ? 0
      : activeTool;
  const toolProps = (index: number) => ({
    tabIndex: index === rovingIndex ? 0 : -1,
    onFocus: () => setActiveTool(index),
  });

  const buttonSize = 'size-9 pointer-coarse:size-11';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* A contenteditable cannot be a label's `for` target, so clicking the label focuses it. */}
      <Label id={labelId} onClick={() => editor?.commands.focus('end')}>
        {label}
      </Label>
      <div
        className={cn(
          'flex flex-col rounded-md border border-input shadow-xs transition-[color,box-shadow] dark:bg-input/30',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          invalid && 'border-destructive ring-destructive/20 dark:ring-destructive/40',
        )}
      >
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label={t('editor.formatting.toolbar')}
          aria-controls={editorId}
          onKeyDown={onToolbarKeyDown}
          // A mouse or touch press must not move focus out of the text: Tiptap restores it a
          // frame later, so a fast typist's next keys would land on the button.
          onMouseDown={(event) => event.preventDefault()}
          className="flex flex-wrap items-center gap-1 border-b p-1 pointer-coarse:gap-0"
        >
          {marks.map(({ key, icon: Icon, label: markLabel, toggle }, index) => (
            <Toggle
              key={key}
              {...toolProps(index)}
              size="sm"
              className={buttonSize}
              aria-label={markLabel}
              title={markLabel}
              pressed={state?.[key] ?? false}
              disabled={!editor}
              onPressedChange={() => editor && toggle(editor)}
            >
              <Icon aria-hidden="true" />
            </Toggle>
          ))}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border pointer-coarse:hidden" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={buttonSize}
            {...toolProps(undoIndex)}
            aria-label={t('editor.formatting.undo')}
            title={t('editor.formatting.undo')}
            disabled={!state?.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={buttonSize}
            {...toolProps(undoIndex + 1)}
            aria-label={t('editor.formatting.redo')}
            title={t('editor.formatting.redo')}
            disabled={!state?.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 aria-hidden="true" />
          </Button>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
