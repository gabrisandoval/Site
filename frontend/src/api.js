const API_BASE_URL = 'http://127.0.0.1:8000'

async function request(path, body) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Impossibile contattare il server. Riprova più tardi.')
  }

  if (!response.ok) {
    let message = 'Si è verificato un errore.'
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') {
        message = data.detail
      } else if (response.status === 422) {
        message = 'Dati non validi. Controlla i campi e riprova.'
      }
    } catch {
      // risposta senza JSON: resta il messaggio generico
    }
    throw new Error(message)
  }

  return response.json()
}

export function login(username, password) {
  return request('/auth/login', { username, password })
}

export function register(data) {
  return request('/auth/register', data)
}