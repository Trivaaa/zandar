/**
 * Dijelovi imena za prelom na bočnom sjedištu (QA 2026-11-09 B9, 2026-10-24 B9).
 *
 * Nadimci iz generatora su često spojeni velikim slovom („KomandantŠef",
 * „MajstorKap"). Prelom ide na tom spoju i na razmaku, ne nasred sloga:
 * pozivalac crta dijelove sa `<wbr>` između, a CSS lomi riječ tek kad jedan
 * dio sam ne stane u red (`overflow-wrap: break-word`).
 */
export function nameBreakParts(name: string): string[] {
  return name.split(/(?<=\p{Ll})(?=\p{Lu})/u).filter((p) => p.length > 0);
}
