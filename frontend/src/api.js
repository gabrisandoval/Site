const API_BASE_URL = 'http://127.0.0.1:8000'

// Base function: every other API call goes through here.
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Impossibile contattare il server. Il backend è acceso?')
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const detail = data && data.detail
    throw new Error(
      typeof detail === 'string'
        ? detail
        : 'Dati non validi. Controlla i campi e riprova.'
    )
  }

  return data
}

// Builds the "?key=value&..." part of the URL, skipping empty values.
// Example: { date_from: '2026-11-01' } -> '?date_from=2026-11-01'
function buildQuery(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.append(key, value)
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

// ---------- Authentication ----------
export function login(username, password) {
  return request('/auth/login', { method: 'POST', body: { username, password } })
}

export function register(data) {
  return request('/auth/register', { method: 'POST', body: data })
}

// ---------- Services ----------
export function getServices() {
  return request('/services')
}

export function getAllServices(token) {
  return request('/staff/services', { token })
}

export function createService(token, data) {
  return request('/staff/services', { method: 'POST', body: data, token })
}

export function updateService(token, id, changes) {
  return request(`/staff/services/${id}`, { method: 'PATCH', body: changes, token })
}

export function deleteService(token, id) {
  return request(`/staff/services/${id}`, { method: 'DELETE', token })
}

// ---------- Availability (slots) ----------
// data = { date: '2026-11-03', start_time: '09:00', end_time: '12:00' }
export function generateSlots(token, serviceId, data) {
  return request(`/staff/services/${serviceId}/slots`, {
    method: 'POST',
    body: data,
    token,
  })
}

// All slots of a service (free and booked), for the staff area
export function getServiceSlots(token, serviceId, dateFrom, dateTo) {
  const query = buildQuery({ date_from: dateFrom, date_to: dateTo })
  return request(`/staff/services/${serviceId}/slots${query}`, { token })
}

export function deleteSlot(token, slotId) {
  return request(`/staff/slots/${slotId}`, { method: 'DELETE', token })
}

// Deletes all the free slots of one day
export function deleteDaySlots(token, serviceId, date) {
  const query = buildQuery({ date })
  return request(`/staff/services/${serviceId}/slots${query}`, {
    method: 'DELETE',
    token,
  })
}

// Public: only the free slots, used by the booking calendar
export function getFreeSlots(serviceId, dateFrom, dateTo) {
  const query = buildQuery({ date_from: dateFrom, date_to: dateTo })
  return request(`/services/${serviceId}/slots${query}`)
}

// ---------- Bookings ----------
// Customer: book a slot. notes is optional.
export function createBooking(token, slotId, notes = '') {
  return request('/bookings', {
    method: 'POST',
    body: { slot_id: slotId, notes },
    token,
  })
}

// Customer: my own bookings
export function getMyBookings(token) {
  return request('/bookings/me', { token })
}

// Customer: cancel one of my bookings
export function cancelBooking(token, bookingId) {
  return request(`/bookings/${bookingId}`, { method: 'DELETE', token })
}

// Staff: every booking, with the customer's name
export function getAllBookings(token) {
  return request('/staff/bookings', { token })
}

// ---------- Users (admin only) ----------
// Every account: admins, employees and customers
export function getUsers(token) {
  return request('/admin/users', { token })
}

// data = { full_name, username, password, role: 'employee' | 'admin' }
export function createStaff(token, data) {
  return request('/admin/employees', { method: 'POST', body: data, token })
}

export function deleteStaff(token, id) {
  return request(`/admin/employees/${id}`, { method: 'DELETE', token })
}