import { portionValue, type FoodProduct } from "@calwise/shared/food";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTRPC } from "./lib/trpc";

const BarcodeScanner = lazy(() => import("./scanner/barcode-scanner"));

const number = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 });
function display(value: number | null) {
  return value === null ? "brak danych" : number.format(value);
}

function ProductDetails({ product }: { product: FoodProduct }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 650px)").matches)
      panel.current?.scrollIntoView({ block: "start" });
  }, []);
  const [amount, setAmount] = useState("100");
  const grams = Number(amount.replace(",", "."));
  const valid = Number.isFinite(grams) && grams > 0 && grams <= 10000;
  return (
    <aside ref={panel} className="details" aria-label="Wybrany produkt">
      <p className="eyebrow">TWOJA PORCJA</p>
      <h2>{product.name}</h2>
      <p className="muted">
        {product.brand || "Marka niepodana"}
        {product.quantity && ` · ${product.quantity}`}
      </p>
      <div className="portion-field">
        <label htmlFor="portion">Ile jesz lub pijesz?</label>
        <div className="portion-input">
          <input
            id="portion"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!valid}
            aria-describedby="portion-help"
          />
          <span>g / ml</span>
        </div>
        <p id="portion-help" className="small muted">
          Użyj tej samej jednostki co na etykiecie. Nie przeliczamy gramów na mililitry.
        </p>
      </div>
      {!valid && (
        <p role="alert" className="error-text">
          Wpisz ilość większą od 0, maksymalnie 10 000.
        </p>
      )}
      <div className="portion-energy">
        <strong>{display(valid ? portionValue(product.kcal, grams) : null)}</strong>
        <span>kcal w porcji</span>
      </div>
      <div className="portion-macros">
        {(
          [
            ["Białko", product.protein],
            ["Węglowodany", product.carbs],
            ["Tłuszcz", product.fat],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>
              {display(valid ? portionValue(value, grams) : null)}
              {valid && value !== null && " g"}
            </strong>
          </div>
        ))}
      </div>
      <a
        className="source-link"
        href={`https://world.openfoodfacts.org/product/${product.code}`}
        target="_blank"
        rel="noreferrer"
      >
        Sprawdź produkt w Open Food Facts ↗
      </a>
      <p className="small muted">
        Dane dodaje społeczność. Przed liczeniem kalorii porównaj je z etykietą swojego produktu.
      </p>
    </aside>
  );
}

