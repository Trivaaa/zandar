import type { AccessTokenSource } from "./serviceAuth";

/**
 * Firebase Auth admin preko Identity Toolkit REST-a (bez `firebase-admin`):
 * brisanje korisnika (napušten gost T6, brisanje naloga u koraku 7). Treba
 * servisni ključ sa pravom „Firebase Authentication Admin" (Firebase Admin
 * SDK nalog ga ima).
 */

export const IDENTITY_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const REQUEST_TIMEOUT_MS = 10_000;

export function createIdentityAdmin(
  projectId: string,
  tokens: AccessTokenSource,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const base = `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}`;

  async function call(path: string, init: RequestInit): Promise<Response> {
    const doFetch = async () =>
      fetchImpl(`${base}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${await tokens.get()}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    let res = await doFetch();
    if (res.status === 401) {
      tokens.invalidate();
      res = await doFetch();
    }
    return res;
  }

  return {
    /** Već obrisan korisnik nije greška (`USER_NOT_FOUND`). */
    async deleteUser(uid: string): Promise<void> {
      const res = await call("/accounts:delete", { method: "POST", body: JSON.stringify({ localId: uid }) });
      if (res.ok) return;
      const body = await res.text();
      if (body.includes("USER_NOT_FOUND")) return;
      throw new Error(`Identity Toolkit delete ${res.status}: ${body.slice(0, 300)}`);
    },
  };
}

export type IdentityAdmin = ReturnType<typeof createIdentityAdmin>;
