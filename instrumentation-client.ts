// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { sentryBeforeSend } from "@/lib/sentry/scrubber";

Sentry.init({
  dsn: "https://bee9cd2df7db3b18bd289e5d2585449a@o4511178666016768.ingest.de.sentry.io/4511178667065424",

  integrations: [Sentry.replayIntegration()],

  tracesSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
  ),
  enableLogs: true,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // DSGVO: PII stripping handled via beforeSend scrubber
  sendDefaultPii: false,
  beforeSend: sentryBeforeSend,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
