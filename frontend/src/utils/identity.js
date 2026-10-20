// Helpers shared by the registration page and the admin users page.

// A fiscal code has 16 letters/digits. Full validation (control character,
// match with birth date and gender) is done by the server.
export const FISCAL_CODE_REGEX = /^[A-Z0-9]{16}$/

// Today as "YYYY-MM-DD" in the LOCAL time zone (the "sv-SE" locale happens to use
// that format). toISOString() would use UTC and could be off by one day at night.
export function todayISO() {
  return new Date().toLocaleDateString('sv-SE')
}