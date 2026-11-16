// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ViewQuizPage } from '@/features/view/ViewQuizPage';

// Legacy reads each flag with `Boolean(searchParams.get(…))`: any non-empty value turns it on.
// The router has already parsed `?mod=1` into a number and `?mod=true` into a boolean, so the
// values stay untyped here and are read the same way.
const flag = z.unknown().optional();
const isOn = (value: unknown) => value !== undefined && value !== '' && value !== false;

export const Route = createFileRoute('/view/$quizId')({
  validateSearch: z.object({ mod: flag, autoExpand: flag, autoReturn: flag }),
  component: function ViewRoute() {
    const { quizId } = Route.useParams();
    const { mod, autoExpand, autoReturn } = Route.useSearch();
    return (
      <ViewQuizPage
        // A new quiz id starts a fresh page (rating state, open sections).
        key={quizId}
        quizId={quizId}
        modView={isOn(mod)}
        autoExpand={isOn(autoExpand)}
        autoReturn={isOn(autoReturn)}
      />
    );
  },
});
