import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import UserNavbar from '../components/UserNavbar'
import PageTop from '../components/PageTop'
import { getMyBookings, cancelBooking } from '../api'
import './MyBookings.css'

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

// A booking is in the past when its start moment has already gone by.
// "2026-11-03T09:00:00" is read as local time by the browser.
function hasStarted(booking) {
  return new Date(`${booking.date}T${booking.start_time}`) <= new Date()
}

function MyBookings() {
  const { token } = useAuth()

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Load my bookings when the page opens
  useEffect(() => {
    let ignore = false

    async function loadBookings() {
      try {
        const data = await getMyBookings(token)
        if (!ignore) setBookings(data)
      } catch (err) {
        if (!ignore) setError(err.message)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadBookings()

    return () => {
      ignore = true
    }
  }, [token])

  async function handleCancel(booking) {
    const question = `Annullare la prenotazione di ${booking.service_name}, ${formatDay(
      booking.date
    )} alle ${formatTime(booking.start_time)}?`
    if (!window.confirm(question)) {
      return
    }

    setError('')
    try {
      await cancelBooking(token, booking.id)
      // The server freed the slot: remove the booking from the list
      setBookings(bookings.filter((b) => b.id !== booking.id))
    } catch (err) {
      setError(err.message)
    }
  }

  // The server sends them sorted by date: split them into upcoming and past
  const upcoming = bookings.filter((b) => !hasStarted(b))
  const past = bookings.filter((b) => hasStarted(b)).reverse() // most recent first

  return (
    <div className="mybookings-page">
      <UserNavbar />

      <main className="mybookings-main">
        <PageTop title="Le mie prenotazioni" backTo="/" />

        {error && <p className="mybookings-error">{error}</p>}

        {isLoading && <p className="mybookings-meta">Caricamento prenotazioni...</p>}

        {!isLoading && bookings.length === 0 && !error && (
          <p className="mybookings-meta">
            Non hai ancora nessuna prenotazione. Scegli un servizio dalla Home e premi
            "Prenota".
          </p>
        )}

        {upcoming.length > 0 && <h3>Prossime</h3>}

        {upcoming.map((booking) => (
          <article key={booking.id} className="booking-card">
            <div>
              <strong>{booking.service_name}</strong>
              <p className="booking-when">
                {formatDay(booking.date)}, dalle {formatTime(booking.start_time)} alle{' '}
                {formatTime(booking.end_time)}
              </p>
              {booking.notes && <p className="mybookings-meta">Note: {booking.notes}</p>}
            </div>
            <button type="button" onClick={() => handleCancel(booking)}>
              Annulla
            </button>
          </article>
        ))}

        {past.length > 0 && <h3>Passate</h3>}

        {past.map((booking) => (
          <article key={booking.id} className="booking-card past">
            <div>
              <strong>{booking.service_name}</strong>
              <p className="booking-when">
                {formatDay(booking.date)}, alle {formatTime(booking.start_time)}
              </p>
            </div>
          </article>
        ))}
      </main>
    </div>
  )
}

export default MyBookings
