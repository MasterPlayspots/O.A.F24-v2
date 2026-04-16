// Single source of truth for Branchen across onboarding + profil + admin.
// Matching between unternehmen and berater only works when both sides use
// the same vocabulary — keep this list as the sole authority.

export const BRANCHEN = [
  'IT & Software',
  'Handwerk',
  'Handel',
  'Dienstleistungen',
  'Produktion & Fertigung',
  'Gesundheit & Pflege',
  'Gastronomie & Hotellerie',
  'Bau & Immobilien',
  'Landwirtschaft',
  'Energie & Umwelt',
  'Sonstige',
] as const

export type Branche = (typeof BRANCHEN)[number]
