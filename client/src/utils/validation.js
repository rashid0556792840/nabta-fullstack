// Client-side validation with regular expressions (Unit 3).
// The server repeats every check - this layer only gives fast feedback.
export const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{10,72}$/,
  phone: /^\+?[0-9\s-]{7,20}$/,
  name: /^[\p{L}][\p{L}\s.'-]{1,79}$/u,
};

// Same patterns as strings for the HTML "pattern" attribute (native browser validation)
export const HTML_PATTERNS = {
  phone: '\\+?[0-9\\s\\-]{7,20}',
  password: '(?=.*[A-Za-z])(?=.*\\d).{10,72}',
};

/** Strips HTML tags and trims - prevents users from submitting markup or script text. */
export function sanitize(value, max = 1000) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, max);
}

/** Runs rules of the form { field: [test(value, all) => bool, message] } and returns an errors object. */
export function validate(values, rules) {
  const errors = {};
  for (const [field, [test, message]] of Object.entries(rules)) {
    if (!test(values[field] ?? '', values)) errors[field] = message;
  }
  return errors;
}
