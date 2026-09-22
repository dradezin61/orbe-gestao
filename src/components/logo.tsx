import Link from "next/link";

import { store } from "@/lib/store";

/** Marca: um círculo com órbita, lido como o "O" de Orbe. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <circle cx="16" cy="16" r="15" className="fill-brand" />
      <circle cx="16" cy="16" r="6.5" stroke="white" strokeWidth="2.2" />
      <ellipse cx="16" cy="16" rx="12" ry="5.2" stroke="white" strokeWidth="1.6" opacity="0.65" transform="rotate(-28 16 16)" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
    >
      <BrandMark className="size-8 shrink-0" />
      <span className="grid">
        <span className="text-lg font-bold leading-none tracking-tight">{store.name}</span>
        <span className="mt-1 hidden whitespace-nowrap text-[0.625rem] font-semibold uppercase leading-none tracking-[0.16em] text-muted sm:block">
          {store.tagline}
        </span>
      </span>
    </Link>
  );
}
