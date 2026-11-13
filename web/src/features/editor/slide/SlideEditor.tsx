// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import type Pikaso from 'pikaso';
import type { Konva } from 'pikaso';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import {
  parseSlide,
  SLIDE_SELECTION_COLOR,
  SLIDE_SIZE,
  type SlideElement,
  serializeSlide,
  withoutForeignImages,
} from '@/lib/slide';
import { cn } from '@/lib/utils';
import { MediaUploader } from '../media/MediaUploader';
import { type SelectedElement, SlideToolbar } from './SlideToolbar';
import { insertImage, insertShape, modifiersOf, type SlideShapeModel } from './slideElements';

type Props = {
  /** The question's `answers`: pikaso JSON as a string, `''` for a new slide. */
  value: string;
  onChange: (value: string) => void;
  /** Names the slide for the image dialog, e.g. "Question 3". */
  fieldLabel: string;
  invalid?: boolean;
  describedBy?: string;
};

type LabelLike = SlideShapeModel & {
  updateText: (attributes: Partial<Konva.TextConfig>) => void;
  textNode: Konva.Text;
};

function isLabel(shape: SlideShapeModel): shape is LabelLike {
  return shape.type === 'label';
}

function toHex(color: unknown): string {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000';
}

function describe(shape: SlideShapeModel | null): SelectedElement | null {
  if (shape === null) return null;
  const modifiers = modifiersOf(shape);
  const label = isLabel(shape) ? shape : null;
  return {
    color:
      modifiers.color === 'text'
        ? toHex(label?.textNode.fill())
        : modifiers.color === 'fill'
          ? toHex(shape.node.getAttr('fill'))
          : null,
    fontSize: modifiers.fontSize && label ? Math.round(label.textNode.fontSize()) : null,
    editableText: label !== null,
  };
}

/** Keys the canvas handles itself while it has focus; pikaso's own window-wide listeners are off. */
const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Port of legacy `lib/editor/slide.svelte`: a pikaso canvas on which the teacher places
 * headlines, texts, rectangles, circles and (new) images. Every change is exported to JSON
 * and stored in the question's `answers`.
 *
 * Legacy's own settings menu (`slides/settings_menu.svelte`: time and title) is covered by
 * the question card's fields. The canvas is uncontrolled after mount: `value` is read once.
 */
