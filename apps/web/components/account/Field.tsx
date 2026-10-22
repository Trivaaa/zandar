"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

/**
 * Polje forme naloga: oznaka, unos, poruka ispod. Greška se crta kao na
 * legendi platna (deblji obrub + tonirana podloga) i ostaje uz polje.
 * `password` dobija dugme za prikaz lozinke (A4).
 */
export function Field({
  label,
  message,
  error = false,
  password = false,
  children,
  ...input
}: {
  label: string;
  message?: ReactNode;
  error?: boolean;
  password?: boolean;
  children?: ReactNode;
  /** React 19: `ref` je običan prop i ide pravo na `<input>`. */
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "children">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const messageId = `${id}-msg`;
  return (
    <div className="acct__field">
      <label htmlFor={id} className="acct__label">
        {label}
      </label>
      <div className="acct__input-wrap" data-error={error || undefined}>
        <input
          {...input}
          id={id}
          className="acct__input"
          type={password && !visible ? "password" : (input.type ?? "text")}
          aria-invalid={error || undefined}
          aria-describedby={message ? messageId : undefined}
        />
        {password ? (
          <button
            type="button"
            className="acct__reveal"
            aria-label={visible ? sr.account.hidePassword : sr.account.showPassword}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOffIcon className="acct__reveal-icon" /> : <EyeIcon className="acct__reveal-icon" />}
          </button>
        ) : null}
      </div>
      {message ? (
        <div id={messageId} className="acct__msg" data-error={error || undefined} role="status">
          {message}
        </div>
      ) : null}
      {children}
    </div>
  );
}
