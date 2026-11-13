// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Editor } from '@tiptap/core';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { joinBlocks, joinLines, RichTextInput, richTextExtensions } from './RichTextInput';

/** A headless editor with the same schema, to check what the field stores. */
function roundTrip(html: string): string {
  const editor = new Editor({ extensions: richTextExtensions, content: html });
  const out = editor.getHTML();
  editor.destroy();
  return out;
}

describe('richTextExtensions', () => {
  it('stores inline HTML without a paragraph wrapper', () => {
    expect(roundTrip('Plain text')).toBe('Plain text');
    expect(roundTrip('')).toBe('');
  });

  it('keeps the legacy formatting marks', () => {
    expect(roundTrip('<strong>a</strong> <em>b</em> <sub>c</sub> <sup>d</sup>')).toBe(
      '<strong>a</strong> <em>b</em> <sub>c</sub> <sup>d</sup>',
    );
  });

  it('reads legacy CKEditor markup', () => {
    // CKEditor's Italic wrote <i>; its Strikethrough wrote <s>, which the backend strips.
    expect(roundTrip('<b>a</b> <i>b</i> <s>c</s>')).toBe(
      '<strong>a</strong> <em>b</em> <del>c</del>',
    );
  });

  it('writes strikethrough as <del>, which the backend keeps', () => {
    expect(roundTrip('<del>gone</del>')).toBe('<del>gone</del>');
  });

  it('flattens paragraphs into one line', () => {
    expect(roundTrip('<p>one</p>')).toBe('one');
  });
});

function Controlled({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <RichTextInput label="Title" value={value} onChange={setValue} />;
}

describe('paste handling', () => {
  it('joins pasted lines with a space', () => {
    expect(joinLines('first line\r\n  second line\nthird')).toBe('first line second line third');
  });

  it('joins pasted paragraphs with a space', () => {
    expect(roundTrip(joinBlocks('<p>para one</p><p>para <b>two</b></p>'))).toBe(
      'para one para <strong>two</strong>',
    );
  });
});

describe('RichTextInput', () => {
  it('is a labelled single-line textbox showing the value', async () => {
    render(<Controlled initial="<strong>Unit</strong> 4" />);
    const box = await screen.findByRole('textbox', { name: 'Title' });
    expect(box).toHaveAttribute('aria-multiline', 'false');
    expect(box.innerHTML).toContain('<strong>Unit</strong> 4');
  });

  it('marks the field invalid and links the error message', async () => {
    render(<RichTextInput label="Title" value="" onChange={() => {}} invalid describedBy="err" />);
    const box = await screen.findByRole('textbox', { name: 'Title' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'err');
  });

  it('has a toolbar with one tab stop and arrow-key navigation', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const toolbar = await screen.findByRole('toolbar', { name: 'Text formatting' });
    const bold = screen.getByRole('button', { name: 'Bold' });
    const italic = screen.getByRole('button', { name: 'Italic' });
    expect(bold).toHaveAttribute('tabindex', '0');
    expect(italic).toHaveAttribute('tabindex', '-1');
    expect(toolbar).toHaveAttribute('aria-controls', screen.getByRole('textbox').id);

    bold.focus();
    await user.keyboard('{ArrowRight}');
    expect(italic).toHaveFocus();
    expect(italic).toHaveAttribute('tabindex', '0');
    // Undo and redo are disabled with an empty history, so End lands on Subscript.
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Subscript' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(bold).toHaveFocus();
  });

  it('follows a value changed from outside', async () => {
    const { rerender } = render(<RichTextInput label="Title" value="One" onChange={() => {}} />);
    const box = await screen.findByRole('textbox', { name: 'Title' });
    rerender(<RichTextInput label="Title" value="<em>Two</em>" onChange={() => {}} />);
    await waitFor(() => expect(box.innerHTML).toContain('<em>Two</em>'));
  });
});
