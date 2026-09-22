"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { btnPrimary } from "@/components/ui";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({ children, pendingLabel = "Aguarde…", className = btnPrimary, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={disabled || pending} aria-disabled={disabled || pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
