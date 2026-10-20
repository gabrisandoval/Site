import './FormErrors.css'

// The red box at the bottom of a form: one line for each problem.
// Shows nothing when the list is empty.
function FormErrors({ items, title = 'Controlla questi campi:' }) {
  if (!items || items.length === 0) return null

  return (
    <div className="form-errors" role="alert">
      <strong>{title}</strong>
      <ul>
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  )
}

export default FormErrors
