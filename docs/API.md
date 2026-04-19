# Fund24 API Reference

**Auto-generated** from `worker/src/routes` — do not edit by hand.
Run `npm run docs:api` to regenerate. CI blocks merges when this file is stale.

## Summary

| Group | Endpoints |
|---|---:|
| `admin` | 15 |
| `antraege` | 8 |
| `auth` | 11 |
| `berater` | 13 |
| `beratungen` | 3 |
| `branchen` | 2 |
| `check` | 5 |
| `checks` | 2 |
| `foerdermittel` | 23 |
| `gdpr` | 3 |
| `me` | 10 |
| `nachrichten` | 5 |
| `netzwerk` | 5 |
| `news` | 6 |
| `oa` | 4 |
| `orders` | 1 |
| `payments` | 4 |
| `promo` | 4 |
| `reports` | 10 |
| `tracker` | 5 |
| `unternehmen` | 2 |
| `verify-payment` | 1 |
| `vorlagen` | 3 |

**Total:** 145 endpoints across 23 groups

## admin (15)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/audit-logs` | requireAuth (blanket) | [`admin.ts:166`](../worker/src/routes/admin.ts#L166) |
| `POST` | `/audit-logs/cleanup` | requireAuth (blanket) | [`admin.ts:180`](../worker/src/routes/admin.ts#L180) |
| `GET` | `/bafa-cert/pending` | requireAuth (blanket) | [`admin.ts:462`](../worker/src/routes/admin.ts#L462) |
| `GET` | `/check-foerdermittel` | requireAuth (blanket) | [`admin.ts:292`](../worker/src/routes/admin.ts#L292) |
| `GET` | `/dashboard` | requireAuth (blanket) | [`admin.ts:129`](../worker/src/routes/admin.ts#L129) |
| `GET` | `/email-outbox` | requireAuth (blanket) | [`admin.ts:369`](../worker/src/routes/admin.ts#L369) |
| `POST` | `/email-outbox/:id/retry` | requireAuth (blanket) | [`admin.ts:409`](../worker/src/routes/admin.ts#L409) |
| `POST` | `/onboarding/dispatch` | requireAuth (blanket) | [`admin.ts:121`](../worker/src/routes/admin.ts#L121) |
| `GET` | `/provisionen` | requireAuth (blanket) | [`admin.ts:67`](../worker/src/routes/admin.ts#L67) |
| `PATCH` | `/provisionen/:id` | requireAuth (blanket) | [`admin.ts:85`](../worker/src/routes/admin.ts#L85) |
| `GET` | `/stats` | requireAuth (blanket) | [`admin.ts:267`](../worker/src/routes/admin.ts#L267) |
| `GET` | `/users` | requireAuth (blanket) | [`admin.ts:186`](../worker/src/routes/admin.ts#L186) |
| `DELETE` | `/users/:id` | requireAuth (blanket) | [`admin.ts:238`](../worker/src/routes/admin.ts#L238) |
| `PATCH` | `/users/:id` | requireAuth (blanket) | [`admin.ts:195`](../worker/src/routes/admin.ts#L195) |
| `PATCH` | `/users/:id/role` | requireAuth (blanket) | [`admin.ts:224`](../worker/src/routes/admin.ts#L224) |

## antraege (8)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/:id` | requireAuth | [`antraege.ts:91`](../worker/src/routes/antraege.ts#L91) |
| `PATCH` | `/:id` | requireAuth | [`antraege.ts:192`](../worker/src/routes/antraege.ts#L192) |
| `GET` | `/:id/dokumente` | requireAuth | [`antraege.ts:281`](../worker/src/routes/antraege.ts#L281) |
| `POST` | `/:id/dokumente` | requireAuth | [`antraege.ts:313`](../worker/src/routes/antraege.ts#L313) |
| `DELETE` | `/:id/dokumente/:dokId` | requireAuth | [`antraege.ts:364`](../worker/src/routes/antraege.ts#L364) |
| `GET` | `/:id/zugriff` | requireAuth | [`antraege.ts:411`](../worker/src/routes/antraege.ts#L411) |
| `POST` | `/:id/zugriff` | requireAuth | [`antraege.ts:458`](../worker/src/routes/antraege.ts#L458) |
| `DELETE` | `/:id/zugriff/:zugriffId` | requireAuth | [`antraege.ts:510`](../worker/src/routes/antraege.ts#L510) |

## auth (11)

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/forgot-password` | - | [`auth.ts:477`](../worker/src/routes/auth.ts#L477) |
| `POST` | `/login` | - | [`auth.ts:129`](../worker/src/routes/auth.ts#L129) |
| `POST` | `/logout` | requireAuth | [`auth.ts:577`](../worker/src/routes/auth.ts#L577) |
| `GET` | `/me` | requireAuth | [`auth.ts:429`](../worker/src/routes/auth.ts#L429) |
| `PATCH` | `/me` | requireAuth | [`auth.ts:453`](../worker/src/routes/auth.ts#L453) |
| `POST` | `/refresh` | - | [`auth.ts:242`](../worker/src/routes/auth.ts#L242) |
| `POST` | `/register` | - | [`auth.ts:48`](../worker/src/routes/auth.ts#L48) |
| `POST` | `/resend-code` | - | [`auth.ts:403`](../worker/src/routes/auth.ts#L403) |
| `POST` | `/reset-password` | - | [`auth.ts:529`](../worker/src/routes/auth.ts#L529) |
| `POST` | `/verify-code` | - | [`auth.ts:290`](../worker/src/routes/auth.ts#L290) |
| `POST` | `/verify-email` | - | [`auth.ts:280`](../worker/src/routes/auth.ts#L280) |

## berater (13)

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/:id/anfrage` | requireAuth | [`berater.ts:501`](../worker/src/routes/berater.ts#L501) |
| `POST` | `/abwicklung/upload` | requireAuth | [`berater.ts:629`](../worker/src/routes/berater.ts#L629) |
| `GET` | `/anfragen` | requireAuth | [`berater.ts:393`](../worker/src/routes/berater.ts#L393) |
| `PATCH` | `/anfragen/:id` | requireAuth | [`berater.ts:414`](../worker/src/routes/berater.ts#L414) |
| `POST` | `/bafa-cert` | requireAuth | [`berater.ts:670`](../worker/src/routes/berater.ts#L670) |
| `GET` | `/bafa-cert/status` | requireAuth | [`berater.ts:752`](../worker/src/routes/berater.ts#L752) |
| `GET` | `/dienstleistungen` | requireAuth | [`berater.ts:316`](../worker/src/routes/berater.ts#L316) |
| `POST` | `/dienstleistungen` | requireAuth | [`berater.ts:331`](../worker/src/routes/berater.ts#L331) |
| `GET` | `/expertise` | requireAuth | [`berater.ts:238`](../worker/src/routes/berater.ts#L238) |
| `POST` | `/expertise` | requireAuth | [`berater.ts:253`](../worker/src/routes/berater.ts#L253) |
| `GET` | `/profil` | requireAuth | [`berater.ts:141`](../worker/src/routes/berater.ts#L141) |
| `POST` | `/profil` | requireAuth | [`berater.ts:151`](../worker/src/routes/berater.ts#L151) |
| `GET` | `/provision-vertraege` | requireAuth | [`berater.ts:595`](../worker/src/routes/berater.ts#L595) |

## beratungen (3)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | requireAuth | [`beratungen.ts:57`](../worker/src/routes/beratungen.ts#L57) |
| `GET` | `/:id` | requireAuth | [`beratungen.ts:77`](../worker/src/routes/beratungen.ts#L77) |
| `PATCH` | `/:id` | requireAuth | [`beratungen.ts:101`](../worker/src/routes/beratungen.ts#L101) |

## branchen (2)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | - | [`branchen.ts:20`](../worker/src/routes/branchen.ts#L20) |
| `GET` | `/:id` | - | [`branchen.ts:29`](../worker/src/routes/branchen.ts#L29) |

## check (5)

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/` | requireAuth | [`check.ts:81`](../worker/src/routes/check.ts#L81) |
| `POST` | `/:sessionId/analyze` | requireAuth | [`check.ts:401`](../worker/src/routes/check.ts#L401) |
| `POST` | `/:sessionId/chat` | requireAuth | [`check.ts:266`](../worker/src/routes/check.ts#L266) |
| `POST` | `/:sessionId/docs` | requireAuth | [`check.ts:331`](../worker/src/routes/check.ts#L331) |
| `GET` | `/:sessionId/plan` | requireAuth | [`check.ts:508`](../worker/src/routes/check.ts#L508) |

## checks (2)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | - | [`checks.ts:75`](../worker/src/routes/checks.ts#L75) |
| `POST` | `/` | - | [`checks.ts:72`](../worker/src/routes/checks.ts#L72) |

## foerdermittel (23)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/cases` | requireAuth | [`cases.ts:365`](../worker/src/routes/foerdermittel/cases.ts#L365) |
| `POST` | `/cases` | requireAuth | [`cases.ts:21`](../worker/src/routes/foerdermittel/cases.ts#L21) |
| `GET` | `/cases/:caseId/dokumente` | requireAuth | [`cases.ts:591`](../worker/src/routes/foerdermittel/cases.ts#L591) |
| `POST` | `/cases/:caseId/dokumente` | requireAuth | [`cases.ts:530`](../worker/src/routes/foerdermittel/cases.ts#L530) |
| `PATCH` | `/cases/:caseId/steps/:stepId` | requireAuth | [`cases.ts:450`](../worker/src/routes/foerdermittel/cases.ts#L450) |
| `GET` | `/cases/:id` | requireAuth | [`cases.ts:411`](../worker/src/routes/foerdermittel/cases.ts#L411) |
| `POST` | `/cases/:id/chat` | requireAuth | [`chat.ts:20`](../worker/src/routes/foerdermittel/chat.ts#L20) |
| `POST` | `/chat` | requireAuth | [`chat.ts:152`](../worker/src/routes/foerdermittel/chat.ts#L152) |
| `GET` | `/chat/:id` | requireAuth | [`chat.ts:261`](../worker/src/routes/foerdermittel/chat.ts#L261) |
| `GET` | `/favorites` | requireAuth | [`favoriten.ts:8`](../worker/src/routes/foerdermittel/favoriten.ts#L8) |
| `POST` | `/favorites` | requireAuth | [`favoriten.ts:17`](../worker/src/routes/foerdermittel/favoriten.ts#L17) |
| `DELETE` | `/favorites/:programId` | requireAuth | [`favoriten.ts:42`](../worker/src/routes/foerdermittel/favoriten.ts#L42) |
| `GET` | `/favorites/:programId/check` | requireAuth | [`favoriten.ts:60`](../worker/src/routes/foerdermittel/favoriten.ts#L60) |
| `GET` | `/katalog` | - | [`katalog.ts:19`](../worker/src/routes/foerdermittel/katalog.ts#L19) |
| `GET` | `/katalog/:id` | - | [`katalog.ts:140`](../worker/src/routes/foerdermittel/katalog.ts#L140) |
| `GET` | `/katalog/filters` | - | [`katalog.ts:103`](../worker/src/routes/foerdermittel/katalog.ts#L103) |
| `POST` | `/match` | requireAuth | [`match.ts:110`](../worker/src/routes/foerdermittel/match.ts#L110) |
| `GET` | `/matches` | requireAuth | [`match.ts:259`](../worker/src/routes/foerdermittel/match.ts#L259) |
| `GET` | `/notifications` | requireAuth | [`notifications.ts:7`](../worker/src/routes/foerdermittel/notifications.ts#L7) |
| `PATCH` | `/notifications/:id/read` | requireAuth | [`notifications.ts:35`](../worker/src/routes/foerdermittel/notifications.ts#L35) |
| `GET` | `/profile` | requireAuth | [`match.ts:25`](../worker/src/routes/foerdermittel/match.ts#L25) |
| `POST` | `/profile` | requireAuth | [`match.ts:41`](../worker/src/routes/foerdermittel/match.ts#L41) |
| `GET` | `/program-documents/:programId` | requireAuth | [`notifications.ts:51`](../worker/src/routes/foerdermittel/notifications.ts#L51) |

## gdpr (3)

| Method | Path | Auth | Source |
|---|---|---|---|
| `DELETE` | `/account` | requireAuth | [`gdpr.ts:48`](../worker/src/routes/gdpr.ts#L48) |
| `GET` | `/export` | requireAuth | [`gdpr.ts:13`](../worker/src/routes/gdpr.ts#L13) |
| `POST` | `/privacy-consent` | requireAuth | [`gdpr.ts:79`](../worker/src/routes/gdpr.ts#L79) |

## me (10)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/anfragen` | requireAuth | [`me.ts:73`](../worker/src/routes/me.ts#L73) |
| `GET` | `/antraege` | requireAuth | [`me.ts:32`](../worker/src/routes/me.ts#L32) |
| `POST` | `/antraege` | requireAuth | [`me.ts:34`](../worker/src/routes/me.ts#L34) |
| `GET` | `/beratungen` | requireAuth | [`me.ts:56`](../worker/src/routes/me.ts#L56) |
| `GET` | `/dashboard` | requireAuth | [`me.ts:94`](../worker/src/routes/me.ts#L94) |
| `GET` | `/favoriten` | requireAuth | [`me.ts:37`](../worker/src/routes/me.ts#L37) |
| `GET` | `/notifications` | requireAuth | [`me.ts:40`](../worker/src/routes/me.ts#L40) |
| `GET` | `/unternehmen` | requireAuth | [`me.ts:51`](../worker/src/routes/me.ts#L51) |
| `POST` | `/unternehmen` | requireAuth | [`me.ts:53`](../worker/src/routes/me.ts#L53) |
| `PUT` | `/unternehmen` | requireAuth | [`me.ts:52`](../worker/src/routes/me.ts#L52) |

## nachrichten (5)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | requireAuth (blanket) | [`nachrichten.ts:14`](../worker/src/routes/nachrichten.ts#L14) |
| `POST` | `/` | requireAuth (blanket) | [`nachrichten.ts:21`](../worker/src/routes/nachrichten.ts#L21) |
| `GET` | `/:conversationId` | requireAuth (blanket) | [`nachrichten.ts:63`](../worker/src/routes/nachrichten.ts#L63) |
| `POST` | `/:conversationId` | requireAuth (blanket) | [`nachrichten.ts:76`](../worker/src/routes/nachrichten.ts#L76) |
| `PATCH` | `/:conversationId/read` | requireAuth (blanket) | [`nachrichten.ts:111`](../worker/src/routes/nachrichten.ts#L111) |

## netzwerk (5)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/anfragen` | requireAuth | [`netzwerk.ts:133`](../worker/src/routes/netzwerk.ts#L133) |
| `POST` | `/anfragen` | requireAuth | [`netzwerk.ts:145`](../worker/src/routes/netzwerk.ts#L145) |
| `PATCH` | `/anfragen/:id` | requireAuth | [`netzwerk.ts:178`](../worker/src/routes/netzwerk.ts#L178) |
| `GET` | `/berater` | - | [`netzwerk.ts:20`](../worker/src/routes/netzwerk.ts#L20) |
| `GET` | `/berater/:id` | - | [`netzwerk.ts:72`](../worker/src/routes/netzwerk.ts#L72) |

## news (6)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | requireAuth (blanket) | [`news.ts:55`](../worker/src/routes/news.ts#L55) |
| `GET` | `/` | requireAuth (blanket) | [`news.ts:107`](../worker/src/routes/news.ts#L107) |
| `POST` | `/` | requireAuth (blanket) | [`news.ts:115`](../worker/src/routes/news.ts#L115) |
| `DELETE` | `/:id` | requireAuth (blanket) | [`news.ts:205`](../worker/src/routes/news.ts#L205) |
| `PATCH` | `/:id` | requireAuth (blanket) | [`news.ts:158`](../worker/src/routes/news.ts#L158) |
| `GET` | `/:slug` | requireAuth (blanket) | [`news.ts:77`](../worker/src/routes/news.ts#L77) |

## oa (4)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/cp` | - | [`oa.ts:32`](../worker/src/routes/oa.ts#L32) |
| `GET` | `/history` | - | [`oa.ts:42`](../worker/src/routes/oa.ts#L42) |
| `GET` | `/status` | - | [`oa.ts:11`](../worker/src/routes/oa.ts#L11) |
| `GET` | `/va` | - | [`oa.ts:37`](../worker/src/routes/oa.ts#L37) |

## orders (1)

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/create` | requireAuth | [`orders.ts:17`](../worker/src/routes/orders.ts#L17) |

## payments (4)

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/paypal/capture-order` | requireAuth | [`payments.ts:185`](../worker/src/routes/payments.ts#L185) |
| `POST` | `/paypal/create-order` | requireAuth | [`payments.ts:146`](../worker/src/routes/payments.ts#L146) |
| `POST` | `/stripe/create-session` | requireAuth | [`payments.ts:20`](../worker/src/routes/payments.ts#L20) |
| `POST` | `/stripe/webhook` | - | [`payments.ts:77`](../worker/src/routes/payments.ts#L77) |

## promo (4)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/codes` | requireAuth | [`promo.ts:87`](../worker/src/routes/promo.ts#L87) |
| `POST` | `/create` | requireAuth | [`promo.ts:93`](../worker/src/routes/promo.ts#L93) |
| `POST` | `/redeem` | requireAuth | [`promo.ts:40`](../worker/src/routes/promo.ts#L40) |
| `POST` | `/validate` | - | [`promo.ts:21`](../worker/src/routes/promo.ts#L21) |

## reports (10)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | requireAuth | [`reports.ts:287`](../worker/src/routes/reports.ts#L287) |
| `POST` | `/` | requireAuth | [`reports.ts:356`](../worker/src/routes/reports.ts#L356) |
| `GET` | `/:id` | requireAuth | [`reports.ts:338`](../worker/src/routes/reports.ts#L338) |
| `PATCH` | `/:id` | requireAuth | [`reports.ts:371`](../worker/src/routes/reports.ts#L371) |
| `PATCH` | `/:id/finalize` | requireAuth | [`reports.ts:447`](../worker/src/routes/reports.ts#L447) |
| `POST` | `/:id/finalize` | requireAuth | [`reports.ts:429`](../worker/src/routes/reports.ts#L429) |
| `GET` | `/download/:token` | - | [`reports.ts:249`](../worker/src/routes/reports.ts#L249) |
| `POST` | `/generate` | requireAuth | [`reports.ts:59`](../worker/src/routes/reports.ts#L59) |
| `GET` | `/preview/:id` | requireAuth | [`reports.ts:194`](../worker/src/routes/reports.ts#L194) |
| `POST` | `/unlock` | - | [`reports.ts:211`](../worker/src/routes/reports.ts#L211) |

## tracker (5)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | requireAuth | [`tracker.ts:41`](../worker/src/routes/tracker.ts#L41) |
| `POST` | `/` | requireAuth | [`tracker.ts:76`](../worker/src/routes/tracker.ts#L76) |
| `DELETE` | `/:id` | requireAuth | [`tracker.ts:203`](../worker/src/routes/tracker.ts#L203) |
| `GET` | `/:id` | requireAuth | [`tracker.ts:124`](../worker/src/routes/tracker.ts#L124) |
| `PATCH` | `/:id` | requireAuth | [`tracker.ts:147`](../worker/src/routes/tracker.ts#L147) |

## unternehmen (2)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/profil` | requireAuth | [`unternehmen.ts:77`](../worker/src/routes/unternehmen.ts#L77) |
| `POST` | `/profil` | requireAuth | [`unternehmen.ts:88`](../worker/src/routes/unternehmen.ts#L88) |

## verify-payment (1)

| Method | Path | Auth | Source |
|---|---|---|---|
| `POST` | `/verify-payment` | - | [`verify-payment.ts:12`](../worker/src/routes/verify-payment.ts#L12) |

## vorlagen (3)

| Method | Path | Auth | Source |
|---|---|---|---|
| `GET` | `/` | requireAuth | [`vorlagen.ts:21`](../worker/src/routes/vorlagen.ts#L21) |
| `POST` | `/` | requireAuth | [`vorlagen.ts:32`](../worker/src/routes/vorlagen.ts#L32) |
| `DELETE` | `/:id` | requireAuth | [`vorlagen.ts:48`](../worker/src/routes/vorlagen.ts#L48) |
