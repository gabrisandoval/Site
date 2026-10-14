const API_BASE_URL = 'http://127.0.0.1:8000'

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.detail || 'Errore durante il login')
  }

  return response.json()
}