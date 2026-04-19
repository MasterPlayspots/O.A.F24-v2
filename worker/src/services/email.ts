// Email Service — Resend API, fund24 Sovereign Trust branded templates.
// PATCH: Sovereign palette. Only `wrap()` and `cta()` changed here.
//
// Mail clients do not support CSS variables; hex is inlined. Values match
// anchors declared in app/globals.css:
//
//   #F5F1E6  bone (page bg)
//   #FDFBF5  ivory (card)
//   #0A1528  ink (text)
//   #0F1E3D  oxford navy (CTA)
//   #B8935A  brass (rule, mark)
//   #4A5568  slate (footer, metadata)
//   #D4CFC0  platinum (borders)
//
// Typography is kept to system sans (Inter is not available in most mail
// clients; the system sans stack below renders well everywhere and keeps
// the institutional register).
//
// When globals.css anchors change, update these constants and redeploy
// the worker.

const FROM = 'fund24 <noreply@fund24.io>';
const BRAND_URL = 'https://fund24.io';

// Shared HTML shell. All 9 templates call wrap() with title + body blocks.
function wrap(title: string, body: string, preview: string = ''): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F1E6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0A1528">
<div style="display:none;max-height:0;overflow:hidden">${preview}</div>
<div style="max-width:600px;margin:0 auto;padding:48px 24px">

  <!-- Brand mark row: brass rule + mono wordmark -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="padding-bottom:32px">
        <div style="display:inline-block;vertical-align:middle;width:24px;height:2px;background:#B8935A;margin-right:12px"></div>
        <span style="font-family:Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#B8935A;font-weight:600">fund24</span>
      </td>
    </tr>
  </table>

  <!-- Card -->
  <div style="background:#FDFBF5;border:1px solid #D4CFC0;border-top:3px solid #0F1E3D;border-radius:2px;padding:40px 32px">
    ${body}
  </div>

  <!-- Legal footer -->
  <p style="margin:24px 0 0;font-family:-apple-system,sans-serif;font-size:11px;color:#4A5568;text-align:center;line-height:1.7">
    <a href="${BRAND_URL}" style="color:#0F1E3D;text-decoration:none;font-weight:500">fund24.io</a> — Trusted AI für deutsche Fördermittel<br />
    Fröba Sales Solutions UG (haftungsbeschränkt), Kronach · <a href="${BRAND_URL}/impressum" style="color:#4A5568">Impressum</a> · <a href="${BRAND_URL}/datenschutz" style="color:#4A5568">Datenschutz</a>
  </p>
</div>
</body>
</html>`;
}

function cta(href: string, label: string): string {
  // Navy fill, bone text, brass arrow — the seal-like CTA.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px auto 8px">
<tr><td style="border-radius:2px;background:#0F1E3D" align="center">
<a href="${href}" style="display:inline-block;padding:14px 32px;background:#0F1E3D;color:#F5F1E6;text-decoration:none;border-radius:2px;font-weight:500;font-size:14px;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
${label} <span style="color:#B8935A;margin-left:6px">→</span>
</a>
</td></tr>
</table>`;
}

// ---
// Resend delivery — unchanged from original; included so this file is a
// drop-in replacement for the helper section of email.ts.
// ---

interface ResendPayload {
  to: string;
  subject: string;
  html: string;
}

async function send(apiKey: string, payload: ResendPayload): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [payload.to], subject: payload.subject, html: payload.html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// TEMPLATES — unchanged from original fund24 email.ts
// ============================================================================

export async function sendPasswordResetEmail(apiKey: string, to: string, firstName: string, resetUrl: string): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Passwort zurücksetzen</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${firstName},</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">du hast eine Passwort-Zurücksetzung für dein fund24-Konto angefordert.</p>
${cta(resetUrl, 'Passwort zurücksetzen')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">Der Link ist 1 Stunde gültig. Wenn du keine Anfrage gestellt hast, ignoriere diese E-Mail.</p>`;
  return send(apiKey, {
    to,
    subject: 'Passwort zurücksetzen · fund24',
    html: wrap('Passwort zurücksetzen', body, 'Klicke den Link, um dein Passwort zu setzen.'),
  });
}

export async function sendVerificationCodeEmail(apiKey: string, to: string, firstName: string, code: string): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Bestätigungscode</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${firstName},</p>
<p style="margin:0 0 24px;color:rgba(255,255,255,0.85);line-height:1.6">dein Code zur Verifizierung:</p>
<div style="margin:0 0 16px;padding:20px;background:rgba(255,255,255,0.08);border-radius:8px;text-align:center">
  <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#c9d1ff">${code}</span>
