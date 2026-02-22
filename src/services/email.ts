// Email Service - Resend API

export async function sendPasswordResetEmail(apiKey: string, to: string, firstName: string, resetUrl: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'BAFA Creator AI <noreply@zfbf.info>',
        to: [to],
        subject: 'Passwort zurücksetzen',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="display:flex;height:6px;margin-bottom:24px"><div style="flex:1;background:#000"></div><div style="flex:1;background:#DD0000"></div><div style="flex:1;background:#FFCC00"></div></div>
<h2>Passwort zurücksetzen</h2>
<p>Hallo ${firstName},</p>
<p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
<p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#DD0000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Passwort zurücksetzen</a></p>
<p style="font-size:13px;color:#888">Dieser Link ist 1 Stunde gültig. Wenn Sie keine Passwort-Zurücksetzung angefordert haben, ignorieren Sie diese E-Mail.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#aaa">BAFA Creator AI – zfbf.info</p></div>`,
      }),
    })
    return res.ok
  } catch (err) { console.error('[Email] sendPasswordResetEmail failed:', err); return false }
}

export async function sendVerificationCodeEmail(apiKey: string, to: string, firstName: string, code: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'BAFA Creator AI <noreply@zfbf.info>',
        to: [to],
        subject: `${code} - Ihr Bestaetigungscode`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="display:flex;height:6px;margin-bottom:24px"><div style="flex:1;background:#000"></div><div style="flex:1;background:#DD0000"></div><div style="flex:1;background:#FFCC00"></div></div>
<h2>Ihr Bestaetigungscode</h2>
<p>Hallo ${firstName},</p>
<p>Ihr Code zur Verifizierung:</p>
<div style="margin:24px 0;text-align:center">
<span style="display:inline-block;padding:16px 32px;background:#f5f5f5;border:2px solid #000;border-radius:8px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace">${code}</span>
</div>
<p style="font-size:13px;color:#888">Dieser Code ist 15 Minuten gueltig. Wenn Sie sich nicht registriert haben, ignorieren Sie diese E-Mail.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#aaa">BAFA Creator AI – zfbf.info</p></div>`,
      }),
    })
    return res.ok
  } catch (err) { console.error('[Email] sendVerificationCodeEmail failed:', err); return false }
}

export async function sendDownloadEmail(apiKey: string, to: string, firstName: string, downloadUrl: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'BAFA Creator AI <noreply@zfbf.info>',
        to: [to],
        subject: 'Ihr BAFA-Bericht ist bereit zum Download',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
<div style="display:flex;height:6px;margin-bottom:24px"><div style="flex:1;background:#000"></div><div style="flex:1;background:#DD0000"></div><div style="flex:1;background:#FFCC00"></div></div>
<h2>Ihr BAFA-Bericht ist bereit!</h2>
<p>Hallo ${firstName},</p>
<p>Ihr BAFA-Beratungsbericht wurde freigeschaltet und steht zum Download bereit.</p>
<p style="margin:24px 0"><a href="${downloadUrl}" style="display:inline-block;padding:12px 28px;background:#DD0000;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Bericht herunterladen</a></p>
<p style="font-size:13px;color:#888">Der Download-Link ist 24 Stunden gültig.</p>
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#aaa">BAFA Creator AI – zfbf.info</p></div>`,
      }),
    })
    return res.ok
  } catch (err) { console.error('[Email] sendDownloadEmail failed:', err); return false }
}
