// The server writes its problems as sentences "Label: text." (one per problem).
// These helpers split them and find the form field each one is about.

const LABEL_TO_FIELD = {
  Nome: 'first_name',
  Cognome: 'last_name',
  'Codice fiscale': 'fiscal_code',
  'Data di nascita': 'birth_date',
  Sesso: 'gender',
  Password: 'password',
  'Via di residenza': 'address',
  Città: 'city',
  CAP: 'postal_code',
  Telefono: 'phone',
  Cittadinanza: 'citizenship',
  Email: 'email',
}

// "A: x. B: y." -> ["A: x.", "B: y."]
export function splitServerError(text) {
  return String(text).split(/(?<=\.) /).filter(Boolean)
}

// Which form field a server sentence is about (null = none in particular)
export function fieldOfServerError(sentence) {
  const label = sentence.split(':')[0].trim()
  if (LABEL_TO_FIELD[label]) return LABEL_TO_FIELD[label]

  const lower = sentence.toLowerCase()
  if (lower.includes('codice fiscale')) return 'fiscal_code'
  if (lower.includes('nascita')) return 'birth_date'
  if (lower.includes('telefono')) return 'phone'
  if (lower.includes('email')) return 'email'
  if (lower.includes('password')) return 'password'
  return null
}

// From the text of a server error to what the form shows:
// { marked: { field: sentence }, general: [sentences about no particular field] }
export function sortServerError(text) {
  const marked = {}
  const general = []
  for (const sentence of splitServerError(text)) {
    const field = fieldOfServerError(sentence)
    if (field && !marked[field]) marked[field] = sentence
    else general.push(sentence)
  }
  return { marked, general }
}
