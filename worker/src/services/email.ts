// Email Service — Resend API, fund24 branded templates.
// All copy is German, design mirrors the Architect Dark UI so emails feel
// like part of the product. FROM address uses the authenticated fund24.io
// domain configured in Resend.

const FROM = 'fund24 <noreply@fund24.io>';
const BRAND_URL = 'https://fund24.io';

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

// Shared HTML shell. All templates call wrap() with title + body blocks.
function wrap(title: string, body: string, preview: string = ''): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#737688;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff">
<div style="display:none;max-height:0;overflow:hidden">${preview}</div>
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
  <p style="margin:0 0 24px;font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(255,255,255,0.5)">fund24</p>
  <div style="background:rgba(99,124,116,0.45);border-radius:12px;padding:32px">
    ${body}
  </div>
  <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.4);text-align:center;line-height:1.6">
    <a href="${BRAND_URL}" style="color:rgba(255,255,255,0.6);text-decoration:none">fund24.io</a> — Fördermittel einfach finden<br />
    Fröba Sales Solutions UG (haftungsbeschränkt), Kronach · <a href="${BRAND_URL}/impressum" style="color:rgba(255,255,255,0.4)">Impressum</a> · <a href="${BRAND_URL}/datenschutz" style="color:rgba(255,255,255,0.4)">Datenschutz</a>
  </p>
</div>
</body>
</html>`;
}

function cta(href: string, label: string): string {
  return `<p style="margin:28px 0 8px;text-align:center">
<a href="${href}" style="display:inline-block;padding:14px 32px;background:#6575ad;background:linear-gradient(135deg,#6575ad 0%,#4a5a8f 100%);color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">${label}</a>
</p>`;
}

// ============================================================
// Existing: Auth flows
// ============================================================

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
