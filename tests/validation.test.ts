import { describe, it, expect } from "vitest";
// @ts-expect-error server modules use runtime validation
import {
  validateWallet,
  parseModelJSON,
  basicExtract,
} from "../server/validation.mjs";
// @ts-expect-error server module
import { ownerKey } from "../server/database.mjs";
import {
  blankItem,
  demoWallet,
  missingFields,
  exampleEmail,
} from "../src/model";
describe("import integrity", () => {
  it("does not invent missing information in basic extraction", () => {
    const item = basicExtract("hello, a holiday");
    expect(item.reference).toBe("");
    expect(item.date).toBe("");
    expect(item.qr).toBe("");
  });
  it("extracts the labelled sample", () => {
    const item = basicExtract(exampleEmail, "flight");
    expect(item.reference).toBe("EXMP42");
    expect(item.provider).toBe("Aer Lingus");
    expect(item.time).toBe("09:40");
  });
  it("never trusts a model-generated QR or image", () => {
    const item = parseModelJSON(
      '```json\n{"title":"Trip","category":"flight","qr":"invented-barcode","image":"https://example.com/a.png","date":"tomorrow","time":"27:99"}\n```',
    );
    expect(item.qr).toBe("");
    expect(item.image).toBe("");
    expect(item.date).toBe("");
    expect(item.time).toBe("");
  });
  it("limits card references to last four digits", () => {
    expect(
      parseModelJSON('{"category":"card","reference":"4111 1111 1111 1234"}')
        .reference,
    ).toBe("1234");
  });
  it("rejects unstructured model output", () => {
    expect(() => parseModelJSON("Sure, here you go")).toThrow();
  });
  it("flags missing flight details", () => {
    expect(missingFields({ ...blankItem(), title: "Flight" })).toEqual([
      "reference number",
      "date",
      "departure",
      "destination",
      "departure time",
    ]);
  });
});
describe("pocket storage boundary", () => {
  it("round-trips sample trips", () => {
    const wallet = demoWallet();
    expect(validateWallet(wallet)).toEqual(wallet);
  });
  it("rejects duplicate ids and reversed dates", () => {
    const w = demoWallet();
    w.trips[0].items[1].id = w.trips[0].items[0].id;
    expect(() => validateWallet(w)).toThrow();
    const d = demoWallet();
    d.trips[0].end = "2020-01-01";
    expect(() => validateWallet(d)).toThrow();
  });
  it("rejects active or remote image content", () => {
    const w = demoWallet();
    w.trips[0].items[0].image = "data:image/svg+xml,<script>alert(1)</script>";
    expect(() => validateWallet(w)).toThrow();
  });
  it("separates anonymous browser pockets and rejects missing tokens", () => {
    expect(() => ownerKey("")).toThrow();
    const a = crypto.randomUUID() + crypto.randomUUID();
    const b = crypto.randomUUID() + crypto.randomUUID();
    expect(ownerKey(a)).not.toEqual(ownerKey(b));
    expect(ownerKey(a)).not.toContain(a);
  });
});