export function SlideEditor({ value, onChange, fieldLabel, invalid, describedBy }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Pikaso | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedShape, setSelectedShape] = useState<SlideShapeModel | null>(null);
  // Bumped after an edit, so the toolbar re-reads the selected element's colour and size.
  const [revision, setRevision] = useState(0);
  const [imageOpen, setImageOpen] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialValue = useRef(value);
  const tRef = useRef(t);
  tRef.current = t;
  /**
   * Exports the canvas and reports it if it changed. pikaso fires events for what happens
   * on the canvas (add, drag, resize, delete, undo), but not for `update()`/`updateText()`,
   * which the toolbar and the arrow keys use, so those call this themselves. (Legacy only
   * listened to the events, so a colour or size change was saved with the next canvas event.)
   */
  const emitChange = useRef(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let lastEmitted = initialValue.current;

    (async () => {
      const json = parseSlide(initialValue.current);
      const { default: PikasoClass } = await import('pikaso');
      if (cancelled) return;
      const canvas = new PikasoClass({
        container,
        width: SLIDE_SIZE.width,
        height: SLIDE_SIZE.height,
        snapToGrid: {},
        // pikaso listens on `window`: Backspace in the question field would delete the
        // selected shape and Ctrl+Z would undo the canvas. The canvas handles keys itself.
        selection: {
          keyboard: { enabled: false },
          transformer: { borderStroke: SLIDE_SELECTION_COLOR, anchorStroke: SLIDE_SELECTION_COLOR },
        },
        history: { keyboard: { enabled: false } },
      });
      canvasRef.current = canvas;
      if (json !== null) {
        await canvas.import.json(
          withoutForeignImages(json) as Parameters<typeof canvas.import.json>[0],
        );
      }
      if (cancelled) return;
      canvas.rescale();
      emitChange.current = () => {
        const next = serializeSlide(canvas.export.toJson() as Parameters<typeof serializeSlide>[0]);
        setRevision((r) => r + 1);
        if (next === lastEmitted) return;
        lastEmitted = next;
        onChangeRef.current(next);
      };
      canvas.on('*', () => emitChange.current());
      canvas.on('selection:change', (event) => {
        setSelectedShape(event.shapes?.[0] ?? null);
      });
      observer = new ResizeObserver(() => canvas.rescale());
      observer.observe(container);
      setStatus('ready');
    })().catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      emitChange.current = () => {};
      observer?.disconnect();
      canvasRef.current?.board.stage.destroy();
      canvasRef.current = null;
    };
  }, []);

  const canvas = () => canvasRef.current;

  /** Selects a new element alone (pikaso's `select()` adds to the selection) and focuses the canvas. */
  const selectOnly = (current: Pikaso, shape: SlideShapeModel) => {
    current.selection.deselectAll();
    shape.select();
    // After the add menu has closed: its focus trap would pull focus back while it is open.
    setTimeout(() => containerRef.current?.focus(), 0);
  };

  const add = (type: SlideElement) => {
    const current = canvas();
    if (current === null) return;
    if (type === 'IMAGE') {
      setImageOpen(true);
      return;
    }
    selectOnly(
      current,
      insertShape(current, type, (key) => tRef.current(key)),
    );
  };

  const addImage = (imageId: string) => {
    const current = canvas();
    if (current === null) return;
    void insertImage(current, imageId).then((shape) => selectOnly(current, shape));
  };

  const setColor = (color: string) => {
    if (selectedShape === null) return;
    if (isLabel(selectedShape)) selectedShape.updateText({ fill: color });
    else selectedShape.update({ fill: color });
    emitChange.current();
  };

  const setFontSize = (size: number) => {
    if (selectedShape === null || !isLabel(selectedShape)) return;
    selectedShape.updateText({ fontSize: size });
    emitChange.current();
  };

  const editText = () => {
    if (selectedShape === null || !isLabel(selectedShape)) return;
    // pikaso opens its in-place editor on double-click; the button triggers the same.
    selectedShape.node.fire('dblclick', { target: selectedShape.textNode });
  };

  const moveZ = (step: 1 | -1) => {
    if (selectedShape === null) return;
    selectedShape.update({ zIndex: Math.max(0, selectedShape.node.getZIndex() + step) });
    emitChange.current();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = canvas();
    const target = event.target as HTMLElement;
    // Keys typed into pikaso's in-place text editor are text, not commands.
    if (current === null || target.isContentEditable) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) current.redo();
      else current.undo();
      return;
    }
    if (selectedShape === null) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      current.selection.delete();
    } else if (event.key === 'Escape') {
      current.selection.deselectAll();
    } else if (event.key in MOVE_KEYS) {
      event.preventDefault();
      const [dx, dy] = MOVE_KEYS[event.key] ?? [0, 0];
      const step = event.shiftKey ? 20 : 5;
      // pikaso's `selection.moveX/moveY` animate the move and report it before it ends, so
      // the stored position would trail behind and fast key repeats lose steps.
      for (const shape of current.selection.shapes) {
        shape.update({ x: shape.x() + dx * step, y: shape.y() + dy * step });
      }
      emitChange.current();
    }
  };

  // `revision` is read so the toolbar follows edits made on the canvas (resize, colour, size).
  void revision;
  const selected = describe(selectedShape);

  return (
    <div className="flex flex-col gap-3">
      <SlideToolbar
        selected={selected}
        disabled={status !== 'ready'}
        onAdd={add}
        onColor={setColor}
        onFontSize={setFontSize}
        onEditText={editText}
        onForward={() => moveZ(1)}
        onBackward={() => moveZ(-1)}
        onDelete={() => canvas()?.selection.delete()}
      />
      <div className="relative">
        <div
          ref={containerRef}
          role="application"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: the canvas takes focus for its keyboard commands (move, delete, undo); `application` is an interactive role.
          tabIndex={0}
          aria-roledescription={t('editor.slide.canvas')}
          aria-label={fieldLabel}
          aria-describedby={cn(`${id}-hint`, describedBy) || undefined}
          onKeyDown={onKeyDown}
          data-testid="slide-canvas"
          className={cn(
            'relative aspect-video w-full overflow-hidden rounded-xl border bg-white outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            invalid && 'border-destructive',
          )}
        />
        {status === 'loading' ? (
          <Skeleton className="absolute inset-0 rounded-xl" />
        ) : status === 'error' ? (
          <p
            role="alert"
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-dashed bg-card p-4 text-center text-sm text-muted-foreground"
          >
            {t('editor.slide.load_error')}
          </p>
        ) : null}
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {t('editor.slide.hint')}
      </p>
      <MediaUploader
        open={imageOpen}
        onOpenChange={setImageOpen}
        fieldLabel={fieldLabel}
        onSelect={addImage}
      />
    </div>
  );
}
