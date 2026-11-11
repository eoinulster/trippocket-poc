export const categories = [
  "flight",
  "train",
  "hotel",
  "passport",
  "card",
  "ticket",
  "other",
] as const;
export type Category = (typeof categories)[number];
export interface Item {
  id: string;
  category: Category;
  title: string;
  provider: string;
  reference: string;
  date: string;
  time: string;
  endDate: string;
  from: string;
  to: string;
  location: string;
  holder: string;
  seat: string;
  notes: string;
  qr: string;
  image: string;
  pinned: boolean;
}
export interface Trip {
  id: string;
  name: string;
  destination: string;
  start: string;
  end: string;
  color: string;
  items: Item[];
}
export interface Wallet {
  trips: Trip[];
}
export const labels: Record<Category, string> = {
  flight: "Flights",
  train: "Trains",
  hotel: "Stays",
  passport: "Identity",
  card: "Cards",
  ticket: "Tickets",
  other: "Other",
};
export const providers: Record<Category, string[]> = {
  flight: [
    "Aer Lingus",
    "Ryanair",
    "British Airways",
    "easyJet",
    "Lufthansa",
    "Air France",
    "Emirates",
    "KLM",
    "Other airline",
  ],
  train: [
    "Eurostar",
    "Avanti West Coast",
    "LNER",
    "GWR",
    "Irish Rail",
    "SNCF",
    "Deutsche Bahn",
    "Other rail service",
  ],
  hotel: ["Hotel", "Airbnb", "Booking.com", "Other stay"],
  passport: ["Passport", "National ID", "Driving licence"],
  card: ["Visa", "Mastercard", "American Express", "Travel card", "Other card"],
  ticket: ["Concert", "Museum", "Theatre", "Event", "Attraction"],
  other: ["Insurance", "Car rental", "Ferry", "Bus", "Restaurant", "Other"],
};
export function blankItem(category: Category = "flight"): Item {
  return {
    id: crypto.randomUUID(),
    category,
    title: "",
    provider: "",
    reference: "",
    date: "",
    time: "",
    endDate: "",
    from: "",
    to: "",
    location: "",
    holder: "",
    seat: "",
    notes: "",
    qr: "",
    image: "",
    pinned: false,
  };
}
export function missingFields(item: Item): string[] {
  const fields: string[] = [];
  if (!item.title.trim()) fields.push("a title");
  if (!item.reference.trim())
    fields.push(
      item.category === "passport"
        ? "document number"
        : item.category === "card"
          ? "last four digits"
          : "reference number",
    );
  if (
    ["flight", "train", "hotel", "ticket"].includes(item.category) &&
    !item.date
  )
    fields.push("date");
  if (["flight", "train"].includes(item.category)) {
    if (!item.from) fields.push("departure");
    if (!item.to) fields.push("destination");
    if (!item.time) fields.push("departure time");
  }
  if (item.category === "hotel" && !item.location) fields.push("address");
  return fields;
}
export const formatDate = (
  date: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) =>
  date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-IE", opts)
    : "Date to add";
export function demoWallet(): Wallet {
  const make = (data: Partial<Item>) => ({ ...blankItem(), ...data });
  return {
    trips: [
      {
        id: crypto.randomUUID(),
        name: "A little London escape",
        destination: "London, United Kingdom",
        start: "2026-12-04",
        end: "2026-12-07",
        color: "london",
        items: [
          make({
            category: "flight",
            title: "Dublin to London",
            provider: "Aer Lingus",
            reference: "DEMO42",
            date: "2026-12-04",
            time: "09:40",
            from: "DUB · Dublin",
            to: "LHR · London Heathrow",
            seat: "12A",
            holder: "Alex Example",
            notes:
              "Fictional booking · Terminal 2. Flight EI 154. Boarding time 09:10.",
            pinned: true,
          }),
          make({
            category: "train",
            title: "Heathrow to Paddington",
            provider: "GWR",
            reference: "DEMO-RAIL",
            date: "2026-12-04",
            time: "12:15",
            from: "Heathrow Airport",
            to: "London Paddington",
            notes:
              "Fictional example. Standard class. Check live departure boards.",
          }),
          make({
            category: "hotel",
            title: "The Greenhouse Hotel",
            provider: "Hotel",
            reference: "DEMO-STAY",
            date: "2026-12-04",
            endDate: "2026-12-07",
            time: "15:00",
            location: "14 Example Lane, London",
            holder: "Alex Example",
            notes: "Fictional hotel · Check-out 11:00. Breakfast included.",
          }),
          make({
            category: "ticket",
            title: "An evening at the theatre",
            provider: "Theatre",
            reference: "DEMO-SHOW",
            date: "2026-12-05",
            time: "19:30",
            location: "Example Theatre, West End",
            seat: "Stalls · G14",
            qr: "TRIPPOCKET:DEMO:NOT-A-VALID-TICKET",
            notes: "Demo QR only — not valid for admission.",
            pinned: true,
          }),
        ],
      },
      {
        id: crypto.randomUUID(),
        name: "A weekend by the sea",
        destination: "Lisbon, Portugal",
        start: "2027-03-12",
        end: "2027-03-15",
        color: "lisbon",
        items: [],
      },
    ],
  };
}
export const exampleEmail = `Your Aer Lingus booking is confirmed!\nBooking reference: EXMP42\nPassenger: Alex Example\nFlight: EI 154\nFrom: Dublin (DUB)\nTo: London Heathrow (LHR)\nDate: 2026-12-04\nDeparture: 09:40\nSeat: 12A\nTerminal 2. Please arrive two hours before departure.\nThis is fictional demo information.`;
