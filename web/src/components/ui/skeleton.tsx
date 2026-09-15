// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { cn } from '@/lib/utils';

// Upstream shadcn uses bg-accent, which in stock themes is a neutral grey. In the
// LingoLab palette --accent is Coral, reserved for highlights and celebration, so
// loading states use the muted token instead.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
