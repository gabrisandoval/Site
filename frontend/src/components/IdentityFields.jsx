import { todayISO } from '../utils/identity'
import './FormErrors.css'

// The personal-data fields (labels + inputs, as siblings: the parent form sets the layout)
function IdentityFields({ form, fieldErrors, onChange, idPrefix = '' }) {
  const mark = (name) => (fieldErrors[name] ? 'field-invalid' : undefined)
  const id = (name) => `${idPrefix}${name}`

  return (
    <>
      <label htmlFor={id('first_name')}>Nome</label>
      <input
        id={id('first_name')}
        name="first_name"
        type="text"
        className={mark('first_name')}
        value={form.first_name}
        onChange={onChange}
      />

      <label htmlFor={id('last_name')}>Cognome</label>
      <input
        id={id('last_name')}
        name="last_name"
        type="text"
        className={mark('last_name')}
        value={form.last_name}
        onChange={onChange}
      />

      <label htmlFor={id('gender')}>Sesso</label>
      <select
        id={id('gender')}
        name="gender"
        className={mark('gender')}
        value={form.gender}
        onChange={onChange}
      >
        <option value="">Seleziona...</option>
        <option value="M">Maschio</option>
        <option value="F">Femmina</option>
      </select>

      <label htmlFor={id('birth_date')}>Data di nascita</label>
      <input
        id={id('birth_date')}
        name="birth_date"
        type="date"
        max={todayISO()}
        className={mark('birth_date')}
        value={form.birth_date}
        onChange={onChange}
      />

      <label htmlFor={id('fiscal_code')}>Codice fiscale</label>
      <input
        id={id('fiscal_code')}
        name="fiscal_code"
        type="text"
        maxLength="16"
        style={{ textTransform: 'uppercase' }}
        className={mark('fiscal_code')}
        value={form.fiscal_code}
        onChange={onChange}
      />
    </>
  )
}

export default IdentityFields
