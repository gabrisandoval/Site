// Calls for the profile and for the admin editing an account (kept apart so api.js does not need changes).
const API_BASE_URL = 'http://127.0.0.1:8000'

async function call(path, token, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    throw new Error('Impossibile contattare il server. Verifica che il backend sia avviato.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // The server sends a readable sentence in "detail"
    const detail = typeof data?.detail === 'string' ? data.detail : 'Operazione non riuscita.'
    throw new Error(detail)
  }
  return data
}

// All the data of the logged-in person
export function getProfile(token) {
  return call('/auth/me', token)
}

// Saves the contact data (only the fields that are sent are changed)
export function updateProfile(token, changes) {
  return call('/auth/me', token, { method: 'PATCH', body: JSON.stringify(changes) })
}

// Admin only: changes the contact data of another account
export function updateUser(token, userId, changes) {
  return call(`/admin/users/${userId}`, token, { method: 'PATCH', body: JSON.stringify(changes) })
}

// The logged-in person changes their own password
export function changePassword(token, currentPassword, newPassword) {
  return call('/auth/change-password', token, {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}