export default function App() {
  const trpc = useTRPC();
  const [mode, setMode] = useState<"search" | "scan">("scan");
  const [text, setText] = useState("");
  const [search, setSearch] = useState({ query: "", page: 1 });
  const [selected, setSelected] = useState<FoodProduct | null>(null);
  const results = useQuery({
    ...trpc.food.search.queryOptions(search),
    enabled: search.query.length >= 2,
    retry: false,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  function submit(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2 || trimmed.length > 100) return;
    setText(query);
    setSelected(null);
    if (trimmed === search.query && search.page === 1) {
      void results.refetch();
    } else setSearch({ query: trimmed, page: 1 });
  }
  return (
    <div className="shell">
      <header className="header">
        <a className="wordmark" href="/" aria-label="Calwise, strona główna">
          <span className="logo">c</span>calwise<span className="logo-dot">.</span>
        </a>
        <span className="header-note">Mniej szukania. Więcej świadomości.</span>
        <span className="country">
          <span className="flag" /> Polska
        </span>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">
            <span className="status-dot" /> WIESZ, CO JESZ
          </p>
          <h1>
            Znajdź produkt.
            <br />
            <span>Policz swoją porcję.</span>
          </h1>
          <p className="intro">
            Zeskanuj kod kreskowy lub wpisz nazwę produktu. Sprawdź kalorie i przelicz je na swoją
            porcję.
          </p>
          <div className="input-modes" role="group" aria-label="Sposób wyszukiwania">
            <button
              aria-pressed={mode === "scan"}
              onClick={() => {
                setMode("scan");
                setSelected(null);
              }}
            >
              Skanuj kod
            </button>
            <button
              aria-pressed={mode === "search"}
              onClick={() => {
                setMode("search");
                setSelected(null);
              }}
            >
              Szukaj po nazwie
            </button>
          </div>
          {mode === "search" && (
            <>
              <form
                className="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(text);
                }}
                role="search"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 5 5" />
                </svg>
                <label className="sr-only" htmlFor="search">
                  Nazwa produktu lub marki
                </label>
                <input
                  id="search"
                  type="search"
                  placeholder="np. skyr, Piątnica, mleko owsiane"
                  value={text}
                  minLength={2}
                  maxLength={100}
                  onChange={(event) => setText(event.target.value)}
                  autoComplete="off"
                />
                <button type="submit" disabled={text.trim().length < 2 || results.isFetching}>
                  {results.isFetching ? "Szukam…" : "Szukaj"}
                  <span aria-hidden="true"> ↗</span>
                </button>
              </form>
              <div className="suggestions">
                <span>Spróbuj</span>
                {["Skyr", "Piątnica", "Mleko owsiane", "Serek wiejski"].map((term) => (
                  <button key={term} onClick={() => submit(term)} disabled={results.isFetching}>
                    {term}
                    <span aria-hidden="true"> ↗</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="workspace" aria-label="Wyniki wyszukiwania">
          <div className="results">
            {mode === "scan" ? (
              <Suspense fallback={<div className="empty">Ładowanie skanera…</div>}>
                <BarcodeScanner onSelect={setSelected} onClear={() => setSelected(null)} />
              </Suspense>
            ) : (
              <>
                <div className="section-heading">
                  <h2>
                    {search.query
                      ? `Wyniki dla „${search.query}”`
                      : "Zacznij od tego, co masz w lodówce"}
                  </h2>
                  <span className="small muted">
                    {search.query ? `Strona ${search.page}` : "WYSZUKIWANIE PO NAZWIE"}
                  </span>
                </div>
                <div aria-live="polite" aria-busy={results.isFetching}>
                  {!search.query && (
                    <div className="empty">
                      <span className="empty-icon" aria-hidden="true">
                        ⌕
                      </span>
                      <h3>Twoje jedzenie, bez zgadywania</h3>
                      <p>
                        Wyszukaj produkt, sprawdź wartości odżywcze
                        <br />i przelicz je na swoją porcję.
                      </p>
                      <span className="data-note">
                        Prawdziwe dane z Open Food Facts. Bez przykładowych produktów.
                      </span>
                    </div>
                  )}
                  {results.isFetching && (
                    <div className="empty">
                      <span className="spinner" />
                      <h3>Szukamy w Open Food Facts…</h3>
                      <p>Może to potrwać kilka sekund.</p>
                    </div>
                  )}
                  {!results.isFetching && results.isError && (
                    <div className="empty">
                      <h3>Nie udało się pobrać produktów</h3>
                      <p>Baza może być chwilowo niedostępna. Spróbuj ponownie za chwilę.</p>
                      <button
                        className="secondary"
                        onClick={() => {
                          void results.refetch();
                        }}
                      >
                        Spróbuj ponownie
                      </button>
                    </div>
                  )}
                  {!results.isFetching && !results.isError && results.data && (
                    <>
                      {results.data.products.length === 0 ? (
                        <div className="empty">
                          <h3>Nie znaleźliśmy produktów</h3>
                          <p>
                            Spróbuj krótszej nazwy albo samej marki.
                            <br />
                            Baza nie obejmuje wszystkich produktów w Polsce.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="nutrition-note">
                            Wartości na 100 g / 100 ml, zgodnie z etykietą. Wybierz produkt, aby
                            policzyć porcję.
                          </p>
                          <div className="product-list">
                            {results.data.products.map((product) => (
                              <button
                                className={`product ${selected?.code === product.code ? "selected" : ""}`}
                                key={product.code}
                                onClick={() => setSelected(product)}
                                aria-pressed={selected?.code === product.code}
                              >
                                <div className="product-top">
                                  <div>
                                    <span className="brand">
                                      {product.brand || "Marka niepodana"}
                                      {product.quantity && ` · ${product.quantity}`}
                                    </span>
                                    <h3>{product.name}</h3>
                                  </div>
                                  <span className="product-energy">
                                    <strong>{display(product.kcal)}</strong>
                                    <span>{product.kcal !== null ? "kcal" : "kalorie"}</span>
                                  </span>
                                </div>
                                <div className="product-bottom">
                                  <span>
                                    Białko{" "}
                                    <b>
                                      {display(product.protein)}
                                      {product.protein !== null && " g"}
                                    </b>
                                  </span>
                                  <span>
                                    Węglowodany{" "}
                                    <b>
                                      {display(product.carbs)}
                                      {product.carbs !== null && " g"}
                                    </b>
                                  </span>
                                  <span>
                                    Tłuszcz{" "}
                                    <b>
                                      {display(product.fat)}
                                      {product.fat !== null && " g"}
                                    </b>
                                  </span>
                                  <span className="product-arrow" aria-hidden="true">
                                    ↗
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {(search.page > 1 || results.data.hasMore) && (
                        <nav className="pagination" aria-label="Strony wyników">
                          <button
                            className="secondary"
                            disabled={search.page === 1}
                            onClick={() => {
                              setSelected(null);
                              setSearch({ ...search, page: search.page - 1 });
                            }}
                          >
                            ← Poprzednia
                          </button>
                          <span>{search.page}</span>
                          <button
                            className="secondary"
                            disabled={!results.data.hasMore}
                            onClick={() => {
                              setSelected(null);
                              setSearch({ ...search, page: search.page + 1 });
                            }}
                          >
                            Następna →
                          </button>
                        </nav>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {selected ? (
            <ProductDetails key={selected.code} product={selected} />
          ) : (
            <aside className="details placeholder">
              <span className="portion-symbol" aria-hidden="true">
                ⅟₁₀₀
              </span>
              <p className="eyebrow">OD ETYKIETY DO PORCJI</p>
              <h2>
                100 g to nie zawsze
                <br />
                Twoja porcja.
              </h2>
              <p>Wybierz produkt z wyników i wpisz, ile jesz. My zajmiemy się matematyką.</p>
              <div className="placeholder-rule" />
              <p className="small">Brak wartości w bazie to brak danych, nie zero kalorii.</p>
            </aside>
          )}
        </section>
      </main>
      <footer>
        <span className="footer-brand">
          calwise. <span>Prototyp wyszukiwarki i skanera</span>
        </span>
        <p>
          Dane:{" "}
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">
            Open Food Facts
          </a>{" "}
          ·{" "}
          <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">
            ODbL
          </a>
          <br />
          Dostępność w Polsce według społeczności, nie stan magazynowy sklepu.
        </p>
      </footer>
    </div>
  );
}
