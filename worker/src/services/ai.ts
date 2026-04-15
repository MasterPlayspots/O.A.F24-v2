// AI Generation Service - Cloudflare AI
import { log } from "./logger";

const SYSTEM_PROMPT = `Du bist ein erfahrener BAFA-Beratungsexperte, der professionelle Beratungsberichte
für das Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA) erstellt.
Schreibe ausschließlich in professionellem, sachlichem Deutsch. Verwende BAFA-konforme Terminologie.
Verwende "Herausforderungen" statt "Probleme". Keine Emoji oder informelle Sprache.`;

interface GenerateOpts {
  branche: string;
  unterbranche?: string;
  companyName: string;
  stichpunkte?: string[];
  herausforderungen?: string[];
  module?: string[];
  massnahmen?: Array<{ name: string; methode: string; ergebnis: string }>;
  phase: "ausgangslage" | "beratungsinhalte" | "massnahmen" | "ergebnisse" | "nachhaltigkeit";
}

export async function generateReportSection(
  ai: Ai,
  opts: GenerateOpts
): Promise<{
  success: boolean;
  text?: string;
  structured?: Record<string, string>;
  error?: string;
}> {
  const prompt = buildPrompt(opts);

  const model = "@cf/meta/llama-3.1-8b-instruct";

  for (let attempt = 0; attempt < 2; attempt++) {
    const startTime = Date.now();
    try {
      const res = (await ai.run(model as any, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      })) as any;

      const duration = Date.now() - startTime;

      if (!res?.response) {
        log("warn", "ai_generation", {
          model,
          phase: opts.phase,
          duration_ms: duration,
          success: false,
          attempt: attempt + 1,
          reason: "empty_response",
        });
        continue;
      }

      log("info", "ai_generation", {
        model,
        phase: opts.phase,
        duration_ms: duration,
        success: true,
        attempt: attempt + 1,
      });

      if (opts.phase === "ergebnisse" || opts.phase === "nachhaltigkeit") {
        try {
          const match = res.response.match(/\{[\s\S]*\}/);
          if (match) return { success: true, structured: JSON.parse(match[0]), text: res.response };
        } catch {
          /* fall through */
        }
      }
      return { success: true, text: res.response };
    } catch (err) {
      const duration = Date.now() - startTime;
      log("error", "ai_generation", {
        model,
        phase: opts.phase,
        duration_ms: duration,
        success: false,
        attempt: attempt + 1,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  log("error", "ai_generation_exhausted", {
    model,
    phase: opts.phase,
    max_attempts: 2,
  });

  return { success: false, error: "KI-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut." };
}

export async function generateReportSectionStream(
  ai: Ai,
  opts: GenerateOpts
): Promise<ReadableStream> {
  const prompt = buildPrompt(opts);
  const model = "@cf/meta/llama-3.1-8b-instruct";
  const startTime = Date.now();

  try {
    const stream = await ai.run(model as any, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.7,
      stream: true,
    });

    log("info", "ai_stream_start", {
      model,
      phase: opts.phase,
      latency_ms: Date.now() - startTime,
    });

    return stream as unknown as ReadableStream;
  } catch (err) {
    log("error", "ai_stream_error", {
      model,
      phase: opts.phase,
      duration_ms: Date.now() - startTime,
      error: err instanceof Error ? err.message : "unknown",
    });
    // Return a stream with error message
    return new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode("data: [ERROR] KI-Generierung fehlgeschlagen\n\n")
        );
        controller.close();
      },
    });
  }
}

function buildPrompt(o: GenerateOpts): string {
  const br = o.unterbranche ? `${o.branche} (${o.unterbranche})` : o.branche;
  switch (o.phase) {
    case "ausgangslage":
      return `Erstelle den Abschnitt "Ausgangslage" für einen BAFA-Beratungsbericht.\nUnternehmen: ${o.companyName}\nBranche: ${br}\nStichpunkte: ${o.stichpunkte?.join(", ") || "Keine"}\nHerausforderungen: ${o.herausforderungen?.join(", ") || "Keine"}\n\nSchreibe 2-3 Absätze.`;
    case "beratungsinhalte":
      return `Erstelle "Beratungsinhalte" für ${o.companyName} (${br}).\nModule: ${o.module?.join(", ") || "Keine"}\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nBeschreibe die durchgeführten Beratungsleistungen.`;
    case "massnahmen":
      return `Erstelle "Maßnahmenplan und Handlungsempfehlungen" für ${o.companyName} (${br}).\nModule: ${o.module?.join(", ") || "Keine"}\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nErstelle einen konkreten Maßnahmenplan.`;
    case "ergebnisse":
      return `Generiere Ergebnisse für ${o.companyName} (${br}).\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nFormat als JSON: { "kurzfristig": "...", "mittelfristig": "...", "langfristig": "..." }`;
    case "nachhaltigkeit":
      return `Generiere Nachhaltigkeitsaspekte für ${o.companyName} (${br}).\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nFormat als JSON: { "oekonomisch": "...", "oekologisch": "...", "sozial": "..." }`;
  }
}
