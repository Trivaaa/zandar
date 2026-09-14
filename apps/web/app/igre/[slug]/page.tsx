import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isUpcomingGameSlug, UPCOMING_GAME_SLUGS } from "@zandar/shared-types";

import { TeaserScreen } from "@/components/teaser/TeaserScreen";
import { sr } from "@/lib/sr";

/**
 * `/igre/<slug>` — teaser buduće igre.
 *
 * ⚠ `generateStaticParams` je OBAVEZAN: APK build je `output: "export"`, koji
 * dinamički segment prihvata samo kad su sve vrijednosti poznate unaprijed.
 * Za razliku od `[roomId]` (koji zato živi samo u `page.web.tsx`), slugovi SU
 * poznati — dolaze iz `@zandar/shared-types`, istog spiska koji server validira.
 * `dynamicParams = false`: nepoznat slug je 404, ne prazna stranica.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return UPCOMING_GAME_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isUpcomingGameSlug(slug)) return {};
  const copy = sr.games[slug];
  return {
    title: `${copy.name} · Kartaonica`,
    description: `${copy.status} ${copy.body}`,
  };
}

export default async function UpcomingGamePage({ params }: Props) {
  const { slug } = await params;
  if (!isUpcomingGameSlug(slug)) notFound();
  return <TeaserScreen slug={slug} />;
}
