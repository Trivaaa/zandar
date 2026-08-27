"use client";

export type ToastProps = {
  message: string;
  visible: boolean;
  className?: string | undefined;
};

/** Danger notice above the hand. The parent owns the dismiss timer — nothing
 *  here measures time. No clamping: an error message is never truncated. */
export function Toast({ message, visible, className = "" }: ToastProps) {
  if (!visible) return null;

  return (
    <div className={`toast ${className}`} role="alert">
      <span className="toast__text font-sans text-base">{message}</span>
    </div>
  );
}
