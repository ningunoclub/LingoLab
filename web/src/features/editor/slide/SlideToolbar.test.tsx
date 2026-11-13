// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';
import { type SelectedElement, SlideToolbar } from './SlideToolbar';

beforeAll(() => {
  // The Radix slider measures its thumb; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function renderToolbar(selected: SelectedElement | null, disabled = false) {
  const handlers = {
    onAdd: vi.fn(),
    onColor: vi.fn(),
    onFontSize: vi.fn(),
    onEditText: vi.fn(),
    onForward: vi.fn(),
    onBackward: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <TooltipProvider>
      <SlideToolbar selected={selected} disabled={disabled} {...handlers} />
    </TooltipProvider>,
  );
  return { handlers, user: userEvent.setup() };
}

const button = (name: string) => screen.getByRole('button', { name });
const LABEL: SelectedElement = { color: '#000000', fontSize: 35, editableText: true };
const SHAPE: SelectedElement = { color: '#e69f00', fontSize: null, editableText: false };
const IMAGE: SelectedElement = { color: null, fontSize: null, editableText: false };

describe('SlideToolbar', () => {
  it('disables every element tool while nothing is selected', () => {
    renderToolbar(null);
    for (const name of [
      'Colour',
      'Font size',
      'Edit text',
      'Bring forward',
      'Send backward',
      'Delete element',
    ]) {
      expect(button(name)).toBeDisabled();
    }
    expect(button('Add element')).toBeEnabled();
  });

  it('disables everything until the canvas has loaded', () => {
    renderToolbar(LABEL, true);
    expect(button('Add element')).toBeDisabled();
    expect(button('Edit text')).toBeDisabled();
  });

  it('offers the tools that fit the selected element', () => {
    renderToolbar(SHAPE);
    expect(button('Colour')).toBeEnabled();
    expect(button('Font size')).toBeDisabled();
    expect(button('Edit text')).toBeDisabled();
    expect(button('Delete element')).toBeEnabled();
  });

  it('has no colour for images', () => {
    renderToolbar(IMAGE);
    expect(button('Colour')).toBeDisabled();
    expect(button('Bring forward')).toBeEnabled();
  });

  it('passes on the picked colour', async () => {
    const { handlers, user } = renderToolbar(SHAPE);
    await user.click(button('Colour'));
    const input = screen.getByLabelText('Colour', { selector: 'input' });
    expect(input).toHaveValue('#e69f00');
    fireEvent.change(input, { target: { value: '#009e73' } });
    expect(handlers.onColor).toHaveBeenCalledWith('#009e73');
  });

  it('changes the font size when the slider is let go', async () => {
    const { handlers, user } = renderToolbar(LABEL);
    await user.click(button('Font size'));
    const slider = screen.getByRole('slider', { name: 'Font size' });
    expect(slider).toHaveAttribute('aria-valuenow', '35');
    expect(slider).toHaveAttribute('aria-valuemin', '10');
    expect(slider).toHaveAttribute('aria-valuemax', '250');
    slider.focus();
    await user.keyboard('{ArrowRight}');
    expect(handlers.onFontSize).toHaveBeenCalledWith(36);
  });

  it('runs the element actions', async () => {
    const { handlers, user } = renderToolbar(LABEL);
    await user.click(button('Edit text'));
    await user.click(button('Bring forward'));
    await user.click(button('Send backward'));
    await user.click(button('Delete element'));
    expect(handlers.onEditText).toHaveBeenCalledOnce();
    expect(handlers.onForward).toHaveBeenCalledOnce();
    expect(handlers.onBackward).toHaveBeenCalledOnce();
    expect(handlers.onDelete).toHaveBeenCalledOnce();
  });
});

describe('AddElementMenu', () => {
  it('lists every element with its shortcut', async () => {
    const { handlers, user } = renderToolbar(null);
    await user.click(button('Add element'));
    const items = screen.getAllByRole('menuitem');
    expect(items.map((item) => item.getAttribute('aria-keyshortcuts'))).toEqual([
      'h',
      't',
      'r',
      'c',
      'i',
    ]);
    expect(items[3]).toHaveTextContent('Circle');
    await user.click(screen.getByRole('menuitem', { name: /Rectangle/ }));
    expect(handlers.onAdd).toHaveBeenCalledWith('RECTANGLE');
  });

  it('picks an element by its key while the menu is open, and closes', async () => {
    const { handlers, user } = renderToolbar(null);
    await user.click(button('Add element'));
    await user.keyboard('i');
    expect(handlers.onAdd).toHaveBeenCalledWith('IMAGE');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ignores the keys while the menu is closed (legacy listened on the whole page)', async () => {
    const { handlers, user } = renderToolbar(null);
    await user.keyboard('h');
    expect(handlers.onAdd).not.toHaveBeenCalled();
  });
});
