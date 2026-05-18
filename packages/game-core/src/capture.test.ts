import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@zandar/shared-types";
import { getCaptureOptions } from "./capture";

/** Pomocna funkcija za kreiranje karte u testu. */
function card(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

describe("getCaptureOptions", () => {
  describe("J (Zandar)", () => {
    it("vraca jednu jack_clear opciju kad stol ima karte", () => {
      const played = card("clubs", "J");
      const table: Card[] = [card("hearts", "5"), card("spades", "9")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.reason).toBe("jack_clear");
      expect(options[0]?.cardIds).toEqual(["hearts-5", "spades-9"]);
    });

    it("vraca prazan niz kad J pada na prazan stol", () => {
      const played = card("clubs", "J");
      const options = getCaptureOptions(played, []);

      expect(options).toEqual([]);
    });

    it("J kupi sve, ukljucujuci drugi J na stolu", () => {
      const played = card("clubs", "J");
      const table: Card[] = [card("hearts", "J"), card("spades", "5")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.cardIds).toEqual(["hearts-J", "spades-5"]);
    });
  });

  describe("Rank match", () => {
    it("kreira opciju kad je samo jedna karta istog ranka na stolu", () => {
      const played = card("clubs", "7");
      const table: Card[] = [card("hearts", "7"), card("spades", "9")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.reason).toBe("rank_match");
      expect(options[0]?.cardIds).toEqual(["hearts-7"]);
    });

    it("kreira jednu opciju po svakoj karti istog ranka kad ih ima vise", () => {
      const played = card("clubs", "7");
      const table: Card[] = [
        card("hearts", "7"),
        card("spades", "7"),
        card("diamonds", "3"),
      ];
      const options = getCaptureOptions(played, table);

      // Ocekujemo 2 opcije (jedna za hearts-7, jedna za spades-7)
      expect(options).toHaveLength(2);
      const allCardIds = options.flatMap((o) => o.cardIds);
      expect(allCardIds).toContain("hearts-7");
      expect(allCardIds).toContain("spades-7");
    });

    it("Q kupi samo Q sa stola", () => {
      const played = card("clubs", "Q");
      const table: Card[] = [card("hearts", "Q"), card("spades", "5")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.cardIds).toEqual(["hearts-Q"]);
    });

    it("K kupi samo K sa stola", () => {
      const played = card("clubs", "K");
      const table: Card[] = [card("hearts", "K"), card("spades", "5")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.cardIds).toEqual(["hearts-K"]);
    });

    it("vraca prazan niz kad nema rank match (bez sum match jos)", () => {
      const played = card("clubs", "7");
      const table: Card[] = [card("hearts", "9"), card("spades", "5")];
      const options = getCaptureOptions(played, table);

      // 5 + 2 = 7 bi bio sum match, ali to dolazi u 4.11
      expect(options).toEqual([]);
    });
  });
  describe("Sum match", () => {
    it("kreira sum match opciju za 10 = 9 + A", () => {
      const played = card("clubs", "10");
      const table: Card[] = [card("hearts", "9"), card("spades", "A")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.reason).toBe("sum_match");
      expect(options[0]?.cardIds.sort()).toEqual(["hearts-9", "spades-A"].sort());
    });

    it("kreira tri-kartnu sum kombinaciju (10 = 5 + 3 + 2)", () => {
      const played = card("clubs", "10");
      const table: Card[] = [
        card("hearts", "5"),
        card("spades", "3"),
        card("diamonds", "2"),
      ];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.reason).toBe("sum_match");
      expect(options[0]?.cardIds).toHaveLength(3);
    });

    it("vraca sve moguce sum kombinacije (10 = 7+3 ILI 6+4)", () => {
      const played = card("clubs", "10");
      const table: Card[] = [
        card("hearts", "7"),
        card("spades", "3"),
        card("diamonds", "6"),
        card("clubs", "4"),
      ];
      const options = getCaptureOptions(played, table);

      const sumOptions = options.filter((o) => o.reason === "sum_match");
      expect(sumOptions).toHaveLength(2);
    });

    it("kombinuje rank match i sum match kad oba postoje", () => {
      // Igrac igra 7. Stol ima 7 (rank) i 4+3 (sum=7).
      const played = card("clubs", "7");
      const table: Card[] = [
        card("hearts", "7"),
        card("spades", "4"),
        card("diamonds", "3"),
      ];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(2);
      const reasons = options.map((o) => o.reason).sort();
      expect(reasons).toEqual(["rank_match", "sum_match"]);
    });

    it("PRD primjer: 10 sa stola 9 + A + A → dvije opcije, ne moze 9+A+A", () => {
      // Stol: 9, A_pik, A_herc. Igrac igra 10.
      // Validno: 9 + A_pik ILI 9 + A_herc (svaka kombinacija = 10).
      // Nije validno: 9 + A_pik + A_herc (zbir = 11).
      const played = card("clubs", "10");
      const table: Card[] = [
        card("hearts", "9"),
        card("spades", "A"),
        card("diamonds", "A"),
      ];
      const options = getCaptureOptions(played, table);

      const sumOptions = options.filter((o) => o.reason === "sum_match");
      expect(sumOptions).toHaveLength(2);
      // Sve sum opcije moraju imati tacno 2 karte
      for (const option of sumOptions) {
        expect(option.cardIds).toHaveLength(2);
      }
    });

    it("ne ukljucuje face karte (J/Q/K) u sum match", () => {
      // Igra 5. Sto: Q (nema vrijednost) i 3. Nema validne kombinacije.
      const played = card("clubs", "5");
      const table: Card[] = [card("hearts", "Q"), card("spades", "3")];
      const options = getCaptureOptions(played, table);

      expect(options).toEqual([]);
    });

    it("Q/K nemaju sum match (face karta nema numericku vrijednost)", () => {
      const played = card("clubs", "Q");
      const table: Card[] = [card("hearts", "5"), card("spades", "5")];
      const options = getCaptureOptions(played, table);

      // Q kupi samo Q. Na stolu nema Q, pa nema opcija.
      expect(options).toEqual([]);
    });

    it("J ne pravi sum match (ima vlastitu jack_clear logiku)", () => {
      const played = card("clubs", "J");
      const table: Card[] = [card("hearts", "5"), card("spades", "5")];
      const options = getCaptureOptions(played, table);

      expect(options).toHaveLength(1);
      expect(options[0]?.reason).toBe("jack_clear");
    });
  });
});