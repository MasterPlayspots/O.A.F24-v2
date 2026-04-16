// Single source of truth for password strength.
// Both registrieren and passwort-reset pages import these — keeping the
// regex identical means a password set on one path always works on the other.

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/

export const PASSWORD_ERROR =
  'Mindestens 8 Zeichen, ein Groß- und Kleinbuchstabe, eine Zahl und ein Sonderzeichen'
