// Mirrors the backend rule that builds usernames: "Élisa" + "De Luca" -> "elisa.deluca".
// It is only a PREVIEW: if the username is already taken the server adds a number.
function cleanPart(text) {
  return text
    .normalize('NFD') // splits "é" into "e" + accent mark
    .replace(/[\u0300-\u036f]/g, '') // removes the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // removes spaces and symbols
}

export function previewUsername(firstName, lastName) {
  const first = cleanPart(firstName)
  const last = cleanPart(lastName)
  return first && last ? `${first}.${last}` : ''
}