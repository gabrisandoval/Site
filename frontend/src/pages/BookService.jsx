import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getServices, getFreeSlots, createBooking } from '../api'
import './BookService.css'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// Builds "YYYY-MM-DD". month is 0-based (0 = January), like in JavaScript dates.
function toISO(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

// The cells of a month grid that starts on Monday: empty cells (null) for the
// days before the 1st, then the day numbers 1..31.
function buildCalendarCells(year, month) {
  // getDay(): 0 = Sunday ... 6 = Saturday. We want Monday = 0.
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < offset; i++) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day)
  }
  return cells
}

// "2026-11-03" -> "martedì 3 novembre"
function formatDay(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// "09:00:00" -> "09:00"
function formatTime(time) {
  return time.slice(0, 5)
}

function BookService() {
  const { serviceId } = useParams() // from the URL /prenota/:serviceId
  const { token } = useAuth()

  const today = new Date()

  const [service, setService] = useState(null)
  const [visible, setVisible] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [slots, setSlots] = useState([]) // free slots of the visible month
  const [isLoadingSlots, setIsLoadingSlots] = useState(true)
  const [error, setError] = useState('')

  const [selectedDay, setSelectedDay] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [notes, setNotes] = useState('')
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  // Changing this number makes the slots effect run again (used to refresh)
  const [reloadCounter, setReloadCounter] = useState(0)

  // Load the service (name and description) once
  useEffect(() => {
    let ignore = false

    async function loadService() {
      try {
        const all = await getServices()
        const found = all.find((s) => s.id === Number(serviceId))
        if (ignore) return
        if (found) {
          setService(found)
        } else {
          setError('Servizio non trovato o non più disponibile.')
        }
      } catch (err) {
        if (!ignore) setError(err.message)
      }
    }

    loadService()

    return () => {
      ignore = true
    }
  }, [serviceId])

  // Load the free slots of the visible month. It runs again every time the
  // month changes (or reloadCounter changes), because they are in the [] below.
  useEffect(() => {
    let ignore = false

    async function loadSlots() {
      setIsLoadingSlots(true)
      try {
        const daysInMonth = new Date(visible.year, visible.month + 1, 0).getDate()
        const data = await getFreeSlots(
          serviceId,
          toISO(visible.year, visible.month, 1),
          toISO(visible.year, visible.month, daysInMonth)
        )
        if (!ignore) setSlots(data)
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setIsLoadingSlots(false)
      }
    }

    loadSlots()

    return () => {
      ignore = true
    }
  }, [serviceId, visible.year, visible.month, reloadCounter])

  // The days that have at least one free slot
  const availableDays = new Set(slots.map((slot) => slot.date))

  const slotsOfSelectedDay = slots.filter((slot) => slot.date === selectedDay)

  // Months in the past cannot be shown
  const canGoPrevious =
    visible.year * 12 + visible.month > today.getFullYear() * 12 + today.getMonth()

  function changeMonth(delta) {
    const next = new Date(visible.year, visible.month + delta, 1)
    setVisible({ year: next.getFullYear(), month: next.getMonth() })
    setSelectedDay('')
    setSelectedSlot(null)
  }

  function handleSelectDay(isoDay) {
    setSelectedDay(isoDay)
    setSelectedSlot(null)
    setBookingError('')
    setConfirmation(null)
  }

  async function handleBook() {
    setBookingError('')
    setIsBooking(true)

    try {
      const booking = await createBooking(token, selectedSlot.id, notes)
      setConfirmation(booking)
      // The slot is not free anymore: remove it from the list
      setSlots(slots.filter((slot) => slot.id !== selectedSlot.id))
      setSelectedSlot(null)
      setNotes('')
    } catch (err) {
      setBookingError(err.message)
      setSelectedSlot(null)
      // Someone else may have taken it: reload the free slots
      setReloadCounter(reloadCounter + 1)
    } finally {
      setIsBooking(false)
    }
  }

  const monthTitle = new Date(visible.year, visible.month, 1).toLocaleDateString(
    'it-IT',
    { month: 'long', year: 'numeric' }
  )

  return (
    <div className="book-page">
      <header className="book-header">
        <h1>CISL App</h1>
        <Link to="/">← Torna alla Home</Link>
      </header>

      <main className="book-main">
        {error && <p className="book-error">{error}</p>}

        {service && (
          <section className="book-card">
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <p className="book-meta">Durata: {service.duration_minutes} minuti</p>
          </section>
        )}

        {confirmation && (
          <section className="book-success">
            <strong>Prenotazione confermata!</strong>
            <p>
              {confirmation.service_name}, {formatDay(confirmation.date)} alle{' '}
              {formatTime(confirmation.start_time)}.
            </p>
            <Link to="/le-mie-prenotazioni">Vai alle mie prenotazioni</Link>
          </section>
        )}

        <section className="book-card">
          <h3>1. Scegli il giorno</h3>

          <div className="calendar-header">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={!canGoPrevious}
              aria-label="Mese precedente"
            >
              ←
            </button>
            <strong className="calendar-title">{monthTitle}</strong>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Mese successivo"
            >
              →
            </button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((name) => (
              <div key={name} className="calendar-weekday">
                {name}
              </div>
            ))}

            {buildCalendarCells(visible.year, visible.month).map((day, index) => {
              // Empty cell before the 1st of the month
              if (day === null) {
                return <div key={`empty-${index}`} />
              }

              const isoDay = toISO(visible.year, visible.month, day)
              const isAvailable = availableDays.has(isoDay)
              const isSelected = isoDay === selectedDay

              return (
                <button
                  key={isoDay}
                  type="button"
                  className={
                    isSelected
                      ? 'calendar-day available selected'
                      : isAvailable
                        ? 'calendar-day available'
                        : 'calendar-day'
                  }
                  disabled={!isAvailable}
                  onClick={() => handleSelectDay(isoDay)}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {isLoadingSlots && <p className="book-meta">Caricamento orari...</p>}

          {!isLoadingSlots && slots.length === 0 && (
            <p className="book-meta">Nessun orario disponibile in questo mese.</p>
          )}
        </section>

        {/* Step 2 is always on screen, but locked until a day is chosen */}
        <section className={selectedDay ? 'book-card' : 'book-card locked'}>
          <h3>
            2. Scegli l'orario{selectedDay ? `, ${formatDay(selectedDay)}` : ''}
          </h3>

          {!selectedDay && (
            <p className="book-meta">Scegli prima un giorno dal calendario.</p>
          )}

          <div className="time-list">
            {slotsOfSelectedDay.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={
                  selectedSlot?.id === slot.id ? 'time-button selected' : 'time-button'
                }
                onClick={() => setSelectedSlot(slot)}
              >
                {formatTime(slot.start_time)}
              </button>
            ))}
          </div>

          {selectedDay && slotsOfSelectedDay.length === 0 && (
            <p className="book-meta">Gli orari di questo giorno sono finiti.</p>
          )}
        </section>

        {/* Step 3 is always on screen, but locked until a time is chosen */}
        <section className={selectedSlot ? 'book-card' : 'book-card locked'}>
          <h3>3. Conferma</h3>

          {selectedSlot ? (
            <p>
              {formatDay(selectedSlot.date)} dalle {formatTime(selectedSlot.start_time)}{' '}
              alle {formatTime(selectedSlot.end_time)}
            </p>
          ) : (
            <p className="book-meta">Scegli prima l'orario.</p>
          )}

          <label htmlFor="notes">Note (facoltative)</label>
          <textarea
            id="notes"
            rows="3"
            maxLength="300"
            disabled={!selectedSlot}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button
            type="button"
            className="book-confirm"
            onClick={handleBook}
            disabled={!selectedSlot || isBooking}
          >
            {isBooking ? 'Prenotazione in corso...' : 'Conferma prenotazione'}
          </button>
        </section>

        {bookingError && <p className="book-error">{bookingError}</p>}
      </main>
    </div>
  )
}

export default BookService