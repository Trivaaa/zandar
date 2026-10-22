import type { AccessTokenSource } from "./serviceAuth";

/**
 * Firebase Auth admin preko Identity Toolkit REST-a (bez `firebase-admin`):
 * brisanje korisnika i listanje po stranicama. Treba servisni ključ sa
 * pravom „Firebase Authentication Admin" (Firebase Admin SDK nalog ga ima).
 */

export const IDENTITY_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const REQUEST_TIMEOUT_MS = 10_000;

export type AuthUserRecord = {
  uid: string;
  /** Firebase `createdAt`, ms. */
  createdAt: number;
  /** Bez provajdera = anonimni gost. */
  providers: string[];
};

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

    /** Jedna stranica korisnika; `nextPageToken` je `null` na zadnjoj. */
    async listUsers(
      pageToken: string | null,
      maxResults = 500,
    ): Promise<{ users: AuthUserRecord[]; nextPageToken: string | null }> {
      const q = new URLSearchParams({ maxResults: String(maxResults) });
      if (pageToken) q.set("nextPageToken", pageToken);
      const res = await call(`/accounts:batchGet?${q}`, { method: "GET" });
      if (!res.ok) throw new Error(`Identity Toolkit list ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = (await res.json()) as {
        users?: { localId?: unknown; createdAt?: unknown; providerUserInfo?: { providerId?: unknown }[] }[];
        nextPageToken?: unknown;
      };
      const users = (json.users ?? [])
        .filter((u) => typeof u.localId === "string")
        .map((u) => ({
          uid: u.localId as string,
          createdAt: Number(u.createdAt ?? 0),
          providers: (u.providerUserInfo ?? [])
            .map((p) => p.providerId)
            .filter((p): p is string => typeof p === "string"),
        }));
      const next = typeof json.nextPageToken === "string" && json.nextPageToken ? json.nextPageToken : null;
      return { users, nextPageToken: next };
    },
  };
}

export type IdentityAdmin = ReturnType<typeof createIdentityAdmin>;
