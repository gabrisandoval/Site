import { useEffect, useState } from 'react'
import { generateSlots, getServiceSlots, deleteSlot, deleteDaySlots } from '../api'
import './AvailabilityPanel.css'

// Data di oggi come "AAAA-MM-GG" nel fuso orario del computer.
// (toISOString userebbe l'ora UTC e a volte darebbe il giorno sbagliato)
function todayISO() {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
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

function sortSlots(list) {
  return [...list].sort((a, b) =>
    (a.date + a.start_time).localeCompare(b.date + b.start_time)
  )
}

function AvailabilityPanel({ service, token }) {
  const [slots, setSlots] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [isSaving, setIsSaving] = useState(false)

  // Carica gli slot da oggi in avanti quando il pannello si apre
  useEffect(() => {
    let ignore = false

    async function loadSlots() {
      try {
        const data = await getServiceSlots(token, service.id, todayISO())
        if (!ignore) setSlots(data)
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadSlots()

    return () => {
      ignore = true
    }
  }, [token, service.id])

  async function handleGenerate(event) {
    event.preventDefault()

    if (!date) {
      setError('Scegli il giorno.')
      return
    }

    setError('')
    setIsSaving(true)

    try {
      const created = await generateSlots(token, service.id, {
        date,
        start_time: startTime,
        end_time: endTime,
      })
      setSlots(sortSlots([...slots, ...created]))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSlot(slot) {
    setError('')
    try {
      await deleteSlot(token, slot.id)
      setSlots(slots.filter((s) => s.id !== slot.id))
    } catch (err) {
      setError(err.message)
    }
  }

  // Toglie solo gli slot liberi del giorno: quelli prenotati restano
  async function handleDeleteDay(day) {
    if (!window.confirm(`Eliminare gli orari liberi di ${formatDay(day)}?`)) {
      return
    }

    setError('')
    try {
      await deleteDaySlots(token, service.id, day)
      setSlots(slots.filter((s) => !(s.date === day && !s.is_booked)))
    } catch (err) {
      setError(err.message)
    }
  }

  // Raggruppa gli slot per giorno: { '2026-11-03': [slot, slot], ... }
  const slotsByDay = {}
  for (const slot of slots) {
    if (!slotsByDay[slot.date]) {
      slotsByDay[slot.date] = []
    }
    slotsByDay[slot.date].push(slot)
  }

  return (
    <div className="availability">
      <h4>Disponibilità: {service.name}</h4>
      <p className="availability-help">
        Scegli un giorno e una fascia oraria: il sistema crea gli orari da{' '}
        {service.duration_minutes} minuti.
      </p>

      <form className="availability-form" onSubmit={handleGenerate}>
        <div>
          <label htmlFor={`date-${service.id}`}>Giorno</label>
          <input
            id={`date-${service.id}`}
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`start-${service.id}`}>Dalle</label>
          <input
            id={`start-${service.id}`}
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`end-${service.id}`}>Alle</label>
          <input
            id={`end-${service.id}`}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Creazione...' : 'Crea orari'}
        </button>
      </form>

      {error && <p className="availability-error">{error}</p>}

      {isLoading && <p className="availability-message">Caricamento orari...</p>}

      {!isLoading && slots.length === 0 && (
        <p className="availability-message">Nessun orario creato.</p>
      )}

      {Object.entries(slotsByDay).map(([day, daySlots]) => (
        <div key={day} className="availability-day">
          <div className="availability-day-header">
            <strong>{formatDay(day)}</strong>
            <button
              type="button"
              className="link-danger"
              onClick={() => handleDeleteDay(day)}
            >
              Elimina orari liberi
            </button>
          </div>

          <div className="availability-slots">
            {daySlots.map((slot) => (
              <span
                key={slot.id}
                className={slot.is_booked ? 'slot-chip booked' : 'slot-chip'}
              >
                {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                {slot.is_booked ? (
                  <em> prenotato</em>
                ) : (
                  <button
                    type="button"
                    title="Elimina orario"
                    onClick={() => handleDeleteSlot(slot)}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AvailabilityPanel