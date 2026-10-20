import { useEffect, useState } from 'react'
import { updateUser } from '../profileApi'
import {
  contactToForm,
  validateContact,
  contactToChanges,
  identityToForm,
  validateIdentity,
  identityToChanges,
} from '../utils/contact'
import { sortServerError } from '../utils/serverErrors'
import ContactFields from './ContactFields'
import IdentityFields from './IdentityFields'
import FormErrors from './FormErrors'
import './EditUserDialog.css'

// Box where the admin corrects the contact data of an account.
// account = the account being edited (null = box closed)
// onSaved(updatedAccount) is called after the server accepted the changes.
function EditUserDialog({ account, token, onSaved, onCancel }) {
  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalErrors, setGeneralErrors] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  // Every time a different account is opened, start again from its data
  useEffect(() => {
    if (account) {
      setForm({ ...identityToForm(account), ...contactToForm(account) })
      setFieldErrors({})
      setGeneralErrors([])
    }
  }, [account])

  // Esc closes the box
  useEffect(() => {
    if (!account) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [account, onCancel])

  if (!account || !form) return null

  const isCustomer = account.role === 'customer'

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })

    const errorKey = name === 'citizenship_other' ? 'citizenship' : name
    if (fieldErrors[errorKey]) {
      const { [errorKey]: _fixed, ...others } = fieldErrors
      setFieldErrors(others)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setGeneralErrors([])

    const problems = { ...validateIdentity(form), ...validateContact(form, isCustomer) }
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems)
      return
    }
    setFieldErrors({})
    setIsSaving(true)

    try {
      const saved = await updateUser(token, account.id, {
        ...identityToChanges(form),
        ...contactToChanges(form, isCustomer),
      })
      onSaved(saved)
    } catch (err) {
      const { marked, general } = sortServerError(err.message)
      setFieldErrors(marked)
      setGeneralErrors(general)
    } finally {
      setIsSaving(false)
    }
  }

  const errorList = [...Object.values(fieldErrors), ...generalErrors]

  return (
    <div className="edit-backdrop" onClick={onCancel}>
      <div
        className="edit-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="edit-title">Modifica account</h2>
        <p className="edit-who">
          <strong>{account.full_name}</strong> ({account.username})
        </p>
        <p className="edit-note">
          Il codice fiscale deve corrispondere a data di nascita e sesso. L&apos;username non
          cambia, anche se correggi nome e cognome.
        </p>

        <form className="edit-form" onSubmit={handleSubmit} noValidate>
          <h3 className="edit-section">Dati anagrafici</h3>
          <IdentityFields
            form={form}
            fieldErrors={fieldErrors}
            onChange={handleChange}
            idPrefix="edit-"
          />

          <h3 className="edit-section">Contatti</h3>
          <ContactFields
            form={form}
            fieldErrors={fieldErrors}
            onChange={handleChange}
            isCustomer={isCustomer}
            idPrefix="edit-"
          />

          <FormErrors items={errorList} title="Non posso salvare:" />

          <div className="edit-actions">
            <button type="button" className="edit-cancel" onClick={onCancel}>
              Annulla
            </button>
            <button type="submit" className="edit-save" disabled={isSaving}>
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserDialog
