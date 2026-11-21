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
    <main className="mx-auto min-h-svh w-full max-w-xl px-5 py-14 sm:px-6 sm:py-20">
      <header className="mb-10">
        <p className="text-sm font-medium tracking-wide text-accent">
          Pesos argentinos
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Dividir la cuenta
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          Anotá quién pagó. Te decimos quién le transfiere a quién, con la menor
          cantidad de pagos.
        </p>
      </header>

      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <section className="rounded-3xl bg-card px-5 py-6 shadow-[0_24px_50px_-32px_rgba(28,25,22,0.45)] ring-1 ring-line sm:px-7">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium text-ink">Personas</h2>
            <p className="text-sm text-muted">
              {people.length === 0
                ? 'Nadie todavía'
                : people.length === 1
                  ? '1 persona'
                  : `${people.length} personas`}
            </p>
          </div>

          {people.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line px-4 py-12 text-center">
              <p className="text-base font-medium text-ink">Nadie en la cuenta</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
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
                    className="grid gap-3 border-b border-line py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_10.5rem_auto] sm:items-end sm:gap-4"
                  >
                    <label className="block min-w-0">
                      <span className="mb-1.5 block text-xs font-medium text-muted">
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
                      <span className="mb-1.5 block text-xs font-medium text-muted">
                        Pagó
                      </span>
                      <span className="relative block">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
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
                        changePeople(people.filter((item) => item.id !== person.id))
                      }
                      aria-label={
                        person.name.trim()
                          ? `Quitar a ${person.name.trim()}`
                          : 'Quitar persona'
                      }
                      className="mb-0.5 rounded-xl px-2 py-2.5 text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Quitar
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={addPerson}
            className="mt-4 w-full rounded-2xl border border-dashed border-line px-4 py-3 text-sm font-medium text-ink hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Agregar persona
          </button>
        </section>

        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-danger ring-1 ring-danger-line"
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
          className="mt-5 w-full rounded-2xl bg-accent px-4 py-3.5 text-base font-medium text-white hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Calcular
        </button>
      </form>

      <section ref={resultRef} aria-live="polite" className="mt-12">
        <h2 className="text-lg font-medium text-ink">Quién le paga a quién</h2>
        {settlement === null ? (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
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
    <div className="mt-4">
      <p className="text-sm text-muted">
        Total {formatARS(settlement.totalCents)} · {settlement.people.length}{' '}
        {settlement.people.length === 1 ? 'persona' : 'personas'}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{shareCopy(settlement)}</p>

      {settlement.settled ? (
        <div className="mt-6 rounded-3xl bg-accent-soft px-5 py-8">
          <p className="text-lg font-medium text-accent">Todos están a mano.</p>
          <p className="mt-1 text-sm text-muted">Nadie le debe a nadie.</p>
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-line">
          {settlement.transfers.map((transfer) => (
            <li key={`${transfer.fromId}-${transfer.toId}`} className="py-4">
              <p className="text-base leading-relaxed text-pretty text-ink">
                <span className="font-medium">{transfer.fromName}</span> le paga{' '}
                <span className="font-medium text-accent tabular-nums">
                  {formatARS(transfer.cents)}
                </span>{' '}
                a <span className="font-medium">{transfer.toName}</span>
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
  const border = invalid
    ? 'border-danger-line ring-1 ring-danger-line'
    : 'border-line focus:border-accent'
  return `w-full rounded-xl border bg-card px-3 py-2.5 text-ink outline-none ${border}`
}
