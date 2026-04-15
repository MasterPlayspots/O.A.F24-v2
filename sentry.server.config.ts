// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/sentry/scrubber";

Sentry.init({
  dsn: "https://bee9cd2df7db3b18bd289e5d2585449a@o4511178666016768.ingest.de.sentry.io/4511178667065424",

  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),

  enableLogs: true,

  // DSGVO: PII stripping handled via beforeSend scrubber
  sendDefaultPii: false,
  beforeSend: sentryBeforeSend,
});
