// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { AVATAR_FEATURES } from './avatarApi';
import { useAvatarWizard } from './useAvatarWizard';

/** Walk the wizard to the last step by picking index 0 everywhere. */
function advanceToLastStep(result: { current: ReturnType<typeof useAvatarWizard> }) {
  for (let step = 0; step < AVATAR_FEATURES.length - 1; step++) {
    act(() => result.current.select(0));
  }
}

describe('useAvatarWizard', () => {
  it('opens on the first feature with nothing chosen', () => {
    const { result } = renderHook(() => useAvatarWizard());
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.feature).toBe('skin_color');
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.finished).toBe(false);
  });

  it('records the pick and advances, as clicking a tile does in legacy', () => {
    const { result } = renderHook(() => useAvatarWizard());
    act(() => result.current.select(4));
    expect(result.current.choices.skin_color).toBe(4);
    expect(result.current.feature).toBe('top_type');
  });

  it('steps back without losing the choice', () => {
    const { result } = renderHook(() => useAvatarWizard());
    act(() => result.current.select(4));
    act(() => result.current.back());
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.choices.skin_color).toBe(4);
  });

  it('clamps back at the first step', () => {
    const { result } = renderHook(() => useAvatarWizard());
    act(() => result.current.back());
    expect(result.current.stepIndex).toBe(0);
  });

  it('opens the reveal when the last feature is picked instead of advancing', () => {
    const { result } = renderHook(() => useAvatarWizard());
    advanceToLastStep(result);
    expect(result.current.isLastStep).toBe(true);

    act(() => result.current.select(2));

    expect(result.current.finished).toBe(true);
    expect(result.current.choices.clothe_graphic_type).toBe(2);
    // Still on the last step: the reveal sits on top rather than navigating away.
    expect(result.current.stepIndex).toBe(AVATAR_FEATURES.length - 1);
  });

  /** Legacy's "Finish" button is enabled on the last step but wired to nothing. */
  it('lets Finish open the reveal from the last step', () => {
    const { result } = renderHook(() => useAvatarWizard());
    advanceToLastStep(result);
    act(() => result.current.finish());
    expect(result.current.finished).toBe(true);
  });

  it('rewinds to the first step on start over but keeps the avatar built so far', () => {
    const { result } = renderHook(() => useAvatarWizard());
    act(() => result.current.select(3));
    advanceToLastStep(result);
    act(() => result.current.finish());

    act(() => result.current.startOver());

    expect(result.current.finished).toBe(false);
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.choices.skin_color).toBe(3);
  });

  it('closes the reveal without touching the choices', () => {
    const { result } = renderHook(() => useAvatarWizard());
    act(() => result.current.select(3));
    advanceToLastStep(result);
    act(() => result.current.finish());

    act(() => result.current.closeReveal());

    expect(result.current.finished).toBe(false);
    expect(result.current.stepIndex).toBe(AVATAR_FEATURES.length - 1);
    expect(result.current.choices.skin_color).toBe(3);
  });

  describe('save', () => {
    it('reports success so the button can settle on the check', async () => {
      server.use(
        http.post(
          'http://localhost/api/v1/avatar/save',
          () => new HttpResponse(null, { status: 200 }),
        ),
      );
      const { result } = renderHook(() => useAvatarWizard());

      await act(async () => {
        await result.current.save();
      });

      await waitFor(() => expect(result.current.saveState).toBe('saved'));
    });

    /** The legacy failure mode: no else branch, so the spinner never resolves. */
    it('surfaces a failure instead of hanging on the spinner', async () => {
      server.use(
        http.post(
          'http://localhost/api/v1/avatar/save',
          () => new HttpResponse(null, { status: 500 }),
        ),
      );
      const { result } = renderHook(() => useAvatarWizard());

      await act(async () => {
        await result.current.save();
      });

      await waitFor(() => expect(result.current.saveState).toBe('error'));
    });

    it('resets to idle when a new pass reaches the reveal, so it can be saved again', async () => {
      server.use(
        http.post(
          'http://localhost/api/v1/avatar/save',
          () => new HttpResponse(null, { status: 200 }),
        ),
      );
      const { result } = renderHook(() => useAvatarWizard());
      advanceToLastStep(result);
      act(() => result.current.select(0));
      await act(async () => {
        await result.current.save();
      });
      await waitFor(() => expect(result.current.saveState).toBe('saved'));

      act(() => result.current.startOver());
      advanceToLastStep(result);
      act(() => result.current.select(1));

      expect(result.current.saveState).toBe('idle');
    });
  });
});
