interface ScrapedCompany {
  firmenname?: string;
  rechtsform?: string;
  ceo?: string;
  address?: string;
  plz?: string;
  city?: string;
  bundesland?: string;
  hrb_number?: string;
  court?: string;
  ust_id?: string;
  phone?: string;
  email?: string;
}

const BUNDESLAND_MAP: Record<string, string> = {
  berlin: "Berlin",
  hamburg: "Hamburg",
  münchen: "Bayern",
  bayern: "Bayern",
  nrw: "Nordrhein-Westfalen",
  "nordrhein-westfalen": "Nordrhein-Westfalen",
  "baden-württemberg": "Baden-Württemberg",
  stuttgart: "Baden-Württemberg",
  hessen: "Hessen",
  frankfurt: "Hessen",
  niedersachsen: "Niedersachsen",
  hannover: "Niedersachsen",
  sachsen: "Sachsen",
  dresden: "Sachsen",
  "schleswig-holstein": "Schleswig-Holstein",
  "rheinland-pfalz": "Rheinland-Pfalz",
  mainz: "Rheinland-Pfalz",
  thüringen: "Thüringen",
  saarland: "Saarland",
  brandenburg: "Brandenburg",
  "mecklenburg-vorpommern": "Mecklenburg-Vorpommern",
  "sachsen-anhalt": "Sachsen-Anhalt",
  bremen: "Bremen",
};

export async function scrapeCompanyFromUrl(url: string): Promise<ScrapedCompany> {
  const result: ScrapedCompany = {};

  // Normalize URL
  if (!url.startsWith("http")) url = "https://" + url;

  // Try impressum page first, fallback to main page
  const impressumUrls = [new URL("/impressum", url).href, new URL("/imprint", url).href, url];

  let html = "";
  for (const tryUrl of impressumUrls) {
    try {
      const resp = await fetch(tryUrl, {
        headers: { "User-Agent": "Fund24-Bot/1.0 (Foerdermittel-Check)" },
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        html = await resp.text();
        if (html.length > 500) break;
      }
    } catch {
      /* try next URL */
    }
  }

  if (!html) return result;

  // Strip HTML tags for text analysis
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  // Extract company name (pattern: "Firma:" or before GmbH/AG/UG etc.)
  const nameMatch =
    text.match(
      /(?:Firma|Firmenname|Unternehmen)[:\s]+([A-ZÄÖÜ][^\n,;]{2,60}(?:GmbH|AG|UG|e\.K\.|OHG|KG|mbH|SE))/i
    ) ||
    text.match(
      /([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\s&\-\.]{2,50}(?:GmbH|AG|UG|e\.K\.|OHG|KG|mbH|SE)\s*(?:\(haftungsbeschränkt\))?)/
    );
  if (nameMatch?.[1]) result.firmenname = nameMatch[1].trim();

  // Extract legal form
  const formMatch = text.match(/\b(GmbH|AG|UG|e\.K\.|OHG|KG|GbR|SE)\b/);
  if (formMatch?.[1]) result.rechtsform = formMatch[1];

  // Extract CEO
  const ceoMatch = text.match(
    /(?:Geschäftsführ(?:er|ung)|Vorstand|Inhaber|Vertretungsberecht)[:\s]+([A-ZÄÖÜ][a-zäöüß]+\s[A-ZÄÖÜ][a-zäöüß]+)/i
  );
  if (ceoMatch?.[1]) result.ceo = ceoMatch[1].trim();

  // Extract HRB number
  const hrbMatch = text.match(/(?:HR[AB]|Handelsregister)[:\s]*([A-Z]*\s*\d{3,8}\s*[A-Z]*)/i);
  if (hrbMatch?.[1]) result.hrb_number = hrbMatch[1].trim();

  // Extract court
  const courtMatch = text.match(
    /(?:Amtsgericht|Registergericht)[:\s]+([A-ZÄÖÜ][a-zäöüß]+(?:\s[a-zäöüß]+)?)/i
  );
  if (courtMatch?.[1]) result.court = courtMatch[1].trim();

  // Extract PLZ + city
  const plzMatch = text.match(/(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s[a-zäöüß]+)?)/m);
  if (plzMatch?.[1] && plzMatch[2]) {
    result.plz = plzMatch[1];
    result.city = plzMatch[2].trim();
    // Derive Bundesland from city
    const cityLower = result.city.toLowerCase();
    for (const [key, land] of Object.entries(BUNDESLAND_MAP)) {
      if (cityLower.includes(key)) {
        result.bundesland = land;
        break;
      }
    }
  }

  // Extract USt-ID
  const ustMatch = text.match(/(?:USt-?Id(?:Nr)?|Umsatzsteuer)[.:\s]*([A-Z]{2}\s*\d{9,11})/i);
  if (ustMatch?.[1]) result.ust_id = ustMatch[1].replace(/\s/g, "");

  return result;
}
