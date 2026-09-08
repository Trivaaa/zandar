import { notFound } from "next/navigation";

/**
 * /dev/* su skice i harness rute za dizajn — ne isporučuju se u produkciji.
 * Lokalno (`next dev`) rade normalno; u produkcijskom buildu vraćaju 404.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
