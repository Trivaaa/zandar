import Link from "next/link";

import { sr } from "@/lib/sr";

/**
 * „Pravljenjem naloga prihvataš politiku privatnosti." — uz svaki korak koji
 * pravi nalog (A3, A4). Uslove korišćenja igrač prihvata kasnije, na A5; e-mail
 * čuvamo od trenutka kad nalog nastane, pa osnov mora biti jasan već tada.
 */
export function PrivacyNote() {
  return (
    <p className="acct__privacy">
      {sr.account.privacyBefore}
      <Link href="/privatnost" className="acct__privacy-link">
        {sr.account.privacyLink}
      </Link>
      {sr.account.privacyAfter}
    </p>
  );
}
