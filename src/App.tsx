import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { formatAmount, formatARS, parseArsToCents } from './money.ts'
import { buildSettlement } from './settle.ts'
import type { RowIssue, Settlement } from './settle.ts'

type Person = {
  id: string
  name: string
  amountText: string
}

function newPerson(): Person {
  return { id: crypto.randomUUID(), name: '', amountText: '' }
}

export default function App() {
  const [people, setPeople] = useState<Person[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [issues, setIssues] = useState<RowIssue[]>([])
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const pendingFocusId = useRef<string | null>(null)
  const nameInputs = useRef(new Map<string, HTMLInputElement>())
  const resultRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const id = pendingFocusId.current
    if (!id) return
    nameInputs.current.get(id)?.focus()
    pendingFocusId.current = null
  }, [people])

  function changePeople(next: Person[]) {
    setPeople(next)
    setSettlement(null)
    setErrors([])
    setIssues([])
  }

  function addPerson() {
    const person = newPerson()
    pendingFocusId.current = person.id
    changePeople([...people, person])
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = people.map((person) => {
      const cents = parseArsToCents(person.amountText)
      if (cents === null) return person
      return { ...person, amountText: formatAmount(cents) }
    })
    setPeople(normalized)
    const prepared = buildSettlement(normalized)
    if (!prepared.ok) {
      setErrors(prepared.errors)
      setIssues(prepared.rows)
      setSettlement(null)
      return
    }
    setErrors([])
    setIssues([])
    setSettlement(prepared.settlement)
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  return (
    <main className="mx-auto min-h-svh w-full max-w-[34rem] px-5 pt-12 pb-16 sm:px-6 sm:pt-20">
      <header className="mb-10 sm:mb-12">
        <p className="text-[13px] font-medium tracking-[0.01em] text-muted">
          Pesos argentinos
        </p>
        <h1 className="mt-2 text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-ink sm:text-[52px]">
          Dividir la cuenta
        </h1>
        <p className="mt-4 max-w-[28rem] text-[17px] leading-[1.45] text-muted">
          Anotá quién pagó. Te decimos quién le transfiere a quién, con la menor
          cantidad de pagos.
        </p>
      </header>

      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <section className="rounded-[22px] bg-card px-5 py-5 shadow-[var(--shadow-card)] sm:px-6">
          <div className="flex items-baseline justify-between gap-4 px-0.5">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
              Personas
            </h2>
            <p className="text-[13px] text-muted">
              {people.length === 0
                ? 'Nadie todavía'
                : people.length === 1
                  ? '1 persona'
                  : `${people.length} personas`}
            </p>
          </div>

          {people.length === 0 ? (
            <div className="px-2 py-10 text-center">
              <p className="text-[17px] font-medium tracking-[-0.01em] text-ink">
                Nadie en la cuenta
              </p>
              <p className="mx-auto mt-1.5 max-w-[16rem] text-[15px] leading-snug text-muted">
                Agregá a quienes compartieron el gasto y cuánto puso cada uno.
              </p>
            </div>
          ) : (
            <ul className="mt-2">
              {people.map((person, index) => {
                const issue = issues.find((row) => row.id === person.id)
                return (
                  <li
                    key={person.id}
                    className="border-b border-line py-4 last:border-b-0"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
                      <label className="col-span-2 block min-w-0 sm:col-span-1">
                        <span className="mb-1.5 block px-0.5 text-[13px] text-muted">
                          Nombre
                        </span>
                        <input
                          ref={(node) => {
                            if (node) nameInputs.current.set(person.id, node)
                            else nameInputs.current.delete(person.id)
                          }}
                          value={person.name}
                          onChange={(event) => {
                            const name = event.target.value
                            changePeople(
                              people.map((item) =>
                                item.id === person.id ? { ...item, name } : item,
                              ),
                            )
                          }}
                          aria-invalid={issue?.name || undefined}
                          placeholder={`Persona ${index + 1}`}
                          className={fieldClass(issue?.name === true)}
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block px-0.5 text-[13px] text-muted">
                          Pagó
                        </span>
                        <span className="relative block">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[17px] text-muted">
                            $
                          </span>
                          <input
                            value={person.amountText}
                            onChange={(event) => {
                              const amountText = event.target.value
                              changePeople(
                                people.map((item) =>
                                  item.id === person.id
                                    ? { ...item, amountText }
                                    : item,
                                ),
                              )
                            }}
                            onBlur={() => {
                              const cents = parseArsToCents(person.amountText)
                              if (cents === null) return
                              setPeople((current) =>
                                current.map((item) =>
                                  item.id === person.id
                                    ? { ...item, amountText: formatAmount(cents) }
                                    : item,
                                ),
                              )
                            }}
                            inputMode="decimal"
                            placeholder="0,00"
                            aria-invalid={issue?.amount || undefined}
                            className={`${fieldClass(issue?.amount === true)} pr-3 pl-7 text-right tabular-nums`}
                          />
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          changePeople(
                            people.filter((item) => item.id !== person.id),
                          )
                        }
                        aria-label={
                          person.name.trim()
                            ? `Quitar a ${person.name.trim()}`
                            : 'Quitar persona'
                        }
                        className="h-11 rounded-full px-2 text-[15px] text-danger transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={addPerson}
            className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-0.5 text-[17px] text-accent transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <PlusMark />
            Agregar persona
          </button>
        </section>

        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-[15px] leading-snug text-danger"
          >
            <ul className="space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="mt-5 h-[50px] w-full rounded-full bg-accent text-[17px] font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:bg-[#006edb]"
        >
          Calcular
        </button>
      </form>

      <section ref={resultRef} aria-live="polite" className="mt-12">
        <h2 className="px-1 text-[13px] font-medium text-muted">
          Quién le paga a quién
        </h2>
        {settlement === null ? (
          <p className="mt-2 max-w-sm px-1 text-[15px] leading-snug text-muted">
            {people.length === 0
              ? 'Cuando agregues personas, el reparto va a aparecer acá.'
              : 'Tocá Calcular para ver las transferencias.'}
          </p>
        ) : (
          <Result settlement={settlement} />
        )}
      </section>
    </main>
  )
}

function Result({ settlement }: { settlement: Settlement }) {
  return (
    <div className="mt-3 overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-card)]">
      <div className="px-6 pt-6 pb-5">
        <p className="text-[13px] font-medium text-muted">Total</p>
        <p className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
          {formatARS(settlement.totalCents)}
        </p>
        <p className="mt-3 text-[15px] leading-snug text-muted">
          {settlement.people.length}{' '}
          {settlement.people.length === 1 ? 'persona' : 'personas'}
        </p>
        <p className="mt-1 text-[15px] leading-snug text-ink">{shareCopy(settlement)}</p>
      </div>

      {settlement.settled ? (
        <div className="border-t border-line px-6 py-8 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-success-soft text-success">
            <CheckMark />
          </span>
          <p className="mt-3 text-[20px] font-semibold tracking-[-0.02em] text-ink">
            Todos están a mano.
          </p>
          <p className="mt-1 text-[15px] text-muted">Nadie le debe a nadie.</p>
        </div>
      ) : (
        <ol className="border-t border-line">
          {settlement.transfers.map((transfer) => (
            <li
              key={`${transfer.fromId}-${transfer.toId}`}
              className="flex items-baseline justify-between gap-4 border-b border-line px-6 py-4 last:border-b-0"
            >
              <p className="text-[17px] leading-snug text-pretty text-ink">
                <span className="font-medium">{transfer.fromName}</span>
                <span className="text-muted"> le paga a </span>
                <span className="font-medium">{transfer.toName}</span>
              </p>
              <p className="shrink-0 text-[17px] font-semibold tracking-[-0.02em] text-ink tabular-nums">
                {formatARS(transfer.cents)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function shareCopy(settlement: Settlement): string {
  const base = formatARS(settlement.shareBaseCents)
  if (settlement.remainderCount === 0) {
    return `A cada uno le tocan ${base}.`
  }
  const extra = formatARS(settlement.shareBaseCents + 1)
  if (settlement.remainderCount === 1) {
    return `A cada uno le tocan ${base}. La primera persona de la lista recibe un centavo más (${extra}).`
  }
  return `A cada uno le tocan ${base}. Las primeras ${settlement.remainderCount} personas de la lista reciben un centavo más (${extra}).`
}

function fieldClass(invalid: boolean): string {
  const state = invalid
    ? 'bg-white ring-2 ring-[#ff3b30]'
    : 'bg-fill focus:bg-white focus:ring-2 focus:ring-accent/30'
  return `h-11 w-full rounded-xl px-3 text-[17px] text-ink outline-none transition-colors placeholder:text-[#aeaeb2] ${state}`
}

function PlusMark() {
  return (
    <svg viewBox="0 0 22 22" className="size-[22px] shrink-0" aria-hidden="true">
      <circle cx="11" cy="11" r="11" className="fill-accent" />
      <path
        d="M11 6.25v9.5M6.25 11h9.5"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
      <path
        d="M6.5 12.5 10.2 16.2 17.5 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
