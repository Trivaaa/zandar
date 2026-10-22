import { PROFILE_AVATARS, type ProfileAvatar } from "@zandar/shared-types";

import { sr } from "@/lib/sr";

/**
 * Avatar naloga (A1–A10). Set crteža dolazi u fazi 2 (SPEC_IDENTITET §3:
 * stilizovane životinje); do tada krug sa oznakom, kao na wireframe-u.
 * Veličinu daje roditelj kroz `--avatar-size`.
 */
export function Avatar({
  avatar,
  className = "",
  label = false,
}: {
  avatar: ProfileAvatar;
  className?: string;
  /** `true` = pristupačan naziv (kad avatar sam nosi značenje, npr. u izboru). */
  label?: boolean;
}) {
  const n = PROFILE_AVATARS.indexOf(avatar) + 1;
  return (
    <span
      className={`avatar ${className}`}
      data-avatar={avatar}
      {...(label ? { role: "img", "aria-label": sr.account.avatarLabel(n) } : { "aria-hidden": true })}
    >
      {`A${n}`}
    </span>
  );
}
