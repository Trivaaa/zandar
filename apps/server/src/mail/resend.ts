/**
 * Slanje e-pošte preko Resenda (https://resend.com/docs/api-reference/emails/send-email),
 * bez SDK-a — isti razlog kao `push/fcm.ts`: jedan POST ne opravdava paket.
 *
 * Bez `RESEND_API_KEY` slanje je no-op (`"disabled"`), a server radi normalno:
 * lokalni dev i staging bez ključa ne smiju pasti zbog pošte.
 *
 * Bez verifikovanog domena Resend dozvoljava pošiljaoca `onboarding@resend.dev`
 * i SAMO primaoca koji je vlasnik naloga — za utiske (koji idu vlasniku) dovoljno.
 */

const RESEND_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

export type MailAttachment = { filename: string; content: Buffer };

export type Mail = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

export type MailResult = "sent" | "disabled" | "failed";

export function createResendMailer(
  apiKey: string | undefined,
  from: string,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  return {
    enabled: Boolean(apiKey),

    /** Nikad ne baca — neuspjeh je rezultat, a pozivalac je već sačuvao zapis. */
    async send(mail: Mail): Promise<MailResult> {
      if (!apiKey) return "disabled";
      try {
        const res = await fetchImpl(RESEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [mail.to],
            subject: mail.subject,
            text: mail.text,
            ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
            ...(mail.attachments?.length
              ? {
                  attachments: mail.attachments.map((a) => ({
                    filename: a.filename,
                    content: a.content.toString("base64"),
                  })),
                }
              : {}),
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (res.ok) return "sent";
        console.error(`[mail] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return "failed";
      } catch (err) {
        console.error(`[mail] Resend nedostupan: ${err}`);
        return "failed";
      }
    },
  };
}

export type Mailer = ReturnType<typeof createResendMailer>;

export const mailer: Mailer = createResendMailer(
  process.env.RESEND_API_KEY || undefined,
  process.env.FEEDBACK_FROM || "Kartaonica <onboarding@resend.dev>",
);
