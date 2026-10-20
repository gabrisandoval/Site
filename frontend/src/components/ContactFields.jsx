import { CITIZENSHIPS, OTHER_CITIZENSHIP } from '../utils/citizenships'
import './FormErrors.css'

// The contact fields (labels + inputs, as siblings: the parent form decides the layout).
// idPrefix keeps the ids unique when two forms can be on the same page.
function ContactFields({ form, fieldErrors, onChange, isCustomer, idPrefix = '' }) {
  const mark = (name) => (fieldErrors[name] ? 'field-invalid' : undefined)
  const id = (name) => `${idPrefix}${name}`

  return (
    <>
      <label htmlFor={id('address')}>Via di residenza</label>
      <input
        id={id('address')}
        name="address"
        type="text"
        className={mark('address')}
        value={form.address}
        onChange={onChange}
      />

      <label htmlFor={id('city')}>Città</label>
      <input
        id={id('city')}
        name="city"
        type="text"
        className={mark('city')}
        value={form.city}
        onChange={onChange}
      />

      <label htmlFor={id('postal_code')}>CAP</label>
      <input
        id={id('postal_code')}
        name="postal_code"
        type="text"
        inputMode="numeric"
        maxLength="5"
        className={mark('postal_code')}
        value={form.postal_code}
        onChange={onChange}
      />

      <label htmlFor={id('phone')}>Telefono</label>
      <input
        id={id('phone')}
        name="phone"
        type="tel"
        className={mark('phone')}
        value={form.phone}
        onChange={onChange}
      />

      <label htmlFor={id('email')}>Email (facoltativa)</label>
      <input
        id={id('email')}
        name="email"
        type="email"
        className={mark('email')}
        value={form.email}
        onChange={onChange}
      />

      {isCustomer && (
        <>
          <label htmlFor={id('citizenship')}>Cittadinanza</label>
          <select
            id={id('citizenship')}
            name="citizenship"
            className={mark('citizenship')}
            value={form.citizenship}
            onChange={onChange}
          >
            <option value="">Seleziona...</option>
            {CITIZENSHIPS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_CITIZENSHIP}>Altra cittadinanza...</option>
          </select>

          {form.citizenship === OTHER_CITIZENSHIP && (
            <>
              <label htmlFor={id('citizenship_other')}>Quale cittadinanza?</label>
              <input
                id={id('citizenship_other')}
                name="citizenship_other"
                type="text"
                className={mark('citizenship')}
                value={form.citizenship_other}
                onChange={onChange}
              />
            </>
          )}
        </>
      )}
    </>
  )
}

export default ContactFields