</div>
<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5)">Der Code ist 15 Minuten gültig. Wenn du dich nicht registriert hast, ignoriere diese E-Mail.</p>`;
  return send(apiKey, {
    to,
    subject: `${code} · dein Bestätigungscode`,
    html: wrap('Bestätigungscode', body, `Dein Code: ${code}`),
  });
}

export async function sendDownloadEmail(apiKey: string, to: string, firstName: string, downloadUrl: string): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Dein Bericht ist bereit</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${firstName},</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">dein Beratungsbericht wurde freigeschaltet und steht zum Download bereit.</p>
${cta(downloadUrl, 'Bericht herunterladen')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">Der Download-Link ist 24 Stunden gültig.</p>`;
  return send(apiKey, {
    to,
    subject: 'Dein Bericht ist bereit · fund24',
    html: wrap('Bericht bereit', body, 'Dein Bericht steht zum Download bereit.'),
  });
}

// ============================================================
// New: Anfrage / Beratung notifications
// ============================================================

export async function sendAnfrageReceivedEmail(
  apiKey: string,
  to: string,
  beraterDisplayName: string,
  absenderName: string,
  typ: string,
  nachricht: string | null
): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Neue Anfrage</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${beraterDisplayName},</p>
<p style="margin:0 0 16px;color:rgba(255,255,255,0.85);line-height:1.6">
  <strong style="color:#ffffff">${absenderName}</strong> hat dir eine Anfrage zum Thema
  <strong style="color:#ffffff">${typ}</strong> gesendet.
</p>
${
  nachricht
    ? `<blockquote style="margin:16px 0;padding:16px 20px;background:rgba(255,255,255,0.06);border-radius:6px;color:rgba(255,255,255,0.85);font-style:italic;line-height:1.6">${escapeHtml(nachricht)}</blockquote>`
    : ''
}
${cta(`${BRAND_URL}/dashboard/berater/anfragen`, 'Anfrage ansehen')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">Du kannst die Anfrage in deinem Dashboard annehmen oder ablehnen.</p>`;
  return send(apiKey, {
    to,
    subject: `Neue Anfrage von ${absenderName}`,
    html: wrap('Neue Anfrage', body, `${absenderName} möchte mit dir zusammenarbeiten.`),
  });
}

export async function sendAnfrageAcceptedEmail(
  apiKey: string,
  to: string,
  empfaengerName: string,
  beraterDisplayName: string
): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Anfrage angenommen</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${empfaengerName},</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">
  Gute Nachrichten: <strong style="color:#ffffff">${beraterDisplayName}</strong> hat deine Anfrage
  angenommen. Ihr könnt jetzt direkt in Kontakt treten.
</p>
${cta(`${BRAND_URL}/dashboard/unternehmen/anfragen`, 'Zu meinen Anfragen')}`;
  return send(apiKey, {
    to,
    subject: `${beraterDisplayName} hat deine Anfrage angenommen`,
    html: wrap('Anfrage angenommen', body, `${beraterDisplayName} möchte mit dir arbeiten.`),
  });
}

export async function sendAnfrageRejectedEmail(
  apiKey: string,
  to: string,
  empfaengerName: string,
  beraterDisplayName: string
): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Anfrage abgelehnt</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${empfaengerName},</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">
  <strong style="color:#ffffff">${beraterDisplayName}</strong> konnte deine Anfrage leider nicht annehmen.
  Schau dich im Berater-Verzeichnis nach weiteren passenden Experten um.
</p>
${cta(`${BRAND_URL}/berater`, 'Weitere Berater entdecken')}`;
  return send(apiKey, {
    to,
    subject: `Anfrage an ${beraterDisplayName} wurde abgelehnt`,
    html: wrap('Anfrage abgelehnt', body, 'Der Berater konnte leider nicht zusagen.'),
  });
}

// ============================================================
// Beratung phase-change notification (→ company owner)
// ============================================================

const BERATUNG_PHASE_LABELS: Record<string, string> = {
  anlauf: 'Anlauf',
  datenerhebung: 'Datenerhebung',
  durchfuehrung: 'Durchführung',
  bericht: 'Berichterstellung',
  eingereicht: 'Eingereicht',
  bewilligt: 'Bewilligt',
  abgeschlossen: 'Abgeschlossen',
  abgelehnt: 'Abgelehnt',
};

export function formatBeratungPhase(phase: string): string {
  return BERATUNG_PHASE_LABELS[phase] ?? phase;
}

