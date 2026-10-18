'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type BrandId =
  | 'spotify'
  | 'youtube'
  | 'netflix'
  | 'apple'
  | 'openai'
  | 'chatgpt'
  | 'disney'
  | 'google'
  | 'claude'
  | 'figma'
  | 'grab';

export function BrandLogo({
  brand,
  className,
}: {
  brand: BrandId;
  className?: string;
}) {
  switch (brand) {
    case 'spotify':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#1DB954] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="Spotify"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
            <path
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.792-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.72 1.115.295.18.388.563.208.855zm1.225-2.724c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.134-9.97-1.168-.413.125-.85-.11-.975-.522-.125-.413.11-.85.522-.975 3.633-1.102 8.147-.568 11.244 1.332.367.226.482.71.256 1.077zm.105-2.836C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.016-.13-1.166-.624-.15-.494.13-1.016.624-1.166 3.532-1.072 9.404-.87 13.115 1.333.444.263.59.84.327 1.284-.264.444-.84.59-1.284.327z"
            />
          </svg>
        </div>
      );

    case 'youtube':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#FF0000] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="YouTube"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
            <path d="M21.582 6.186a2.7 2.7 0 0 0-1.9-1.9C17.998 3.8 12 3.8 12 3.8s-5.998 0-7.682.486a2.7 2.7 0 0 0-1.9 1.9C2 7.87 2 12 2 12s0 4.13.418 5.814a2.7 2.7 0 0 0 1.9 1.9c1.684.486 7.682.486 7.682.486s5.998 0 7.682-.486a2.7 2.7 0 0 0 1.9-1.9C22 16.13 22 12 22 12s0-4.13-.418-5.814zM10 15.5v-7l6 3.5-6 3.5z" />
          </svg>
        </div>
      );

    case 'grab':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#00B14F] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2'
          )}
          aria-label="Grab"
        >
          <span className="font-sans font-black text-[13px] text-white tracking-tight leading-none select-none">
            Grab
          </span>
        </div>
      );

    case 'netflix':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#000000] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="Netflix"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M6 3h3v18H6z" fill="#E50914" />
            <path d="M15 3h3v18h-3z" fill="#E50914" />
            <path d="M6 3l12 18h.2V3H15l-9 13.5V3z" fill="#B81D24" />
          </svg>
        </div>
      );

    case 'apple':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#000000] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="Apple"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
            <path
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.16.65-2.84 1.44-.59.69-1.11 1.76-.97 2.81 1.07.08 2.2-.62 2.8-1.38z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      );

    case 'openai':
    case 'chatgpt':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#10A37F] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="ChatGPT"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" fill="currentColor">
            <path
              d="M20.2 11.2a4.4 4.4 0 0 0-.4-2.9 4.5 4.5 0 0 0-3.5-2.1 4.6 4.6 0 0 0-2.2.2 4.4 4.4 0 0 0-3.4-.8A4.5 4.5 0 0 0 7.3 8.4a4.4 4.4 0 0 0-.8 2.8 4.5 4.5 0 0 0 .5 2.1 4.4 4.4 0 0 0 .4 2.9 4.5 4.5 0 0 0 3.5 2.1 4.6 4.6 0 0 0 2.2-.2 4.4 4.4 0 0 0 3.4.8 4.5 4.5 0 0 0 3.4-2.8 4.4 4.4 0 0 0 .8-2.8 4.5 4.5 0 0 0-.5-2.1zm-7 7.5a2.9 2.9 0 0 1-1.8-.6l1.3-2.1a.7.7 0 0 1 .6-.4h2.5a2.9 2.9 0 0 1-2.6 3.1zm-4-1.6a2.9 2.9 0 0 1-.7-1.8l2.3-.7a.7.7 0 0 1 .7.2l1.3 2.2a2.9 2.9 0 0 1-3.6.1zm-1.4-4.2a2.9 2.9 0 0 1 1.1-1.6v2.4a.7.7 0 0 1-.3.6L6.8 15a2.9 2.9 0 0 1 .4-1.7zm2-3.3a2.9 2.9 0 0 1 1.8.6l-1.3 2.1a.7.7 0 0 1-.6.4H8.2a2.9 2.9 0 0 1 2.6-3.1zm4 1.6a2.9 2.9 0 0 1 .7 1.8l-2.3.7a.7.7 0 0 1-.7-.2l-1.3-2.2a2.9 2.9 0 0 1 3.6-.1zm4 3.9a2.9 2.9 0 0 1-1.1 1.6v-2.4a.7.7 0 0 1 .3-.6l2.1-.7a2.9 2.9 0 0 1-.4 1.7z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      );

    case 'disney':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#0F1E4A] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="Disney+"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path
              d="M17.5 7.8c-.8.5-2.2 1.2-3.8 1.4-1.2.2-2.8.2-3.8-.5-.8-.5-1.2-1.3-1.1-2.2.1-1.2 1.3-2.1 2.7-2.3 2.1-.3 4.2.8 4.7 1.1-.3-.2-1.7-1-3.7-.9-1.2.1-2.3.8-2.5 1.8-.1.7.2 1.4.9 1.8.8.5 2.1.6 3.2.4 1.7-.2 3.1-.8 3.8-1.2l-.4.6zm-5.7 3.5c-.3 0-.5.2-.5.5v5.8c0 .3.2.5.5.5s.5-.2.5-.5v-5.8c0-.3-.2-.5-.5-.5zm2.8 2.2c-.3 0-.5.2-.5.5v3.6c0 .3.2.5.5.5s.5-.2.5-.5V14c0-.3-.2-.5-.5-.5zm4.8.6h-1.2v-1.2c0-.3-.2-.5-.5-.5s-.5.2-.5.5v1.2h-1.2c-.3 0-.5.2-.5.5s.2.5.5.5h1.2v1.2c0 .3.2.5.5.5s.5-.2.5-.5V15h1.2c.3 0 .5-.2.5-.5s-.2-.4-.5-.4z"
              fill="#FFFFFF"
            />
            <circle cx="19.5" cy="5" r="1.5" fill="#38BDF8" />
          </svg>
        </div>
      );

    case 'google':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-white shadow-xs shrink-0 overflow-hidden border border-[#E2E8F0]',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="Google One"
        >
          <svg className="h-full w-full" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2.44 0 4.67-.88 6.42-2.34l-2.07-2.07C14.98 18.37 13.56 19 12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7c1.93 0 3.68.79 4.95 2.05l2.12-2.12C17.29 3.2 14.79 2 12 2z"
            />
            <path fill="#EA4335" d="M12 5c1.93 0 3.68.79 4.95 2.05l2.12-2.12C17.29 3.2 14.79 2 12 2v3z" />
            <path
              fill="#FBBC05"
              d="M19.07 4.93l-2.12 2.12C18.21 8.32 19 10.07 19 12h3c0-2.79-1.2-5.29-2.93-7.07z"
            />
            <path
              fill="#34A853"
              d="M19 12c0 1.93-.79 3.68-2.05 4.95l2.12 2.12C20.8 17.29 22 14.79 22 12h-3z"
            />
          </svg>
        </div>
      );

    case 'claude':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#D97757] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2'
          )}
          aria-label="Claude"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full" fill="#FFFFFF">
            <path d="M12 2l1.6 4.9 4.9-1.6-1.6 4.9 4.9 1.6-4.9 1.6 1.6 4.9-4.9-1.6L12 22l-1.6-4.9-4.9 1.6 1.6-4.9-4.9-1.6 4.9-1.6-1.6-4.9 4.9 1.6z" />
          </svg>
        </div>
      );

    case 'figma':
      return (
        <div
          className={cn(
            'grid place-items-center rounded-full bg-[#1E1E1E] text-white shadow-xs shrink-0 overflow-hidden',
            className ?? 'h-10 w-10 p-2.5'
          )}
          aria-label="Figma"
        >
          <svg viewBox="0 0 24 24" className="h-full w-full">
            <path d="M8 3h4v4H8a2 2 0 1 1 0-4z" fill="#F24E1E" />
            <path d="M12 3h4a2 2 0 1 1 0 4h-4V3z" fill="#FF7262" />
            <path d="M8 7h4v4H8a2 2 0 1 1 0-4z" fill="#A259FF" />
            <path d="M12 7h4a2 2 0 1 1 0 4h-4V7z" fill="#1ABCFE" />
            <path d="M8 11h4v2a2 2 0 1 1-4 0v-2z" fill="#0ACF83" />
          </svg>
        </div>
      );

    default:
      return null;
  }
}
