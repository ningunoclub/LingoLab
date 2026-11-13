// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { server } from '@/test/msw';
import { MediaUploader } from './MediaUploader';

const UPLOAD = 'http://localhost/api/v1/storage/';
const RECENT = 'http://localhost/api/v1/storage/list/last';
const ITEM = {
  id: 'b1946ac9-2d7c-4b3e-9f0c-3a5e8d1a0f11',
  uploaded_at: '2026-11-01T10:00:00',
  mime_type: 'image/png',
  size: 1234,
  filename: 'weather.png',
  alt_text: null,
  imported: false,
  quizzes: [],
  quiztivities: [],
};

beforeAll(() => {
  // jsdom has no object URLs; the preview only needs a string.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

function renderUploader() {
  const onSelect = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MediaUploader fieldLabel="Cover image" onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return { onSelect, user: userEvent.setup({ applyAccept: false }) };
}

async function openWith(user: ReturnType<typeof userEvent.setup>, source: 'Image' | 'Library') {
  await user.click(screen.getByRole('button', { name: 'Add Media: Cover image' }));
  expect(screen.getByRole('heading', { name: 'Select the Upload Type' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: source }));
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]');

describe('MediaUploader', () => {
  it('uploads a picked image and hands back its id', async () => {
    server.use(http.post(UPLOAD, () => HttpResponse.json({ id: ITEM.id })));
    const { onSelect, user } = renderUploader();
    await openWith(user, 'Image');

    const input = fileInput();
    if (!input) throw new Error('no file input');
    await user.upload(input, new File(['x'], 'cat.png', { type: 'image/png' }));
    expect(screen.getByText(/cat\.png/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Upload' }));
    await vi.waitFor(() => expect(onSelect).toHaveBeenCalledWith(ITEM.id));
    // The dialog closes once the field has its image.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses a file type the backend would reject, before uploading', async () => {
    const { onSelect, user } = renderUploader();
    await openWith(user, 'Image');
    const input = fileInput();
    if (!input) throw new Error('no file input');
    await user.upload(input, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

    expect(screen.getByRole('alert')).toHaveTextContent('This file type is not supported');
    expect(screen.queryByRole('button', { name: 'Upload' })).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('explains a full storage', async () => {
    server.use(http.post(UPLOAD, () => HttpResponse.json({ detail: 'x' }, { status: 409 })));
    const { onSelect, user } = renderUploader();
    await openWith(user, 'Image');
    const input = fileInput();
    if (!input) throw new Error('no file input');
    await user.upload(input, new File(['x'], 'cat.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your storage is full');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('picks an earlier upload from the library', async () => {
    server.use(
      http.get(RECENT, () => HttpResponse.json([ITEM, { ...ITEM, id: 'other', filename: null }])),
    );
    const { onSelect, user } = renderUploader();
    await openWith(user, 'Library');

    expect(await screen.findByText('weather.png')).toBeInTheDocument();
    expect(screen.getByText('No name available')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0] as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith(ITEM.id);
  });

  it('shows the empty library', async () => {
    server.use(http.get(RECENT, () => HttpResponse.json([])));
    const { user } = renderUploader();
    await openWith(user, 'Library');
    expect(await screen.findByText('You have not uploaded any files yet.')).toBeInTheDocument();
  });

  it('offers a retry when the library fails to load', async () => {
    let calls = 0;
    server.use(
      http.get(RECENT, () => {
        calls += 1;
        return calls === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json([ITEM]);
      }),
    );
    const { user } = renderUploader();
    await openWith(user, 'Library');
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('weather.png')).toBeInTheDocument();
  });

  it('returns to the type choice after closing', async () => {
    server.use(http.get(RECENT, () => HttpResponse.json([])));
    const { user } = renderUploader();
    await openWith(user, 'Library');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Add Media: Cover image' }));
    expect(screen.getByRole('heading', { name: 'Select the Upload Type' })).toBeInTheDocument();
  });
});
