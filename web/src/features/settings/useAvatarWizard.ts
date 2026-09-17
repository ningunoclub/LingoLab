// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useCallback, useMemo, useState } from 'react';
import {
  AVATAR_FEATURES,
  AVATAR_OPTION_COUNTS,
  type AvatarChoices,
  type AvatarFeature,
  defaultAvatarChoices,
  saveAvatar,
} from './avatarApi';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export type AvatarWizard = {
  choices: AvatarChoices;
  stepIndex: number;
  feature: AvatarFeature;
  optionCount: number;
  stepCount: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  finished: boolean;
  saveState: SaveState;
  /** Pick a value for the current feature and move on, per legacy's tile click. */
  select: (value: number) => void;
  back: () => void;
  /** Jump to the reveal from the last step (legacy's dead "Finish" button). */
  finish: () => void;
  startOver: () => void;
  closeReveal: () => void;
  save: () => Promise<void>;
};

export function useAvatarWizard(): AvatarWizard {
  const [choices, setChoices] = useState<AvatarChoices>(defaultAvatarChoices);
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const stepCount = AVATAR_FEATURES.length;
  const feature = AVATAR_FEATURES[stepIndex];
  const isLastStep = stepIndex === stepCount - 1;

  const select = useCallback(
    (value: number) => {
      setChoices((current) => ({ ...current, [feature]: value }));
      // Legacy: picking on the last step opens the reveal and resets the save state, so
      // a second pass can be saved again.
      if (isLastStep) {
        setSaveState('idle');
        setFinished(true);
      } else {
        setStepIndex((index) => index + 1);
      }
    },
    [feature, isLastStep],
  );

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const finish = useCallback(() => {
    setSaveState('idle');
    setFinished(true);
  }, []);

  const startOver = useCallback(() => {
    // Legacy rewinds to step 1 and closes the overlay but deliberately keeps the choices,
    // so the wizard reopens on the avatar just built rather than a blank one.
    setStepIndex(0);
    setFinished(false);
  }, []);

  const closeReveal = useCallback(() => {
    setFinished(false);
  }, []);

  const save = useCallback(async () => {
    setSaveState('saving');
    try {
      await saveAvatar(choices);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [choices]);

  return useMemo(
    () => ({
      choices,
      stepIndex,
      feature,
      optionCount: AVATAR_OPTION_COUNTS[feature],
      stepCount,
      isFirstStep: stepIndex === 0,
      isLastStep,
      finished,
      saveState,
      select,
      back,
      finish,
      startOver,
      closeReveal,
      save,
    }),
    [
      choices,
      stepIndex,
      feature,
      isLastStep,
      finished,
      saveState,
      select,
      back,
      finish,
      startOver,
      closeReveal,
      save,
    ],
  );
}
