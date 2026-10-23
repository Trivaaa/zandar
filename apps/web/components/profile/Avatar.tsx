import type { ProfileAvatar } from "@zandar/shared-types";

import { sr } from "@/lib/sr";

/** Veličine iz SPEC_IDENTITET: red/lista 40, kartica 64, profil i izbor 120. */
export type AvatarSize = 40 | 64 | 120;

/**
 * Avatar naloga (SPEC_IDENTITET §3) — crtež iz `public/avatars/<id>.svg`.
 *
 * `<img>`, ne inline SVG: svaki crtež nosi `clipPath id="c"`, pa bi dva ista
 * avatara u DOM-u (sto, lista prijatelja) dijelila id. Fajl se uz to kešira i
 * ne ulazi u JS bundle; Capacitor export servira `public/` kao i podloge stola.
 *
 * Bez `size` popunjava roditelja (sjedište, red sobe) kroz `--avatar-size`.
 * Gost i bot nemaju avatar — njih crta pozivalac (slovo), ne ova komponenta.
 */
export function Avatar({
  id,
  size,
  className = "",
  label = false,
}: {
  id: ProfileAvatar;
  size?: AvatarSize;
  className?: string;
  /** `true` = pristupačan naziv (kad avatar sam nosi značenje, npr. u izboru). */
  label?: boolean;
}) {
  return (
    <span
      className={`avatar ${size ? `avatar--${size}` : ""} ${className}`}
      data-avatar={id}
      {...(label ? { role: "img", "aria-label": sr.account.avatarNames[id] } : { "aria-hidden": true })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- statičan SVG, next/image ga ne bi optimizovao */}
      <img className="avatar__img" src={`/avatars/${id}.svg`} alt="" draggable={false} decoding="async" />
    </span>
  );
}
