import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllBookings } from '../api'
import StaffNavbar from '../components/StaffNavbar'
import PageTop from '../components/PageTop'
import './StaffBookings.css'

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

// A booking is in the past when its start moment has already gone by
function hasStarted(booking) {
  return new Date(`${booking.date}T${booking.start_time}`) <= new Date()
}

// Date and time together: "2026-11-03" + "09:00:00" sorts correctly as text
function compareByDate(a, b) {
  return (a.date + a.start_time).localeCompare(b.date + b.start_time)
}

// Compare two bookings by the chosen column. When two rows are equal in that
// column (same service, same customer...) we fall back to the date.
function compareBookings(a, b, sortBy) {
  if (sortBy === 'service') {
    return a.service_name.localeCompare(b.service_name) || compareByDate(a, b)
  }
  if (sortBy === 'customer') {
    return a.customer_name.localeCompare(b.customer_name) || compareByDate(a, b)
  }
  return compareByDate(a, b)
}

const TIME_FILTERS = [
  { value: 'upcoming', label: 'Prossime' },
  { value: 'past', label: 'Passate' },
  { value: 'all', label: 'Tutte' },
]

function StaffBookings() {
  const { token } = useAuth()

  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [timeFilter, setTimeFilter] = useState('upcoming')
  const [serviceFilter, setServiceFilter] = useState('') // '' = all services
  const [sortBy, setSortBy] = useState('date') // 'date' | 'service' | 'customer'
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' | 'desc'

  // Load every booking when the page opens
  useEffect(() => {
    let ignore = false

    async function loadBookings() {
      try {
        const data = await getAllBookings(token)
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

  // Past bookings read best with the most recent first, upcoming with the next first
  function handleTimeFilter(value) {
    setTimeFilter(value)
    setSortBy('date')
    setSortDirection(value === 'past' ? 'desc' : 'asc')
  }

  // Click on a column header: same column flips the direction, a new column starts ascending
  function handleSort(column) {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection('asc')
    }
  }

  // Little arrow shown next to the column that is currently used for sorting
  function sortArrow(column) {
    if (sortBy !== column) return ''
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  // The services that appear in the bookings, for the dropdown: [[id, name], ...]
  const serviceOptions = [
    ...new Map(bookings.map((b) => [b.service_id, b.service_name])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1]))

  // 1) filter by time, 2) filter by service, 3) sort
  let visibleBookings = bookings

  if (timeFilter === 'upcoming') {
    visibleBookings = visibleBookings.filter((b) => !hasStarted(b))
  } else if (timeFilter === 'past') {
    visibleBookings = visibleBookings.filter((b) => hasStarted(b))
  }

  if (serviceFilter) {
    visibleBookings = visibleBookings.filter(
      (b) => String(b.service_id) === serviceFilter
    )
  }

  const direction = sortDirection === 'asc' ? 1 : -1
  visibleBookings = [...visibleBookings].sort(
    (a, b) => direction * compareBookings(a, b, sortBy)
  )

  const selectedServiceName = serviceOptions.find(
    ([id]) => String(id) === serviceFilter
  )?.[1]

  return (
    <div className="sb-page">
      <StaffNavbar />

      <main className="sb-main">
        <PageTop title="Prenotazioni" />

        <div className="sb-toolbar">
          <div className="sb-filters">
            {TIME_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={timeFilter === item.value ? 'sb-filter active' : 'sb-filter'}
                onClick={() => handleTimeFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="sb-service-filter">
            <label htmlFor="service-filter">Servizio</label>
            <select
              id="service-filter"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="">Tutti i servizi</option>
              {serviceOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="sb-error">{error}</p>}

        {isLoading && <p className="sb-meta">Caricamento prenotazioni...</p>}

        {!isLoading && !error && visibleBookings.length === 0 && (
          <p className="sb-meta">Nessuna prenotazione con questi filtri.</p>
        )}

        {visibleBookings.length > 0 && (
          <>
            <p className="sb-meta">
              {visibleBookings.length}{' '}
              {visibleBookings.length === 1 ? 'prenotazione' : 'prenotazioni'}
              {selectedServiceName ? ` per "${selectedServiceName}"` : ''}
            </p>

            <div className="sb-table-wrapper">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className="sb-sort"
                        onClick={() => handleSort('date')}
                      >
                        Data{sortArrow('date')}
                      </button>
                    </th>
                    <th>Orario</th>
                    <th>
                      <button
                        type="button"
                        className="sb-sort"
                        onClick={() => handleSort('service')}
                      >
                        Servizio{sortArrow('service')}
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="sb-sort"
                        onClick={() => handleSort('customer')}
                      >
                        Cliente{sortArrow('customer')}
                      </button>
                    </th>
                    <th>Email</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="sb-day">{formatDay(booking.date)}</td>
                      <td>
                        {formatTime(booking.start_time)}-{formatTime(booking.end_time)}
                      </td>
                      <td>{booking.service_name}</td>
                      <td>{booking.customer_name}</td>
                      <td>{booking.customer_email}</td>
                      <td>{booking.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default StaffBookings