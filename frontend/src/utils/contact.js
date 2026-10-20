// Contact data (address, city, CAP, phone, email, citizenship): the fields that
// the person can change in "Profilo" and the admin can change from the users table.
import { CITIZENSHIPS, OTHER_CITIZENSHIP } from './citizenships'
import { FISCAL_CODE_REGEX, todayISO } from './identity'

// Same rules as the backend
const PHONE_REGEX = /^\+?[0-9 ]{6,20}$/
const POSTAL_CODE_REGEX = /^[0-9]{5}$/
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// From a saved account to the values of the form fields
export function contactToForm(account) {
  const saved = account.citizenship || ''
  const known = CITIZENSHIPS.includes(saved)
  return {
    address: account.address || '',
    city: account.city || '',
    postal_code: account.postal_code || '',
    phone: account.phone || '',
    email: account.email || '',
    citizenship: known ? saved : saved ? OTHER_CITIZENSHIP : '',
    citizenship_other: known ? '' : saved,
  }
}

// Check the whole form and return { fieldName: "what is wrong" }
export function validateContact(form, isCustomer) {
  const problems = {}
  if (form.address.trim().length < 5) problems.address = 'Via di residenza: mancante o troppo corta.'
  if (form.city.trim().length < 2) problems.city = 'Città: mancante.'
  if (!POSTAL_CODE_REGEX.test(form.postal_code.trim())) problems.postal_code = 'CAP: deve avere 5 cifre.'
  if (!PHONE_REGEX.test(form.phone.trim())) {
    problems.phone = 'Telefono: usa solo cifre e spazi (un + iniziale è ammesso).'
  }
  if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
    problems.email = 'Email: indirizzo non valido (lascia vuoto se non vuoi indicarla).'
  }
  if (isCustomer) {
    if (!form.citizenship) {
      problems.citizenship = "Cittadinanza: scegli una voce dall'elenco."
    } else if (form.citizenship === OTHER_CITIZENSHIP && form.citizenship_other.trim().length < 2) {
      problems.citizenship = 'Cittadinanza: scrivi quale.'
    }
  }
  return problems
}

// From the form to what we send to the server
export function contactToChanges(form, isCustomer) {
  const changes = {
    address: form.address.trim(),
    city: form.city.trim(),
    postal_code: form.postal_code.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || null,
  }
  if (isCustomer) {
    changes.citizenship =
      form.citizenship === OTHER_CITIZENSHIP ? form.citizenship_other.trim() : form.citizenship
  }
  return changes
}

// ---------- Personal data (only the admin can change them) ----------

// From a saved account to the values of the personal-data fields
export function identityToForm(account) {
  return {
    first_name: account.first_name || '',
    last_name: account.last_name || '',
    gender: account.gender || '',
    birth_date: account.birth_date || '',
    fiscal_code: account.fiscal_code || '',
  }
}

// Check the personal data. Old accounts (like the first admin) may have none: if the
// fields are left empty we simply do not touch them.
export function validateIdentity(form) {
  const problems = {}

  const names = [form.first_name, form.last_name].map((v) => v.trim())
  if (names[0] || names[1]) {
    if (names[0].length < 2) problems.first_name = 'Nome: inserisci almeno 2 lettere.'
    else if (names[0].length > 50) problems.first_name = 'Nome: troppo lungo (massimo 50 caratteri).'
    if (names[1].length < 2) problems.last_name = 'Cognome: inserisci almeno 2 lettere.'
    else if (names[1].length > 50) problems.last_name = 'Cognome: troppo lungo (massimo 50 caratteri).'
  }

  const fiscalCode = form.fiscal_code.trim().toUpperCase()
  if (fiscalCode || form.birth_date || form.gender) {
    // these three go together: the code must match birth date and gender
    if (!form.gender) problems.gender = "Sesso: selezionalo dall'elenco."
    if (!form.birth_date) problems.birth_date = 'Data di nascita: mancante.'
    else if (form.birth_date > todayISO()) problems.birth_date = 'Data di nascita: non può essere nel futuro.'
    if (!fiscalCode) problems.fiscal_code = 'Codice fiscale: mancante.'
    else if (!FISCAL_CODE_REGEX.test(fiscalCode)) {
      problems.fiscal_code = `Codice fiscale: servono 16 caratteri tra lettere e cifre (ne hai scritti ${fiscalCode.length}).`
    }
  }
  return problems
}

// What we send for the personal data: only the groups that are filled in
export function identityToChanges(form) {
  const changes = {}
  if (form.first_name.trim() || form.last_name.trim()) {
    changes.first_name = form.first_name.trim()
    changes.last_name = form.last_name.trim()
  }
  if (form.fiscal_code.trim() || form.birth_date || form.gender) {
    changes.fiscal_code = form.fiscal_code.trim().toUpperCase()
    changes.birth_date = form.birth_date
    changes.gender = form.gender
  }
  return changes
}