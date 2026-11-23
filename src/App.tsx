import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Rise } from './components/Rise';
import { formatCents, parseCents } from './lib/money';
import { splitBill, type SplitResult } from './lib/split';
import { resultToText, shareLine, whatsappUrl } from './lib/summary';
import { useInView } from './lib/useInView';

interface Row {
  id: number;
  name: string;
  amount: string;
  /** True while the row plays its exit transition, just before it is removed. */
  leaving?: boolean;
}

/** Must be at least as long as the `.reveal` exit transition in index.css. */
const LEAVE_MS = 360;

export default function App() {
  const nextId = useRef(2);
  const resultRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Row[]>([{ id: 1, name: '', amount: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SplitResult | null>(null);

  /** Brings a fresh result into view once the on-screen keyboard has started closing. */
  useEffect(() => {
    if (!result) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroll = () =>
      resultRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (reduce) {
      scroll();
      return;
    }
    const id = window.setTimeout(scroll, 300);
    return () => window.clearTimeout(id);
  }, [result]);

  /** Applies a change to the rows and discards any stale error or result. */
  const updateRows = (update: (current: Row[]) => Row[]) => {
    setRows(update);
    setError(null);
    setResult(null);
  };

  const addPerson = () => updateRows((r) => [...r, { id: nextId.current++, name: '', amount: '' }]);
  const editRow = (id: number, patch: Partial<Row>) =>
    updateRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  /** Collapses the row first, then removes it once the exit transition has finished. */
  const removePerson = (id: number) => {
    editRow(id, { leaving: true });
    window.setTimeout(() => setRows((r) => r.filter((row) => row.id !== id)), LEAVE_MS);
  };

  /** Validates the form and, when valid, computes the settlement. */
  const calculate = () => {
    setResult(null);
    // Blur the focused field so both the text keyboard and the numeric keypad close.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // Rows left completely blank are ignored instead of being treated as incomplete people.
    const people = rows.filter((r) => !r.leaving && (r.name.trim() !== '' || r.amount.trim() !== ''));

    if (people.length < 2) return setError('Agregá al menos 2 personas.');
    if (people.some((r) => r.name.trim() === '')) return setError('Poné un nombre a cada persona.');

    const paid = people.map((r) => parseCents(r.amount));
    if (paid.some((p) => p === null)) return setError('Revisá los montos: usá números como 1.234,56.');
    if (paid.some((p) => p! < 0)) return setError('Los montos no pueden ser negativos.');
    if (paid.every((p) => p === 0)) return setError('Cargá al menos un pago.');

    setError(null);
    setResult(splitBill(people.map((r, i) => ({ name: r.name.trim(), paid: paid[i]! }))));
  };

  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          <Rise>
            <h1 className="hero__title">Pagá lo que debés🐀</h1>
          </Rise>
          <Rise delay={140}>
            <p className="hero__subtitle">Cargá lo que puso cada uno y calculá quién le paga a quién.</p>
          </Rise>
        </div>
      </header>

      <main className="band">
        <Rise delay={280} className="rise--card">
          <section className="card">
          {rows.length === 0 ? (
            <p className="empty">Nadie en la cuenta</p>
          ) : (
            <ul className="people">
              <li className="people__head">
                <span>Nombre</span>
                <span>Puso</span>
                <span />
              </li>
              {rows.map((row, i) => (
                <li key={row.id} className={row.leaving ? 'reveal reveal--leaving' : 'reveal'}>
                  <div className="reveal__inner">
                    <div className="person">
                      <input
                        className="field"
                        aria-label={`Nombre de la persona ${i + 1}`}
                        placeholder="Nombre"
                        value={row.name}
                        onChange={(e) => editRow(row.id, { name: e.target.value })}
                      />
                      <div className="amount">
                        <span className="amount__symbol">$</span>
                        <input
                          className="field"
                          aria-label={`Monto que puso la persona ${i + 1}`}
                          inputMode="decimal"
                          placeholder="0,00"
                          disabled={row.name.trim() === ''}
                          value={row.amount}
                          onChange={(e) => editRow(row.id, { amount: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Sacar a la persona ${i + 1}`}
                        onClick={() => removePerson(row.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="actions" aria-live="polite">
            {error && (
              <div className="reveal">
                <div className="reveal__inner">
                  <p className="error">{error}</p>
                </div>
              </div>
            )}
            <div className="actions__buttons">
              <button type="button" className="button" onClick={addPerson}>
                <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15">
                  <path
                    d="M8 2.25v11.5M2.25 8h11.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
                Agregar persona
              </button>
              <button type="button" className="button button--outline" onClick={calculate}>
                Calcular
              </button>
            </div>
          </div>

          {result && (
            <div ref={resultRef} className="result-anchor">
              <Result result={result} />
            </div>
          )}
          </section>
        </Rise>
        <footer className="site-footer">
          <p>Copyright © 2026 Ignacio Salas. Todos los derechos reservados.</p>
        </footer>
      </main>
    </>
  );
}

/** Index-based stagger for the result items, consumed by `--i` in index.css. */
const step = (i: number) => ({ '--i': i }) as CSSProperties;

function Result({ result }: { result: SplitResult }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  const lastStep = result.transfers.length + 2;

  return (
    <div className="reveal reveal--slow">
      <div className="reveal__inner">
        <div ref={ref} className={seen ? 'result is-in' : 'result'} aria-live="polite">
          <p className="result__total result__item" style={step(0)}>
            Total {formatCents(result.total)}
          </p>
          <p className="result__share result__item" style={step(1)}>
            {shareLine(result.shares)}
          </p>

          {result.transfers.length === 0 ? (
            <p className="result__even result__item" style={step(2)}>
              Todos quedan a mano.
            </p>
          ) : (
            <ul className="transfers">
              {result.transfers.map((t, i) => (
                <li key={i} className="transfer result__item" style={step(i + 2)}>
                  <strong>{t.from}</strong> le paga <strong className="num">{formatCents(t.amount)}</strong> a{' '}
                  <strong>{t.to}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="result__item result__cta" style={step(lastStep)}>
            <a
              className="button button--whatsapp"
              href={whatsappUrl(resultToText(result))}
              target="_blank"
              rel="noopener noreferrer"
            >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
