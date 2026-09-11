"use client";

export type ToastProps = {
  message: string;
  visible: boolean;
  className?: string | undefined;
  /** Pozicija na pozornici — dolazi kao `--stage-*` varijabla iz GameScreen-a. */
  style?: React.CSSProperties | undefined;
};

/** Danger notice above the hand. The parent owns the dismiss timer — nothing
 *  here measures time. No clamping: an error message is never truncated. */
export function Toast({ message, visible, className = "", style }: ToastProps) {
  if (!visible) return null;

  return (
    <div className={`toast ${className}`} style={style} role="alert">
      <span className="toast__text font-sans text-base">{message}</span>
    </div>
  );
}
