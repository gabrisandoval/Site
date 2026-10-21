// Expired login ("token scaduto"): the server answers 401 to every request that
// carries the token. Here we watch ALL the fetch calls of the app, and when one that
// carried a token gets 401 we log the person out and send them to the login page,
// with a notice. No other file of the app needs to change.

// Keys of the browser storage that hold the saved login (the name depends on how
// AuthContext saved it): everything that looks like a token / session / user
const TOKEN_KEY_PATTERN = /token|session|auth|user|cisl/i
const NOTICE_KEY = 'session_expired_notice'

// Did this request carry an "Authorization" header?
function hadAuthorization(input, init) {
  const sources = [init?.headers, typeof input === 'object' ? input.headers : null]
  return sources.some((headers) => {
    if (!headers) return false
    if (typeof headers.has === 'function') return headers.has('Authorization')
    return Object.keys(headers).some((name) => name.toLowerCase() === 'authorization')
  })
}

let alreadyHandling = false

function handleExpiredSession() {
  if (alreadyHandling) return
  alreadyHandling = true

  try {
    // forget the saved login (the app reads it again when the page reloads).
    // The storage belongs to this site only, so no other website is touched.
    // (the login lives in sessionStorage; localStorage is cleaned too, for old logins)
    for (const store of [sessionStorage, localStorage]) {
      Object.keys(store)
        .filter((key) => key !== NOTICE_KEY && TOKEN_KEY_PATTERN.test(key))
        .forEach((key) => store.removeItem(key))
    }
    sessionStorage.setItem(NOTICE_KEY, '1')
  } catch {
    // storage blocked: the redirect below still logs the person out of the page
  }

  // A full reload: the app starts again without any login
  window.location.assign('/login')
}

// Install only once (the file may be loaded twice while developing)
if (!window.__sessionGuardInstalled) {
  window.__sessionGuardInstalled = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init)
    if (response.status === 401 && hadAuthorization(input, init)) {
      handleExpiredSession()
    }
    return response
  }
}

export { NOTICE_KEY }