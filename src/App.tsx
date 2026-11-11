import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Ellipsis,
  FileText,
  FolderHeart,
  Home,
  ImagePlus,
  Info,
  MapPin,
  MoreHorizontal,
  Plane,
  Plus,
  ScanLine,
  Search,
  ShieldAlert,
  Sparkles,
  TrainFront,
  Trash2,
  WalletCards,
  X,
  Hotel,
  Ticket,
  IdCard,
  CreditCard,
  Pin,
  CalendarDays,
  Cloud as CloudCheck,
  CloudOff,
  LoaderCircle,
  Maximize,
  Camera,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import QRCode from "qrcode";
import {
  blankItem,
  categories,
  demoWallet,
  exampleEmail,
  formatDate,
  labels,
  missingFields,
  providers,
  type Category,
  type Item,
  type Trip,
  type Wallet,
} from "./model";
import { api, loadWallet, storeWallet } from "./storage";
import { readImage } from "./image";
const icons = {
  flight: Plane,
  train: TrainFront,
  hotel: Hotel,
  passport: IdCard,
  card: CreditCard,
  ticket: Ticket,
  other: FileText,
};
type View = "trips" | "trip" | "essentials";
const MAX_WALLET = 1800000;
function Icon({ category, size = 22 }: { category: Category; size?: number }) {
  const C = icons[category];
  return <C size={size} />;
}
function Brand({
  provider,
  category,
}: {
  provider: string;
  category: Category;
}) {
  const short =
    provider === "Aer Lingus"
      ? "☘"
      : provider === "British Airways"
        ? "BA"
        : provider === "Eurostar"
          ? "e★"
          : provider === "Ryanair"
            ? "RY"
            : provider === "GWR"
              ? "GWR"
              : null;
  return (
    <span
      className={"brand-icon " + category}
      aria-label={provider || labels[category]}
    >
      {short || <Icon category={category} />}
    </span>
  );
}
function LondonArt() {
  return (
    <svg
      className="city-art"
      viewBox="0 0 440 210"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="310" cy="68" r="43" fill="#f7dca6" />
      <path d="M20 174h410v36H20z" fill="#51847a" />
      <path
        d="m32 161 12-4 13 5 14-9 17 6 14-2 14 7 14-5 13 4 13-3 13 3 11-7 15 4 18-4 14 5 13-6 13 9 20-4 17 5 15-6 20 3 20-5 21 7 18-4 21 5"
        stroke="#a2c0ab"
        strokeWidth="3"
      />
      <path
        d="M38 150V106h36v44M44 106V97h24v9M90 150V84h22v66M115 150V62h25v88M121 62V48h13v14M127 48V29"
        fill="#284f45"
        stroke="#284f45"
        strokeWidth="3"
      />
      <circle cx="127" cy="83" r="8" fill="#f1d49b" />
      <path
        d="M127 78v5l4 2M151 150V108h48v42M157 108V99h36v9M174 99V88M211 150V119h45v31"
        stroke="#284f45"
        strokeWidth="3"
        fill="#284f45"
      />
      <circle cx="318" cy="115" r="48" stroke="#f0e3c6" strokeWidth="3" />
      <circle cx="318" cy="115" r="4" fill="#f0e3c6" />
      <path
        d="m299 167 19-52 20 52M270 115h96M318 67v96M284 81l68 68M284 149l68-68"
        stroke="#f0e3c6"
        strokeWidth="2"
      />
      <path
        d="M72 184q85 14 166 0t153 0M130 197q72 10 161 0"
        stroke="#a4c4b2"
        strokeWidth="2"
      />
      <path d="m368 42 10 2 22-16-12 22-20 3 9-7z" fill="#f7f4e6" />
    </svg>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function App() {
  const [wallet, setWallet] = useState<Wallet>({ trips: [] });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("trips");
  const [tripId, setTripId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [modal, setModal] = useState<"add" | "trip" | "info" | "data" | null>(
    null,
  );
  const [edit, setEdit] = useState<Item | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [sync, setSync] = useState("Starting…");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const walletRef = useRef(wallet);
  const writeQueue = useRef(Promise.resolve());
  const serverQueue = useRef(Promise.resolve());
  const generation = useRef(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [tripEdit, setTripEdit] = useState<Trip | null>(null);
  const trip = wallet.trips.find((t) => t.id === tripId);
  const allItems = wallet.trips.flatMap((t) =>
    t.items.map((i) => ({ ...i, tripName: t.name, tripId: t.id })),
  );
  function notify(text: string) {
    setToast(text);
  }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const local = await loadWallet();
        let data = local;
        if (!data) {
          try {
            data = (await api("wallet")).wallet;
          } catch {}
        }
        if (cancelled) return;
        const initial = data || demoWallet();
        walletRef.current = initial;
        setWallet(initial);
        setReady(true);
        setSync(local ? "Saved on this device" : "Ready");
        if (!data) void persist(initial);
        else if (local) void syncServer(initial);
      } catch {
        if (cancelled) return;
        const initial = demoWallet();
        walletRef.current = initial;
        setWallet(initial);
        setReady(true);
        setSync("Storage unavailable");
        notify(
          "Your browser blocked local storage. Changes may not survive closing this page.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (ready && online) void syncServer(walletRef.current);
  }, [online]);
  function syncServer(next: Wallet) {
    const seq = ++generation.current;
    serverQueue.current = serverQueue.current
      .catch(() => {})
      .then(async () => {
        if (seq !== generation.current) return;
        try {
          await api("wallet", { wallet: next }, "PUT");
          if (seq === generation.current) setSync("Saved to cloud");
        } catch {
          if (seq === generation.current) setSync("Saved on this device");
        }
      });
    return serverQueue.current;
  }
  function persist(next: Wallet) {
    if (JSON.stringify(next).length > MAX_WALLET) {
      notify("Your demo pocket is full. Remove a photo before adding another.");
      return Promise.resolve(false);
    }
    walletRef.current = next;
    setWallet(next);
    setSync("Saving…");
    writeQueue.current = writeQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          await storeWallet(next);
          setSync("Saved on this device");
          void syncServer(next);
        } catch {
          setSync("Not saved");
          notify(
            "Storage is full or unavailable. Export your pocket before closing.",
          );
        }
      });
    return writeQueue.current.then(() => true);
  }
  function updateItem(item: Item) {
    if (!trip) return;
    void persist({
      ...walletRef.current,
      trips: walletRef.current.trips.map((t) =>
        t.id === trip.id
          ? {
              ...t,
              items: t.items.some((i) => i.id === item.id)
                ? t.items.map((i) => (i.id === item.id ? item : i))
                : [...t.items, item],
            }
          : t,
      ),
    }).then((ok) => {
      if (ok) {
        setModal(null);
        setEdit(null);
        setSelected(null);
        notify("Added to your trip");
      }
    });
  }
  function openTrip(t: Trip) {
    setTripId(t.id);
    setView("trip");
    setFilter("all");
    setQuery("");
    window.scrollTo(0, 0);
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(walletRef.current, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "trippocket-demo.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Pocket exported");
  }
  async function reset() {
    if (
      !confirm(
        "Delete all trips and photos from this device and its cloud pocket? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    await persist({ trips: [] });
    await serverQueue.current;
    setBusy(false);
    setModal(null);
    setView("trips");
    notify("Pocket cleared");
  }
  async function removeItem(item: Item) {
    if (!trip || !confirm("Remove “" + item.title + "” from this trip?"))
      return;
    await persist({
      ...walletRef.current,
      trips: walletRef.current.trips.map((t) =>
        t.id === trip.id
          ? { ...t, items: t.items.filter((i) => i.id !== item.id) }
          : t,
      ),
    });
    setSelected(null);
    notify("Item removed");
  }
  const filtered = (
    view === "essentials"
      ? allItems.filter(
          (i) => i.pinned || i.category === "passport" || i.category === "card",
        )
      : trip?.items || []
  ).filter(
    (i) =>
      (filter === "all" || i.category === filter) &&
      [i.title, i.provider, i.reference, i.location, i.from, i.to]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (!ready)
    return (
      <div className="loading">
        <div className="brand">
          <img src="/icon.svg" alt="" />
          TripPocket
        </div>
        <LoaderCircle className="spin" />
        <p>Getting your pocket ready…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => {
            setView("trips");
            setQuery("");
          }}
        >
          <img src="/icon.svg" alt="" />
          TripPocket<span className="brand-dot">.</span>
        </button>
        <p className="sidebar-caption">LESS SEARCHING. MORE GOING.</p>
        <nav>
          <button
            className={view !== "essentials" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("trips");
              setQuery("");
            }}
          >
            <FolderHeart size={20} />
            My trips<span>{wallet.trips.length}</span>
          </button>
          <button
            className={view === "essentials" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("essentials");
              setFilter("all");
              setQuery("");
            }}
          >
            <WalletCards size={20} />
            Quick pocket
          </button>
        </nav>
        <div className="sidebar-trips">
          <p>YOUR NEXT ADVENTURES</p>
          {wallet.trips.map((t) => (
            <button key={t.id} onClick={() => openTrip(t)}>
              <span className={"destination-dot " + t.color} />
              <span>{t.destination.split(",")[0]}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <span>
              One pocket.
              <br />A little less “where is it?”
            </span>
            <Plane size={34} strokeWidth={1} />
          </div>
          <button className="nav-item" onClick={() => setModal("info")}>
            <Info size={19} />
            About this prototype
          </button>
          <button className="profile" onClick={() => setModal("data")}>
            <span className="avatar">A</span>
            <span>
              Adventure mode<small>No account needed</small>
            </span>
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            My pocket <ChevronRight size={14} />
            <strong>
              {view === "trips"
                ? "My trips"
                : view === "essentials"
                  ? "Quick pocket"
                  : trip?.destination.split(",")[0]}
            </strong>
          </span>
          <span className="sync-label">
            {sync === "Saved to cloud" ? (
              <CloudCheck size={16} />
            ) : (
              <CloudOff size={16} />
            )}
            <span>{online ? sync : "Offline · on this device"}</span>
          </span>
          <button className="mobile-brand" onClick={() => setView("trips")}>
            <img src="/icon.svg" alt="TripPocket home" />
          </button>
          <button
            className="icon-button"
            aria-label="Pocket settings"
            onClick={() => setModal("data")}
          >
            <span className="avatar small">A</span>
          </button>
        </header>
        <div className="prototype-banner">
          <ShieldAlert size={17} />
          <p>
            <strong>A little heads-up: this is a prototype.</strong> Use made-up
            details only. No real passports, card numbers or private booking
            emails.
          </p>
          <button onClick={() => setModal("info")}>
            Why?
            <ArrowUpRight size={14} />
          </button>
        </div>
        <main>
          {view === "trips" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR NEXT CHAPTER</p>
                  <h1>Away you go.</h1>
                  <p>Your plans, passes and little essentials. All together.</p>
                </div>
                <button
                  className="primary desktop-add"
                  onClick={() => {
                    setTripEdit(null);
                    setModal("trip");
                  }}
                >
                  <Plus size={19} />
                  New trip
                </button>
              </div>
              <div className="section-label">
                <h2>
                  Your trips <span>{wallet.trips.length}</span>
                </h2>
                <span>A place for every adventure</span>
              </div>
              <div className="trip-grid">
                {wallet.trips.map((t, index) => (
                  <button
                    key={t.id}
                    className="trip-card"
                    onClick={() => openTrip(t)}
                  >
                    <div className={"trip-cover " + t.color}>
                      {t.color === "london" ? (
                        <LondonArt />
                      ) : (
                        <div className="sunscape">
                          <i />
                          <span />
                          <b />
                          <em />
                        </div>
                      )}
                      <span className="trip-tag">
                        {t.end < new Date().toISOString().slice(0, 10)
                          ? "PAST TRIP"
                          : index === 0
                            ? "UP NEXT"
                            : "ON THE HORIZON"}
                      </span>
                      <span className="cover-location">
                        {t.destination.split(",")[0]}
                        <small>
                          {t.destination.split(",").slice(1).join(",").trim() ||
                            "Your next destination"}
                        </small>
                      </span>
                      <span className="round-arrow">
                        <ArrowUpRight size={22} />
                      </span>
                    </div>
                    <div className="trip-card-body">
                      <h3>{t.name}</h3>
                      <p>
                        <CalendarDays size={15} />
                        {formatDate(t.start)} –{" "}
                        {formatDate(t.end, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <div className="trip-card-footer">
                        <span className="mini-icons">
                          {[...new Set(t.items.map((i) => i.category))]
                            .slice(0, 4)
                            .map((c) => (
                              <span key={c}>
                                <Icon category={c} size={15} />
                              </span>
                            ))}
                        </span>
                        <span>
                          {t.items.length
                            ? `${t.items.length} things in your pocket`
                            : "A fresh pocket, ready for plans"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  className="new-trip-card"
                  onClick={() => {
                    setTripEdit(null);
                    setModal("trip");
                  }}
                >
                  <span>
                    <Plus size={26} />
                  </span>
                  <h3>Where to next?</h3>
                  <p>Give your next trip a little home.</p>
                  <b>
                    Create a trip <ArrowRight size={16} />
                  </b>
                </button>
              </div>
              <section className="how-section">
                <div>
                  <p className="eyebrow">PACK LIGHT. FEEL READY.</p>
                  <h2>
                    Out of your inbox.
                    <br />
                    Into your pocket.
                  </h2>
                  <p>
                    A booking email, a ticket photo, a note.
                    <br />
                    Bring it all together before you go.
                  </p>
                </div>
                <div className="how-steps">
                  <div>
                    <span>
                      <Copy size={20} />
                    </span>
                    <section>
                      <h3>Drop in the details</h3>
                      <p>Paste a confirmation or snap a photo.</p>
                    </section>
                    <b>01</b>
                  </div>
                  <div>
                    <span>
                      <Sparkles size={20} />
                    </span>
                    <section>
                      <h3>Give it a quick check</h3>
                      <p>We organise it. You make sure it’s right.</p>
                    </section>
                    <b>02</b>
                  </div>
                  <div>
                    <span>
                      <ScanLine size={20} />
                    </span>
                    <section>
                      <h3>Ready when you need it</h3>
                      <p>Open your pass. Big, clear and close to hand.</p>
                    </section>
                    <b>03</b>
                  </div>
                </div>
              </section>
              <div className="sample-note">
                <Info size={16} />
                The London trip contains fictional examples. Make it your own
                with demo details.
              </div>
            </>
          ) : (
            <>
              <button
                className="back-link"
                onClick={() => {
                  setView("trips");
                  setQuery("");
                }}
              >
                <ArrowLeft size={17} />
                All trips
              </button>
              <div className="page-heading trip-heading">
                <div>
                  <p className="eyebrow">
                    {view === "essentials"
                      ? "THE THINGS YOU REACH FOR"
                      : "YOUR TRIP, TOGETHER"}
                  </p>
                  <h1>{view === "essentials" ? "Quick pocket" : trip?.name}</h1>
                  <p>
                    {view === "essentials" ? (
                      "Pinned passes, identity and cards, across all your trips."
                    ) : (
                      <>
                        <MapPin size={16} />
                        {trip?.destination}
                        <span className="dot-separator">·</span>
                        {formatDate(trip?.start || "")} –{" "}
                        {formatDate(trip?.end || "")}
                      </>
                    )}
                  </p>
                </div>
                {view === "trip" && (
                  <div className="heading-actions">
                    <button
                      className="icon-button outlined"
                      aria-label="Edit trip"
                      onClick={() => {
                        setTripEdit(trip || null);
                        setModal("trip");
                      }}
                    >
                      <Ellipsis />
                    </button>
                    <button
                      className="primary desktop-add"
                      onClick={() => {
                        setEdit(null);
                        setModal("add");
                      }}
                    >
                      <Plus size={19} />
                      Add to trip
                    </button>
                  </div>
                )}
              </div>
              {view === "trip" && (
                <div className="trip-summary">
                  <div className="summary-symbol">
                    <FolderHeart size={26} />
                  </div>
                  <div>
                    <h3>
                      {trip?.items.length
                        ? `${trip.items.length} things, one happy pocket.`
                        : "Your pocket is ready for its first plan."}
                    </h3>
                    <p>
                      {trip?.items.some((i) => missingFields(i).length)
                        ? "Some details are still missing. Open an item to check."
                        : "A little preparation. A lot more peace of mind."}
                    </p>
                  </div>
                  <span className="demo-pill">DEMO TRIP</span>
                </div>
              )}
              <div className="filter-row">
                <div className="filters">
                  <button
                    className={filter === "all" ? "selected" : ""}
                    onClick={() => setFilter("all")}
                  >
                    All items{" "}
                    <span>
                      {view === "essentials"
                        ? allItems.filter(
                            (i) =>
                              i.pinned ||
                              ["passport", "card"].includes(i.category),
                          ).length
                        : trip?.items.length || 0}
                    </span>
                  </button>
                  {categories
                    .filter((c) =>
                      (view === "essentials"
                        ? allItems
                        : trip?.items || []
                      ).some((i) => i.category === c),
                    )
                    .map((c) => (
                      <button
                        className={filter === c ? "selected" : ""}
                        key={c}
                        onClick={() => setFilter(c)}
                      >
                        <Icon category={c} size={16} />
                        {labels[c]}
                      </button>
                    ))}
                </div>
                <label className="search-box">
                  <Search size={18} />
                  <input
                    aria-label="Search your pocket"
                    placeholder="Find a reference, place…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="items-grid">
                {filtered.map((item) => (
                  <button
                    className={"item-card " + item.category}
                    key={item.id}
                    onClick={() => {
                      if ("tripId" in item) setTripId(String(item.tripId));
                      setSelected(item);
                    }}
                  >
                    <div className="item-card-top">
                      <Brand
                        provider={item.provider}
                        category={item.category}
                      />
                      <span>{item.provider || labels[item.category]}</span>
                      {item.pinned && <Pin size={15} className="pin-icon" />}
                      <ChevronRight size={18} />
                    </div>
                    <div className="item-content">
                      <p className="item-category">
                        {labels[item.category]}
                        {"tripName" in item ? ` · ${item.tripName}` : ""}
                      </p>
                      <h3>{item.title}</h3>
                      {item.from && item.to ? (
                        <div className="journey">
                          <span>{item.from.split(" · ")[0]}</span>
                          <ArrowRight size={20} />
                          <span>{item.to.split(" · ")[0]}</span>
                        </div>
                      ) : (
                        <p className="item-description">
                          {item.location ||
                            item.holder ||
                            item.notes ||
                            "Tap to view details"}
                        </p>
                      )}
                      <div className="item-meta">
                        <span>
                          <CalendarDays size={14} />
                          {item.date ? formatDate(item.date) : "No date added"}
                        </span>
                        {item.time && <strong>{item.time}</strong>}
                      </div>
                    </div>
                    <div className="item-card-bottom">
                      <span>
                        <small>
                          {item.category === "card" ? "LAST FOUR" : "REFERENCE"}
                        </small>
                        <b>{item.reference || "Add a reference"}</b>
                      </span>
                      {item.qr ? (
                        <ScanLine size={24} />
                      ) : missingFields(item).length ? (
                        <span className="needs-check">Check details</span>
                      ) : (
                        <CheckCircle2 size={19} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <FolderHeart size={40} />
                  <h2>
                    {query
                      ? "Nothing matches just yet"
                      : view === "essentials"
                        ? "Keep the good stuff close"
                        : "A fresh pocket"}
                  </h2>
                  <p>
                    {query
                      ? "Try a different place, provider or reference."
                      : view === "essentials"
                        ? "Open an item and pin it for easy access here."
                        : "Add a booking email, a photo, or fill in the details yourself."}
                  </p>
                  {view === "trip" && !query && (
                    <button
                      className="primary"
                      onClick={() => {
                        setEdit(null);
                        setModal("add");
                      }}
                    >
                      <Plus size={18} />
                      Add your first item
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <footer>
            <span>
              <img src="/icon.svg" alt="" />
              Made for the journey.
            </span>
            <span>TripPocket · A proof of concept</span>
          </footer>
        </main>
        <nav className="mobile-nav">
          <button
            className={view !== "essentials" ? "active" : ""}
            onClick={() => setView("trips")}
          >
            <FolderHeart size={21} />
            My trips
          </button>
          <button
            className="mobile-add"
            onClick={() => {
              setEdit(null);
              setTripEdit(null);
              setModal(view === "trip" ? "add" : "trip");
            }}
          >
            <Plus size={23} />
            {view === "trip" ? "Add item" : "New trip"}
          </button>
          <button
            className={view === "essentials" ? "active" : ""}
            onClick={() => {
              setView("essentials");
              setQuery("");
              setFilter("all");
            }}
          >
            <WalletCards size={21} />
            Quick pocket
          </button>
        </nav>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal === "trip" && (
        <TripForm
          initial={tripEdit}
          onClose={() => setModal(null)}
          onSave={async (t) => {
            await persist({
              ...walletRef.current,
              trips: tripEdit
                ? walletRef.current.trips.map((x) => (x.id === t.id ? t : x))
                : [...walletRef.current.trips, t],
            });
            setModal(null);
            openTrip(t);
            notify(tripEdit ? "Trip updated" : "Your new pocket is ready");
          }}
          onDelete={
            tripEdit
              ? async () => {
                  if (!confirm("Delete this trip and all its items?")) return;
                  await persist({
                    ...walletRef.current,
                    trips: walletRef.current.trips.filter(
                      (t) => t.id !== tripEdit.id,
                    ),
                  });
                  setModal(null);
                  setView("trips");
                }
              : undefined
          }
        />
      )}
      {modal === "add" && trip && (
        <ItemForm
          initial={edit}
          onClose={() => {
            setModal(null);
            setEdit(null);
          }}
          onSave={updateItem}
        />
      )}
      {selected && (
        <Pass
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEdit(selected);
            setSelected(null);
            setModal("add");
          }}
          onDelete={() => removeItem(selected)}
          onPin={() => {
            const next = { ...selected, pinned: !selected.pinned };
            setSelected(next);
            void persist({
              ...walletRef.current,
              trips: walletRef.current.trips.map((t) => ({
                ...t,
                items: t.items.map((i) => (i.id === next.id ? next : i)),
              })),
            });
          }}
          notify={notify}
        />
      )}
      {modal === "info" && (
        <Modal
          title="A small prototype. A big idea."
          onClose={() => setModal(null)}
        >
          <div className="modal-body prose">
            <ShieldAlert size={32} />
            <h3>Fictional details only, please.</h3>
            <p>
              TripPocket is an experiment in making travel feel easier. It is
              not a secure document wallet and it is not ready for real personal
              information.
            </p>
            <p>
              There is{" "}
              <strong>no application-level encryption or account login</strong>.
              Your pocket is saved in this browser and, when connected, in our
              database. A random device key separates demo pockets; it is not a
              substitute for secure authentication. There is no recovery or
              cross-device sign-in.
            </p>
            <p>
              When you choose “Organise details”, the text and full photo are
              sent to a public AI model via OpenRouter. The provider may retain
              input. Never send real names, birth dates, passport details, full
              card numbers or private booking emails.
            </p>
            <p>
              Always check extracted details. Photos and codes shown here are
              not replacements for official travel documents. Demo passes cannot
              be used to travel or enter an event.
            </p>
            <p>
              Cloud imports use free models only. When free limits are reached,
              you can still add and edit items yourself.
            </p>
            <button className="primary full" onClick={() => setModal(null)}>
              Got it — demo details only
            </button>
          </div>
        </Modal>
      )}
      {modal === "data" && (
        <Modal title="Your pocket" onClose={() => setModal(null)}>
          <div className="modal-body prose">
            <p>
              No passwords, no signup. This demo pocket belongs to this browser.
              Keep using this browser to come back to it.
            </p>
            <div className="status-box">
              <CloudCheck size={22} />
              <div>
                <strong>{sync}</strong>
                <p>
                  Cloud saving needs a connection. Saved details remain
                  available on this device.
                </p>
              </div>
            </div>
            <button
              className="secondary full"
              onClick={() =>
                void syncServer(walletRef.current).then(() =>
                  notify("Save attempt complete"),
                )
              }
            >
              <RefreshCw size={18} />
              Try cloud save again
            </button>
            <button className="secondary full" onClick={exportData}>
              <Download size={18} />
              Export demo pocket
            </button>
            <p className="help-text">
              The export includes all photos and details as plain JSON. Clearing
              browser storage also removes your device key.
            </p>
            <button
              className="secondary full"
              onClick={() => {
                if (
                  wallet.trips.length &&
                  !confirm("Add another copy of the sample trips?")
                )
                  return;
                void persist({
                  trips: [...walletRef.current.trips, ...demoWallet().trips],
                });
                setModal(null);
              }}
            >
              <Plus size={18} />
              Add sample trips
            </button>
            <button className="danger full" disabled={busy} onClick={reset}>
              <Trash2 size={18} />
              {busy ? "Clearing…" : "Delete all demo data"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function TripForm({
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  initial: Trip | null;
  onSave: (t: Trip) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [t, setT] = useState<Trip>(
    initial || {
      id: crypto.randomUUID(),
      name: "",
      destination: "",
      start: "",
      end: "",
      color: "london",
      items: [],
    },
  );
  function field(key: keyof Trip, value: string) {
    setT({ ...t, [key]: value });
  }
  return (
    <Modal
      title={initial ? "Edit your trip" : "Make room for an adventure"}
      onClose={onClose}
    >
      <form
        className="modal-body form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(t);
        }}
      >
        <p className="form-intro">
          A destination, a few dates, and you’re on your way.
        </p>
        <label>
          Trip name
          <input
            autoFocus
            required
            maxLength={100}
            placeholder="A little London escape"
            value={t.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          Destination
          <input
            required
            maxLength={120}
            placeholder="London, United Kingdom"
            value={t.destination}
            onChange={(e) => field("destination", e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            First day
            <input
              type="date"
              required
              value={t.start}
              onChange={(e) => field("start", e.target.value)}
            />
          </label>
          <label>
            Last day
            <input
              type="date"
              required
              min={t.start}
              value={t.end}
              onChange={(e) => field("end", e.target.value)}
            />
          </label>
        </div>
        <fieldset>
          <legend>Pick a mood</legend>
          <div className="mood-options">
            {["london", "lisbon", "alpine"].map((c, i) => (
              <button
                key={c}
                type="button"
                className={c + (t.color === c ? " chosen" : "")}
                aria-pressed={t.color === c}
                onClick={() => field("color", c)}
              >
                {["City escape", "Golden days", "Fresh air"][i]}
                {t.color === c && <Check size={15} />}
              </button>
            ))}
          </div>
        </fieldset>
        <button className="primary full" type="submit">
          {initial ? "Save changes" : "Create my trip"}
          <ArrowRight size={18} />
        </button>
        {onDelete && (
          <button className="text-danger" type="button" onClick={onDelete}>
            Delete this trip
          </button>
        )}
      </form>
    </Modal>
  );
}
function ItemForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Item | null;
  onClose: () => void;
  onSave: (i: Item) => void;
}) {
  const [stage, setStage] = useState<"input" | "review">(
    initial ? "review" : "input",
  );
  const [mode, setMode] = useState<"paste" | "photo" | "manual">("paste");
  const [item, setItem] = useState<Item>(initial || blankItem());
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const missing = missingFields(item);
  function field(key: keyof Item, value: string) {
    setItem((i) => ({ ...i, [key]: value }));
    setAccepted(false);
  }
  async function photo(file?: File) {
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    try {
      const result = await readImage(file);
      setItem((i) => ({ ...i, ...result }));
      setNote(
        result.qr
          ? "QR code found. The full photo is kept too."
          : "Photo added. No QR detected — you can still organise the surrounding text.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }
  async function extract() {
    setError("");
    setLoading(true);
    try {
      const result = await api("extract", {
        text,
        image: item.image,
        qr: item.qr,
        category: item.category,
      });
      setItem((i) => ({
        ...i,
        ...result.item,
        id: i.id,
        image: i.image,
        qr: i.qr || result.item.qr || "",
        pinned: i.pinned,
      }));
      setNote(
        result.notice ||
          "Details organised. Please check every field before saving.",
      );
      setStage("review");
    } catch (e) {
      setError(
        (e as Error).message + " You can enter the details yourself below.",
      );
    } finally {
      setLoading(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (missing.length && !accepted) return;
    onSave({
      ...item,
      title: item.title.trim() || item.provider || labels[item.category],
    });
  }
  return (
    <Modal
      title={
        initial
          ? "Edit your details"
          : stage === "input"
            ? "A new thing for your pocket"
            : "A quick check, then you’re set"
      }
      onClose={onClose}
      wide
    >
      <div className="modal-body">
        <div className="step-indicator">
          <span className="done">
            1 <b>Add details</b>
          </span>
          <i />
          <span className={stage === "review" ? "done" : ""}>
            2 <b>Check & save</b>
          </span>
        </div>
        <div className="input-warning">
          <ShieldAlert size={19} />
          <span>
            <strong>Use fictional details only.</strong> This PoC is not
            encrypted. AI imports send your text and full photo to a public
            model.
          </span>
        </div>
        {stage === "input" ? (
          <>
            <div className="input-tabs">
              <button
                className={mode === "paste" ? "active" : ""}
                onClick={() => setMode("paste")}
              >
                <Copy size={18} />
                Paste an email
              </button>
              <button
                className={mode === "photo" ? "active" : ""}
                onClick={() => setMode("photo")}
              >
                <Camera size={18} />
                Photo or QR
              </button>
              <button
                className={mode === "manual" ? "active" : ""}
                onClick={() => {
                  setMode("manual");
                  setStage("review");
                }}
              >
                <FileText size={18} />
                Add manually
              </button>
            </div>
            <label className="standalone-label">
              What are you adding?
              <select
                value={item.category}
                onChange={(e) => field("category", e.target.value)}
              >
                {categories.map((c) => (
                  <option value={c} key={c}>
                    {labels[c]}
                  </option>
                ))}
              </select>
            </label>
            {mode === "paste" ? (
              <>
                <label className="standalone-label">
                  Booking email or a few messy notes
                  <textarea
                    rows={7}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={12000}
                    placeholder="Paste a fictional booking confirmation here. We’ll pick out the reference, dates, places and the useful bits."
                  />
                </label>
                <button
                  className="text-button sample-button"
                  onClick={() => setText(exampleEmail)}
                >
                  <Sparkles size={15} />
                  Try a sample booking
                </button>
              </>
            ) : (
              <>
                <div
                  className="photo-drop"
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      inputRef.current?.click();
                  }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt="Full uploaded photo for review"
                    />
                  ) : (
                    <>
                      <ImagePlus size={33} />
                      <h3>Snap the whole thing</h3>
                      <p>
                        Include the text around the QR code.
                        <br />A ticket, sign or booking screenshot.
                      </p>
                      <span className="secondary">Choose a photo</span>
                    </>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="visually-hidden"
                  onChange={(e) => void photo(e.target.files?.[0])}
                />
                <label className="camera-option">
                  <Camera size={18} />
                  Take a photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => void photo(e.target.files?.[0])}
                  />
                </label>
                <label className="standalone-label">
                  Anything else to add? <span>(optional)</span>
                  <textarea
                    rows={2}
                    value={text}
                    maxLength={12000}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="A little context for this photo…"
                  />
                </label>
                {item.qr && (
                  <div className="qr-found">
                    <CheckCircle2 size={18} />
                    <span>
                      QR decoded: {item.qr.slice(0, 100)}
                      {item.qr.length > 100 ? "…" : ""}
                    </span>
                  </div>
                )}
              </>
            )}
            {note && <p className="help-text">{note}</p>}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary full"
              disabled={loading || photoBusy || (!text.trim() && !item.image)}
              onClick={extract}
            >
              {loading || photoBusy ? (
                <LoaderCircle className="spin" size={19} />
              ) : (
                <Sparkles size={19} />
              )}{" "}
              {photoBusy
                ? "Reading your photo…"
                : loading
                  ? "Finding the useful details…"
                  : "Organise details"}
            </button>
            <button
              className="text-button full"
              onClick={() => {
                setStage("review");
                setError("");
              }}
            >
              I’ll fill in the details myself
              <ArrowRight size={16} />
            </button>
            <p className="fine-print">
              Free AI models can make mistakes or be temporarily unavailable.
              You’re always in control of what gets saved.
            </p>
          </>
        ) : (
          <form className="form review-form" onSubmit={submit}>
            {note && (
              <div className="review-notice">
                <CheckCircle2 size={19} />
                {note}
              </div>
            )}
            <div className="form-row">
              <label>
                Type
                <select
                  aria-label="Type"
                  value={item.category}
                  onChange={(e) => field("category", e.target.value)}
                >
                  {categories.map((c) => (
                    <option value={c} key={c}>
                      {labels[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {item.category === "flight"
                  ? "Airline"
                  : item.category === "train"
                    ? "Train company"
                    : "Provider / kind"}
                <select
                  value={
                    providers[item.category].includes(item.provider)
                      ? item.provider
                      : ""
                  }
                  onChange={(e) => field("provider", e.target.value)}
                >
                  <option value="">Choose a provider</option>
                  {providers[item.category].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Provider name
              <input
                value={item.provider}
                onChange={(e) => field("provider", e.target.value)}
                maxLength={120}
                placeholder="Use the list above or type your own"
              />
            </label>
            <label>
              Give it a name
              <input
                autoFocus
                required
                maxLength={160}
                value={item.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="Dublin to London, my passport, theatre tickets…"
              />
            </label>
            <div className="form-row">
              <label>
                {item.category === "passport"
                  ? "Demo document number"
                  : item.category === "card"
                    ? "Last four digits only"
                    : "Booking / ticket reference"}
                <input
                  maxLength={item.category === "card" ? 4 : 120}
                  value={item.reference}
                  onChange={(e) =>
                    field(
                      "reference",
                      item.category === "card"
                        ? e.target.value.replace(/\D/g, "")
                        : e.target.value,
                    )
                  }
                  placeholder={item.category === "card" ? "1234" : "DEMO42"}
                />
              </label>
              <label>
                Name on booking <span>(fictional)</span>
                <input
                  maxLength={120}
                  value={item.holder}
                  onChange={(e) => field("holder", e.target.value)}
                  placeholder="Alex Example"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                {["passport", "card"].includes(item.category)
                  ? "Expiry date"
                  : "Date"}
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) => field("date", e.target.value)}
                />
              </label>
              <label>
                {item.category === "hotel" ? "Check-in time" : "Time"}
                <input
                  type="time"
                  value={item.time}
                  onChange={(e) => field("time", e.target.value)}
                />
              </label>
            </div>
            {item.category === "hotel" && (
              <label>
                Check-out date
                <input
                  type="date"
                  min={item.date}
                  value={item.endDate}
                  onChange={(e) => field("endDate", e.target.value)}
                />
              </label>
            )}
            {["flight", "train", "other"].includes(item.category) && (
              <div className="form-row">
                <label>
                  From
                  <input
                    maxLength={160}
                    value={item.from}
                    onChange={(e) => field("from", e.target.value)}
                    placeholder="Dublin (DUB)"
                  />
                </label>
                <label>
                  To
                  <input
                    maxLength={160}
                    value={item.to}
                    onChange={(e) => field("to", e.target.value)}
                    placeholder="London (LHR)"
                  />
                </label>
              </div>
            )}
            <div className="form-row">
              <label>
                Address / location
                <input
                  maxLength={300}
                  value={item.location}
                  onChange={(e) => field("location", e.target.value)}
                  placeholder="Hotel or venue address"
                />
              </label>
              <label>
                Seat / room
                <input
                  maxLength={100}
                  value={item.seat}
                  onChange={(e) => field("seat", e.target.value)}
                  placeholder="12A"
                />
              </label>
            </div>
            <label>
              Useful notes
              <textarea
                rows={3}
                maxLength={2000}
                value={item.notes}
                onChange={(e) => field("notes", e.target.value)}
                placeholder="Terminal, check-in instructions, things to remember…"
              />
            </label>
            <label>
              QR content <span>(decoded or exact original payload only)</span>
              <textarea
                rows={2}
                maxLength={3000}
                value={item.qr}
                onChange={(e) => field("qr", e.target.value)}
                placeholder="Leave empty if you do not have the original QR content"
              />
            </label>
            <p className="help-text">
              A booking reference is not a boarding-pass barcode. We only
              display a QR when its content is supplied or scanned.
            </p>
            <label className="attachment">
              <ImagePlus size={20} />
              {item.image
                ? "Replace attached photo"
                : "Attach a demo photo or document image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => void photo(e.target.files?.[0])}
              />
            </label>
            {item.image && (
              <div className="attached-preview">
                <img src={item.image} alt="Attached demo document" />
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => field("image", "")}
                >
                  Remove photo
                </button>
              </div>
            )}
            {missing.length > 0 && (
              <div className="missing-box">
                <Info size={20} />
                <div>
                  <strong>A few details may be missing</strong>
                  <p>{missing.join(" · ")}</p>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    Save anyway — I’ll add these later
                  </label>
                </div>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setStage("input");
                  setMode("paste");
                }}
              >
                Back to input
              </button>
              <button
                className="primary"
                type="submit"
                disabled={photoBusy || (!accepted && missing.length > 0)}
              >
                <Check size={18} />
                {initial ? "Save changes" : "Save to my trip"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
function Pass({
  item,
  onClose,
  onEdit,
  onDelete,
  onPin,
  notify,
}: {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  notify: (s: string) => void;
}) {
  const [qr, setQr] = useState("");
  const [bigImage, setBigImage] = useState(false);
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (item.qr)
      QRCode.toDataURL(item.qr, {
        width: 700,
        margin: 4,
        errorCorrectionLevel: "M",
      })
        .then(setQr)
        .catch(() => {
          setQr("");
          notify(
            "This QR payload is too long to display. The original content is still saved.",
          );
        });
  }, [item.qr]);
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let done = false;
    if (present && "wakeLock" in navigator)
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (done) void l.release();
          else lock = l;
        })
        .catch(() => {});
    return () => {
      done = true;
      void lock?.release();
    };
  }, [present]);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("Copied to clipboard");
    } catch {
      notify("Copy unavailable. Select and copy the reference shown.");
    }
  }
  return (
    <Modal
      title={present ? "Ready to show" : "In your pocket"}
      onClose={onClose}
    >
      <div className={"pass-body " + (present ? "presenting" : "")}>
        <div className="pass-provider">
          <Brand provider={item.provider} category={item.category} />
          <span>{item.provider || labels[item.category]}</span>
          <span className="demo-pill">DEMO</span>
        </div>
        <p className="eyebrow">{labels[item.category]}</p>
        <h2>{item.title}</h2>
        {item.from && item.to && (
          <div className="pass-route">
            <span>{item.from}</span>
            <ArrowRight size={22} />
            <span>{item.to}</span>
          </div>
        )}
        <div className="pass-reference">
          <span>
            {item.category === "card"
              ? "LAST FOUR DIGITS"
              : "REFERENCE / IDENTIFIER"}
          </span>
          <strong>{item.reference || "Not added yet"}</strong>
          {item.reference && (
            <button
              className="icon-button"
              aria-label="Copy reference"
              onClick={() => void copy(item.reference)}
            >
              <Copy size={20} />
            </button>
          )}
        </div>
        <div className="pass-fields">
          {[
            [
              "Date",
              item.date
                ? formatDate(item.date, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "",
            ],
            ["Time", item.time],
            ["Until", item.endDate ? formatDate(item.endDate) : ""],
            ["Name", item.holder],
            ["Seat / room", item.seat],
            ["Location", item.location],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
        </div>
        {qr && (
          <div className="pass-qr">
            <img
              src={qr}
              alt="QR code recreated from the saved exact payload"
            />
            <span>DEMO · NOT VALID FOR TRAVEL OR ENTRY</span>
            <button className="text-button" onClick={() => void copy(item.qr)}>
              <Copy size={14} />
              Copy QR content
            </button>
          </div>
        )}
        {item.image && (
          <button
            className={"pass-image " + (bigImage ? "expanded" : "")}
            onClick={() => setBigImage(!bigImage)}
          >
            <img src={item.image} alt="Saved full original-context photo" />
            <span>
              <Maximize size={16} />
              {bigImage ? "Reduce photo" : "Expand photo"}
            </span>
          </button>
        )}
        {item.notes && (
          <div className="pass-notes">
            <h3>Good to know</h3>
            <p>{item.notes}</p>
          </div>
        )}
        {!present && missingFields(item).length > 0 && (
          <p className="missing-inline">
            <Info size={16} />
            Still to add: {missingFields(item).join(", ")}
          </p>
        )}
        <button className="primary full" onClick={() => setPresent(!present)}>
          {present ? <X size={18} /> : <Maximize size={18} />}{" "}
          {present ? "Finish showing" : "Present this item"}
        </button>
        {!present && (
          <div className="pass-actions">
            <button className="secondary" onClick={onPin}>
              <Pin size={17} />
              {item.pinned ? "Unpin" : "Pin item"}
            </button>
            <button className="secondary" onClick={onEdit}>
              Edit details
            </button>
            <button
              className="icon-button"
              aria-label="Delete item"
              onClick={onDelete}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
        <p className="fine-print">
          Prototype only. Use the official document when travelling.
        </p>
      </div>
    </Modal>
  );
}
export default App;