export async function sendBeratungPhaseChangedEmail(
  apiKey: string,
  to: string,
  empfaengerName: string,
  beraterDisplayName: string,
  beratungsanlass: string,
  oldPhase: string,
  newPhase: string,
  beratungId: string
): Promise<boolean> {
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Beratung aktualisiert</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${empfaengerName},</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">
  <strong style="color:#ffffff">${beraterDisplayName}</strong> hat eine neue Phase für deine
  Beratung <em>${escapeHtml(beratungsanlass)}</em> gesetzt.
</p>
<div style="margin:20px 0;padding:16px 20px;background:rgba(255,255,255,0.06);border-radius:6px;color:rgba(255,255,255,0.85);line-height:1.7">
  <span style="color:rgba(255,255,255,0.5)">Status:</span>
  <strong style="color:rgba(255,255,255,0.9)">${formatBeratungPhase(oldPhase)}</strong>
  <span style="color:rgba(255,255,255,0.5)">→</span>
  <strong style="color:#7fe8c8">${formatBeratungPhase(newPhase)}</strong>
</div>
${cta(`${BRAND_URL}/antraege/${beratungId}`, 'Beratung ansehen')}`;
  return send(apiKey, {
    to,
    subject: `Beratung: ${formatBeratungPhase(newPhase)}`,
    html: wrap('Beratung aktualisiert', body, `Phase neu: ${formatBeratungPhase(newPhase)}`),
  });
}

// ============================================================
// Antrag (case) status-change notification (→ company owner)
// ============================================================

export async function sendAntragStatusChangedEmail(
  apiKey: string,
  to: string,
  empfaengerName: string,
  programmName: string,
  newStatus: 'eingereicht' | 'bewilligt' | 'abgelehnt',
  antragId: string
): Promise<boolean> {
  const statusCopy: Record<typeof newStatus, { title: string; line: string; accent: string }> = {
    eingereicht: {
      title: 'Antrag eingereicht',
      line: 'wurde erfolgreich eingereicht und ist in Prüfung.',
      accent: '#c9d1ff',
    },
    bewilligt: {
      title: 'Antrag bewilligt',
      line: 'wurde bewilligt. Glückwunsch!',
      accent: '#7fe8c8',
    },
    abgelehnt: {
      title: 'Antrag abgelehnt',
      line: 'wurde leider abgelehnt.',
      accent: '#ffdad6',
    },
  };
  const copy = statusCopy[newStatus];
  const body = `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">${copy.title}</h2>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Hallo ${empfaengerName},</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">
  dein Antrag zum Programm <strong style="color:${copy.accent}">${escapeHtml(programmName)}</strong> ${copy.line}
</p>
${cta(`${BRAND_URL}/antraege/${antragId}`, 'Antrag ansehen')}`;
  return send(apiKey, {
    to,
    subject: copy.title,
    html: wrap(copy.title, body, `${programmName}: ${copy.title}`),
  });
}

// ============================================================
// Onboarding sequence — triggered by a daily cron via services/
// onboarding.ts. Day 0 = welcome, day 3 = nudge, day 7 = feature tour.
// Each role gets its own three-step arc.
// ============================================================

type OnboardingRole = 'unternehmen' | 'berater';
type OnboardingDay = 0 | 3 | 7;

export async function sendOnboardingEmail(
  apiKey: string,
  role: OnboardingRole,
  day: OnboardingDay,
  to: string,
  firstName: string
): Promise<boolean> {
  const template = role === 'unternehmen' ? UNTERNEHMEN_SEQ[day] : BERATER_SEQ[day];
  if (!template) return false;
  const body = template.body(firstName);
  return send(apiKey, {
    to,
    subject: template.subject,
    html: wrap(template.preview, body, template.preview),
  });
}

interface OnboardingTemplate {
  subject: string;
  preview: string;
  body: (firstName: string) => string;
}

const UNTERNEHMEN_SEQ: Record<OnboardingDay, OnboardingTemplate> = {
  0: {
    subject: 'Willkommen bei fund24',
    preview: 'Dein Konto ist bereit. So findest du dein erstes Förderprogramm.',
    body: (name) => `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Willkommen, ${name}.</h2>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  Schön, dass du bei fund24 bist. In 5 Minuten weißt du, welche Fördertöpfe zu deinem
  Vorhaben passen — und zwar datengestützt aus <strong>3.400+ aktiven Programmen</strong>.
</p>
<p style="margin:0 0 8px;color:rgba(255,255,255,0.85);line-height:1.6">Dein erster Schritt:</p>
${cta(`${BRAND_URL}/foerder-schnellcheck`, 'Kostenlosen Fördercheck starten')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">
  Du kannst jederzeit antworten, wenn du Fragen hast — info@fund24.io.
</p>`,
  },
  3: {
    subject: 'Noch kein Fördercheck gestartet?',
    preview: 'In 5 Minuten hast du eine klare Antwort — und keine Verpflichtung.',
    body: (name) => `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Hi ${name},</h2>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  wir haben dich bisher noch nicht im Fördercheck gesehen. Kein Stress — aber
  vielleicht wusstest du nicht: die meisten Unternehmen lassen Fördermittel
  liegen, obwohl sie anspruchsberechtigt wären.
</p>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  Der Check ist kostenlos, unverbindlich, dauert 5 Minuten — und die KI sagt dir
  klar, welche der 3.400+ Programme zu deinem Vorhaben passen.
</p>
${cta(`${BRAND_URL}/foerder-schnellcheck`, 'Jetzt Fördercheck starten')}
<p style="margin:16px 0 8px;color:rgba(255,255,255,0.7);font-size:13px">
  Alternativ: Stöber direkt durch den <a href="${BRAND_URL}/programme" style="color:#c9d1ff">Katalog</a>
  und filter nach Branche, Region oder Förderart.
</p>`,
  },
  7: {
    subject: 'Einen Berater an deiner Seite',
    preview: 'Für komplexe Anträge lohnt sich Expertise — zum Erfolgshonorar.',
    body: (name) => `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Hi ${name},</h2>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  ein Fördermittelantrag kann aufwändig werden — vor allem bei größeren Summen.
  Gute Nachrichten: Auf fund24 findest du geprüfte Berater, die dich durch den
  Prozess führen.
</p>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  Das Honorar ist transparent: <strong>9,99 % der bewilligten Fördersumme</strong> —
  und <strong>nur bei Erfolg</strong>. Bei Ablehnung zahlst du nichts.
</p>
${cta(`${BRAND_URL}/berater`, 'Berater entdecken')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">
  Du entscheidest, ob und mit wem du arbeitest. Kein Druck.
</p>`,
  },
};

const BERATER_SEQ: Record<OnboardingDay, OnboardingTemplate> = {
  0: {
    subject: 'Willkommen als Berater bei fund24',
    preview: 'Dein Profil geht erst live, wenn du Expertise + Dienstleistungen hinterlegst.',
    body: (name) => `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Willkommen, ${name}.</h2>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  Schön, dass du als Berater bei fund24 bist. Dein Profil erscheint im öffentlichen
  Verzeichnis, sobald du drei Dinge hinterlegt hast:
</p>
<ol style="margin:0 0 16px;padding-left:24px;color:rgba(255,255,255,0.85);line-height:1.8">
  <li>Grundprofil (Foto, Bio, Branchen, Region)</li>
  <li>Fachliche Expertise (Förderbereiche, Bundesländer)</li>
  <li>Mindestens eine Dienstleistung mit Preisstruktur</li>
</ol>
${cta(`${BRAND_URL}/onboarding/profil`, 'Profil vervollständigen')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">
  Durchschnittliche Zeit: 10 Minuten. Je aussagekräftiger dein Profil, desto
  passgenauer die Anfragen.
</p>`,
  },
  3: {
    subject: 'Profil vollständig?',
    preview: 'Profile ohne Expertise bleiben unsichtbar. Hier die Checkliste.',
    body: (name) => `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Hi ${name},</h2>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  kurze Erinnerung: Berater-Profile ohne hinterlegte Expertise und mindestens
  eine Dienstleistung erscheinen <strong>nicht</strong> im öffentlichen Verzeichnis.
  Schade, denn Unternehmen können dich dann auch nicht anschreiben.
</p>
${cta(`${BRAND_URL}/dashboard/berater/profil`, 'Profil-Status prüfen')}
<p style="margin:16px 0 0;color:rgba(255,255,255,0.7);line-height:1.6">
  Tipp: Die spezifischsten Profile (konkrete Förderbereiche, klarer Service-Typ)
  bekommen die meisten Anfragen. Vermeide Marketing-Floskeln, sei konkret.
</p>`,
  },
  7: {
    subject: 'So beantwortest du Anfragen richtig',
    preview: 'Die ersten 24 Stunden entscheiden: Schnelle Antwort = doppelt so hohe Abschlussrate.',
    body: (name) => `
<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:600">Hi ${name},</h2>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  Sobald eine Anfrage reinkommt, siehst du sie in deinem Dashboard und bekommst
  gleichzeitig eine E-Mail. Unsere Daten zeigen: Berater, die innerhalb von
  24 Stunden antworten, haben <strong>2× höhere Abschlussraten</strong>.
</p>
<p style="margin:0 0 12px;color:rgba(255,255,255,0.85);line-height:1.6">
  Dein Annehmen/Ablehnen landet sofort als E-Mail beim Unternehmen — nichts geht
  verloren, nichts braucht manuelle Nachverfolgung.
</p>
${cta(`${BRAND_URL}/dashboard/berater/anfragen`, 'Anfragen-Inbox öffnen')}
<p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.5)">
  Fragen zu Plattform oder Abrechnung? info@fund24.io.
</p>`,
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
