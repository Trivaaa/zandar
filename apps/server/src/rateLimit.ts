/**
 * Klizni prozor u memoriji — obrazac `REACTION_COOLDOWN_MS`, ali za HTTP.
 *
 * Svjesno jednostavno: brojevi žive u procesu i resetuju se na deploy (restart =
 * hidracija). Za prijave za obavještenje to je dovoljno — štiti volumen od
 * zatrpavanja, nije zamjena za captcha ako endpoint postane meta.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** `true` = propusti (i upiši pokušaj); `false` = ključ je preko limita. */
  tryHit(key: string, now: number = Date.now()): boolean {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  /** Izbaci ključeve bez skorašnjih pokušaja, da mapa ne raste bez granice. */
  sweep(now: number = Date.now()): void {
    const since = now - this.windowMs;
    for (const [key, times] of this.hits) {
      const recent = times.filter((t) => t > since);
      if (recent.length > 0) this.hits.set(key, recent);
      else this.hits.delete(key);
    }
  }

  get size(): number {
    return this.hits.size;
  }
}
