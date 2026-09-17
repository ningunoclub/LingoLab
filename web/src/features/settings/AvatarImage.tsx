// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAvatarSvg } from './useAvatarSvg';

type Props = {
  /** An `/api/v1/avatar/custom` URL from `avatarImageUrl` / `avatarOptionUrl`. */
  src: string;
  alt: string;
  className?: string;
};

/**
 * A rendered avatar.
 *
 * Goes through `useAvatarSvg` rather than pointing an `<img>` straight at the endpoint,
 * because the backend mislabels the SVG as `text/plain`; see that hook for the detail.
 */
export function AvatarImage({ src, alt, className }: Props) {
  const { href, failed } = useAvatarSvg(src);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn('flex items-center justify-center text-muted-foreground', className)}
      >
        <ImageOff aria-hidden="true" className="h-6 w-6" />
      </span>
    );
  }

  // Until the markup arrives the box stays empty rather than flashing a broken icon.
  if (!href) return <span aria-hidden="true" className={className} />;

  return <img src={href} alt={alt} className={className} />;
}
