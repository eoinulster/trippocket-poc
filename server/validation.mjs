export const CATEGORIES = [
  "flight",
  "train",
  "hotel",
  "passport",
  "card",
  "ticket",
  "other",
];
export const FIELDS = [
  "title",
  "provider",
  "reference",
  "date",
  "time",
  "endDate",
  "from",
  "to",
  "location",
  "holder",
  "seat",
  "notes",
  "qr",
  "image",
];
export function cleanItem(value, { model = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("An item must be an object.");
  const out = {};
  for (const field of FIELDS) {
    const limit =
      field === "image"
        ? 600000
        : field === "notes"
          ? 2000
          : field === "qr"
            ? 3000
            : field === "title"
              ? 160
              : field === "location"
                ? 300
                : 160;
    out[field] =
      typeof value[field] === "string" ? value[field].slice(0, limit) : "";
  }
  out.category = CATEGORIES.includes(value.category) ? value.category : "other";
  out.id = typeof value.id === "string" ? value.id.slice(0, 100) : "";
  out.pinned = value.pinned === true;
  for (const key of ["date", "endDate"])
    if (out[key] && !/^\d{4}-\d{2}-\d{2}$/.test(out[key])) out[key] = "";
  if (out.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(out.time)) out.time = "";
  if (
    !model &&
    out.image &&
    !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(out.image)
  )
    throw new Error("Unsupported image format.");
  if (out.category === "card")
    out.reference = out.reference.replace(/\D/g, "").slice(-4);
  if (model) {
    out.image = "";
    out.qr = "";
    delete out.id;
    delete out.pinned;
  }
  return out;
}
export function validateWallet(value) {
  if (!value || !Array.isArray(value.trips) || value.trips.length > 30)
    throw new Error("A pocket can contain up to 30 trips.");
  let total = 0;
  const ids = new Set();
  const trips = value.trips.map((t) => {
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      t.id.length > 100 ||
      ids.has(t.id) ||
      typeof t.name !== "string" ||
      !t.name.trim() ||
      !Array.isArray(t.items)
    )
      throw new Error("Invalid trip details.");
    ids.add(t.id);
    total += t.items.length;
    if (total > 200)
      throw new Error("A demo pocket can contain up to 200 items.");
    const items = t.items.map((i) => {
      const item = cleanItem(i);
      if (!item.id || ids.has(item.id))
        throw new Error("Invalid item identifier.");
      ids.add(item.id);
      return item;
    });
    const date = (key) =>
      typeof t[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t[key])
        ? t[key]
        : "";
    const start = date("start"),
      end = date("end");
    if (!start || !end || end < start)
      throw new Error("Please check your trip dates.");
    return {
      id: t.id,
      name: t.name.slice(0, 100),
      destination: String(t.destination || "").slice(0, 120),
      start,
      end,
      color: ["london", "lisbon", "alpine"].includes(t.color)
        ? t.color
        : "london",
      items,
    };
  });
  return { trips };
}
export function parseModelJSON(text) {
  if (typeof text !== "string")
    throw new Error("The model did not return any details.");
  const start = text.indexOf("{"),
    end = text.lastIndexOf("}");
  if (start < 0 || end < start)
    throw new Error("The model could not organise these details.");
  const parsed = JSON.parse(text.slice(start, end + 1));
  return cleanItem(parsed, { model: true });
}
export function basicExtract(text, category = "other") {
  const capture = (pattern) => text.match(pattern)?.[1]?.trim() || "";
  const provider =
    [
      "Aer Lingus",
      "Ryanair",
      "British Airways",
      "easyJet",
      "Eurostar",
      "Avanti West Coast",
      "LNER",
      "GWR",
      "Irish Rail",
      "SNCF",
      "Lufthansa",
      "Air France",
      "Emirates",
      "KLM",
    ].find((p) => text.toLowerCase().includes(p.toLowerCase())) || "";
  const from = capture(/(?:^|\n)\s*from\s*:\s*([^\n]+)/i),
    to = capture(/(?:^|\n)\s*to\s*:\s*([^\n]+)/i);
  return cleanItem(
    {
      category,
      provider,
      title:
        from && to
          ? `${from} to ${to}`
          : capture(/(?:^|\n)\s*(?:title|hotel|event)\s*:\s*([^\n]+)/i) ||
            provider,
      reference: capture(
        /(?:booking\s*(?:reference|ref)|confirmation(?:\s*(?:number|code))?|reference|pnr)\s*[:#-]\s*([\w-]+)/i,
      ),
      date: capture(/\b(20\d\d-\d\d-\d\d)\b/),
      time: capture(/(?:departure|time|check[- ]in)\s*:\s*(\d{2}:\d{2})/i),
      from,
      to,
      holder: capture(/(?:passenger|guest|name)\s*:\s*([^\n]+)/i),
      seat: capture(/seat\s*:\s*([^\n]+)/i),
      location: capture(/(?:address|location)\s*:\s*([^\n]+)/i),
      notes: "",
    },
    { model: true },
  );
}
