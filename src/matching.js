/**
 * ZFBF.info Berater-Matching Algorithm
 * Production-ready Cloudflare Worker module for matching consultants with companies
 * Database: bafa_antraege (D1 database)
 *
 * Scoring System (0-100 points):
 * - Region matching (25 pts)
 * - Industry matching (25 pts)
 * - Specialization matching (25 pts)
 * - Rating score (15 pts)
 * - BAFA verification (10 pts)
 */

/**
 * Map of German Bundesländer to neighboring states for partial region matching
 */
const NEIGHBORING_BUNDESLAENDER = {
  'Baden-Württemberg': ['Bavaria', 'Hesse', 'Rhineland-Palatinate'],
  'Bayern': ['Baden-Württemberg', 'Hesse', 'Thuringia', 'Saxony', 'Czech Republic'],
  'Berlin': ['Brandenburg'],
  'Brandenburg': ['Berlin', 'Mecklenburg-Vorpommern', 'Saxony', 'Saxony-Anhalt'],
  'Bremen': ['Lower Saxony'],
  'Hamburg': ['Lower Saxony', 'Schleswig-Holstein'],
  'Hesse': ['Baden-Württemberg', 'Bavaria', 'Lower Saxony', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Thuringia'],
  'Mecklenburg-Vorpommern': ['Brandenburg', 'Schleswig-Holstein'],
  'Lower Saxony': ['Bremen', 'Hamburg', 'Hesse', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Schleswig-Holstein'],
  'North Rhine-Westphalia': ['Hesse', 'Lower Saxony', 'Rhineland-Palatinate'],
  'Rhineland-Palatinate': ['Baden-Württemberg', 'Bavaria', 'Hesse', 'North Rhine-Westphalia', 'Saarland'],
  'Saarland': ['Rhineland-Palatinate'],
  'Saxony': ['Bavaria', 'Brandenburg', 'Saxony-Anhalt', 'Thuringia'],
  'Saxony-Anhalt': ['Brandenburg', 'Hesse', 'Lower Saxony', 'North Rhine-Westphalia', 'Saxony', 'Thuringia'],
  'Schleswig-Holstein': ['Hamburg', 'Lower Saxony', 'Mecklenburg-Vorpommern'],
  'Thuringia': ['Bavaria', 'Brandenburg', 'Hesse', 'Saxony', 'Saxony-Anhalt'],
};

/**
 * Map of related industries for partial industry matching
 * Used to match similar industries when exact match not found
 */
const BRANCHEN_MAP = {
  'IT / Software': ['Digitalisierung', 'Technologie', 'Digital', 'Software', 'E-Commerce', 'Tech-Startups'],
  'Handwerk': ['Handwerksbetriebe', 'Bau', 'Fertigung', 'Produktion', 'Mittelstand'],
  'Einzelhandel': ['Retail', 'Verkauf', 'E-Commerce', 'Online-Shop', 'Vertrieb'],
  'Gastronomie': ['Hotels', 'Tourismus', 'Beherbergung', 'Freizeitwirtschaft'],
  'Manufaktur': ['Handwerk', 'Fertigung', 'Produktion', 'Kleine und mittlere Unternehmen'],
  'Logistik': ['Transport', 'Supply Chain', 'Lagerwirtschaft', 'Verkehrswirtschaft'],
  'Green Energy': ['Erneuerbare Energien', 'Klimaschutz', 'Nachhaltigkeit', 'Umweltschutz'],
  'Consulting': ['Beratung', 'Management', 'Interim Management', 'Business Development'],
  'Bildung': ['EdTech', 'E-Learning', 'Schulung', 'Training'],
  'Medtech / Pharma': ['Gesundheit', 'Medizin', 'Biotechnologie', 'Pharmazie'],
  'Finance': ['Fintech', 'Versicherung', 'Banking', 'Finanzen'],
  'Industrie 4.0': ['Smart Manufacturing', 'Automation', 'Digitale Fertigung', 'IoT'],
};

/**
 * Map of Vorhaben (user intents) to relevant Spezialisierung keywords
 * Helps match consultant expertise to company projects
 */
const VORHABEN_MAP = {
  'Digitalisierung': ['Digitalisierung', 'Digital', 'IT', 'Software', 'E-Commerce', 'Automation', 'Cloud'],
  'Expansion': ['Expansion', 'Wachstum', 'Markterschließung', 'Internationalisierung', 'Vertrieb'],
  'Gründung': ['Gründung', 'Startup', 'Businessplan', 'Finanzierung', 'MVP'],
  'Ressourceneffizienz': ['Ressourceneffizienz', 'Nachhaltigkeit', 'Green', 'Umweltschutz', 'KVP'],
  'Prozessoptimierung': ['Prozessoptimierung', 'Lean', 'Effizienz', 'KVP', 'Automation', 'Six Sigma'],
  'Personal- / Fachkräfteentwicklung': ['Personal', 'Fachkräfte', 'Training', 'Schulung', 'Entwicklung', 'HR'],
  'Finanzierung': ['Finanzierung', 'Fördermittel', 'Grants', 'Eigenkapital', 'Kredite'],
  'Geschäftsmodellinnovation': ['Business Model', 'Innovation', 'Transformation', 'Geschäftsmodell'],
  'Industrie 4.0': ['Industrie 4.0', 'Smart Manufacturing', 'IoT', 'Automation', 'Digitale Fertigung'],
  'Export': ['Export', 'Internationalisierung', 'Markteintritt', 'Handelsmarken'],
};

/**
 * Points system configuration
 */
const SCORING_CONFIG = {
  region: {
    exact: 25,
    neighboring: 15,
    bundesweit: 20,
    default: 0,
  },
  branche: {
    exact: 25,
    related: 15,
    default: 0,
  },
  spezialisierung: {
    max: 25,
  },
  bewertung: {
    max: 15,
  },
  verifizierung: {
    verified: 10,
    unverified: 0,
  },
};

/**
 * Validate and sanitize input parameters
 * @param {Object} params - Input parameters
 * @returns {Object} Validated parameters
 * @throws {Error} If validation fails
 */
function validateInput(params) {
  const { bundesland, branche, vorhaben, budget_range, keywords } = params;

  if (!bundesland || typeof bundesland !== 'string') {
    throw new Error('Bundesland is required and must be a string');
  }

  if (!branche || typeof branche !== 'string') {
    throw new Error('Branche is required and must be a string');
  }

  if (!vorhaben || typeof vorhaben !== 'string') {
    throw new Error('Vorhaben is required and must be a string');
  }

  if (budget_range && typeof budget_range !== 'string') {
    throw new Error('Budget_range must be a string if provided');
  }

  if (keywords && !Array.isArray(keywords)) {
    throw new Error('Keywords must be an array if provided');
  }

  if (keywords && keywords.some(k => typeof k !== 'string')) {
    throw new Error('All keywords must be strings');
  }

  // Normalize inputs
  return {
    bundesland: bundesland.trim(),
    branche: branche.trim(),
    vorhaben: vorhaben.trim(),
    budget_range: budget_range ? budget_range.trim() : null,
    keywords: keywords ? keywords.map(k => k.trim().toLowerCase()) : [],
  };
}

/**
 * Calculate region matching score
 * @param {string} consulantRegion - Consultant's region(s)
 * @param {string} companyBundesland - Company's Bundesland
 * @returns {Object} Score and breakdown
 */
function scoreRegion(consulantRegion, companyBundesland) {
  if (!consulantRegion) {
    return { score: 0, reason: 'no_region_data' };
  }

  const regions = consulantRegion.split(',').map(r => r.trim().toLowerCase());
  const searchBundesland = companyBundesland.toLowerCase();

  // Exact match
  if (regions.some(r => r === searchBundesland || r === 'bundesweit')) {
    return {
      score: regions.includes('bundesweit')
        ? SCORING_CONFIG.region.bundesweit
        : SCORING_CONFIG.region.exact,
      reason: 'exact_match',
    };
  }

  // Check if consultant operates nationwide
  if (regions.includes('bundesweit')) {
    return { score: SCORING_CONFIG.region.bundesweit, reason: 'bundesweit' };
  }

  // Check neighboring Bundesländer
  const neighbors = NEIGHBORING_BUNDESLAENDER[companyBundesland] || [];
  if (neighbors.some(n => regions.some(r => r === n.toLowerCase()))) {
    return { score: SCORING_CONFIG.region.neighboring, reason: 'neighboring' };
  }

  return { score: SCORING_CONFIG.region.default, reason: 'no_match' };
}

/**
 * Calculate industry matching score
 * @param {string} consulantBranches - Consultant's industry areas
 * @param {string} companyBranche - Company's industry
 * @returns {Object} Score and breakdown
 */
function scoreBranche(consulantBranches, companyBranche) {
  if (!consulantBranches) {
    return { score: 0, reason: 'no_industry_data' };
  }

  const branches = consulantBranches.split(',').map(b => b.trim().toLowerCase());
  const searchBranche = companyBranche.toLowerCase();

  // Exact match
  if (branches.some(b => b === searchBranche)) {
    return { score: SCORING_CONFIG.branche.exact, reason: 'exact_match' };
  }

  // Check for related industries
  const relatedBranches = BRANCHEN_MAP[companyBranche] || [];
  if (relatedBranches.some(rb =>
    branches.some(b => b === rb.toLowerCase() || b.includes(rb.toLowerCase()))
  )) {
    return { score: SCORING_CONFIG.branche.related, reason: 'related_industry' };
  }

  return { score: SCORING_CONFIG.branche.default, reason: 'no_match' };
}

/**
 * Calculate specialization matching score
 * @param {string} spezialisierung - Consultant's specialization areas
 * @param {string} vorhaben - Company's project/intent
 * @param {Array} keywords - Additional search keywords
 * @returns {Object} Score and breakdown
 */
function scoreSpezialisierung(spezialisierung, vorhaben, keywords = []) {
  if (!spezialisierung) {
    return { score: 0, reason: 'no_specialization_data' };
  }

  const specs = spezialisierung.split(',').map(s => s.trim().toLowerCase());
  const vorhabenLower = vorhaben.toLowerCase();
  const searchTerms = [vorhabenLower, ...keywords].map(k => k.toLowerCase());

  let matchScore = 0;
  const matchedSpecs = [];

  // Direct specialization matches
  searchTerms.forEach(term => {
    specs.forEach(spec => {
      if (spec.includes(term) || term.includes(spec)) {
        matchScore = Math.min(matchScore + 5, SCORING_CONFIG.spezialisierung.max);
        if (!matchedSpecs.includes(spec)) {
          matchedSpecs.push(spec);
        }
      }
    });
  });

  // Vorhaben keyword expansion
  const expandedTerms = VORHABEN_MAP[vorhaben] || [];
  expandedTerms.forEach(expandedTerm => {
    specs.forEach(spec => {
      if (spec.includes(expandedTerm.toLowerCase())) {
        matchScore = Math.min(matchScore + 3, SCORING_CONFIG.spezialisierung.max);
        if (!matchedSpecs.includes(spec)) {
          matchedSpecs.push(spec);
        }
      }
    });
  });

  return {
    score: matchScore,
    reason: matchScore > 0 ? 'matched' : 'no_match',
    matched_specs: matchedSpecs,
  };
}

/**
 * Calculate rating/review score
 * @param {number} avgBewertung - Average rating (1-5)
 * @param {number} anzahlBewertungen - Number of ratings
 * @returns {Object} Score and breakdown
 */
function scoreBewertung(avgBewertung, anzahlBewertungen) {
  if (!avgBewertung || anzahlBewertungen === 0) {
    return { score: 0, reason: 'no_ratings' };
  }

  // Only count if at least 2 reviews
  if (anzahlBewertungen < 2) {
    return { score: 0, reason: 'insufficient_ratings' };
  }

  const score = (avgBewertung / 5) * SCORING_CONFIG.bewertung.max;
  return {
    score: Math.round(score * 10) / 10,
    reason: 'calculated',
  };
}

/**
 * Calculate verification score
 * @param {boolean} verifiziert - Is BAFA verified
 * @returns {number} Score
 */
function scoreVerifizierung(verifiziert) {
  return verifiziert ? SCORING_CONFIG.verifizierung.verified : SCORING_CONFIG.verifizierung.unverified;
}

/**
 * Calculate total matching score for a single consultant
 * @param {Object} berater - Consultant data
 * @param {Object} filters - Search filter parameters
 * @returns {Object} Total score and breakdown
 */
function calculateScore(berater, filters) {
  const regionScore = scoreRegion(berater.regionen, filters.bundesland);
  const brancheScore = scoreBranche(berater.branchen, filters.branche);
  const spezScore = scoreSpezialisierung(berater.spezialisierung, filters.vorhaben, filters.keywords);
  const bewertungScore = scoreBewertung(berater.avg_bewertung, berater.anzahl_bewertungen);
  const verifScore = scoreVerifizierung(berater.verifiziert);

  const totalScore =
    regionScore.score +
    brancheScore.score +
    spezScore.score +
    bewertungScore.score +
    verifScore;

  return {
    total: Math.round(totalScore * 10) / 10,
    breakdown: {
      region: regionScore.score,
      branche: brancheScore.score,
      spezialisierung: spezScore.score,
      bewertung: bewertungScore.score,
      verifizierung: verifScore,
    },
    details: {
      region_reason: regionScore.reason,
      branche_reason: brancheScore.reason,
      spezialisierung_reason: spezScore.reason,
      bewertung_reason: bewertungScore.reason,
    },
  };
}

/**
 * Build parameterized SQL query for fetching consultant profiles with ratings
 * @param {Object} db - D1 database instance
 * @returns {Promise<Array>} Array of consultant profiles with ratings
 */
async function fetchBeraterProfiles(db) {
  try {
    const query = `
      SELECT
        bp.id,
        bp.user_id,
        u.name,
        u.email,
        bp.unternehmen,
        bp.spezialisierung,
        bp.regionen,
        bp.branchen,
        bp.bio,
        bp.bafa_id,
        bp.verifiziert,
        bp.profilbild_url,
        bp.created_at,
        COALESCE(ROUND(AVG(bb.bewertung), 2), 0) as avg_bewertung,
        COALESCE(COUNT(bb.id), 0) as anzahl_bewertungen
      FROM berater_profiles bp
      LEFT JOIN berater_bewertungen bb ON bp.id = bb.berater_id
      LEFT JOIN users u ON bp.user_id = u.id
      GROUP BY bp.id, bp.user_id, u.name, u.email, bp.unternehmen,
               bp.spezialisierung, bp.regionen, bp.branchen, bp.bio,
               bp.bafa_id, bp.verifiziert, bp.profilbild_url, bp.created_at
      ORDER BY anzahl_bewertungen DESC, avg_bewertung DESC
    `;

    const result = await db.prepare(query).all();
    return result.results || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Failed to fetch consultant profiles: ${error.message}`);
  }
}

/**
 * Main matching algorithm handler
 * @param {Object} request - Cloudflare Worker request
 * @param {Object} env - Environment variables with database binding
 * @returns {Promise<Response>} JSON response with matches
 */
async function handleMatch(request, env) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const filters = validateInput(body);

    // Get database instance
    const db = env.DB; // D1 database binding named 'DB'
    if (!db) {
      throw new Error('Database binding not configured');
    }

    // Fetch all consultant profiles with their ratings
    const berater = await fetchBeraterProfiles(db);

    if (!berater || berater.length === 0) {
      return new Response(JSON.stringify({
        matches: [],
        total: 0,
        filters_applied: filters,
        message: 'No consultants found in database',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Score each consultant
    const scoredBerater = berater.map(b => {
      const scoreResult = calculateScore(b, filters);
      return {
        berater_id: b.id,
        user_id: b.user_id,
        name: b.name || 'Unknown',
        email: b.email || null,
        unternehmen: b.unternehmen || null,
        score: scoreResult.total,
        score_breakdown: scoreResult.breakdown,
        score_details: scoreResult.details,
        spezialisierung: b.spezialisierung ? b.spezialisierung.split(',').map(s => s.trim()) : [],
        regionen: b.regionen ? b.regionen.split(',').map(r => r.trim()) : [],
        branchen: b.branchen ? b.branchen.split(',').map(br => br.trim()) : [],
        bio: b.bio || null,
        avg_bewertung: parseFloat(b.avg_bewertung) || 0,
        anzahl_bewertungen: parseInt(b.anzahl_bewertungen, 10) || 0,
        bafa_verifiziert: Boolean(b.verifiziert),
        bafa_id: b.bafa_id || null,
        profilbild_url: b.profilbild_url || null,
        created_at: b.created_at || null,
      };
    });

    // Sort by score (descending) and return top matches
    const sortedMatches = scoredBerater
      .sort((a, b) => b.score - a.score)
      .filter(match => match.score > 0); // Only return matches with score > 0

    return new Response(JSON.stringify({
      matches: sortedMatches,
      total: sortedMatches.length,
      filters_applied: filters,
      timestamp: new Date().toISOString(),
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Matching algorithm error:', error);

    // Return appropriate error response
    const statusCode = error.message.includes('required') ? 400 : 500;
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Route handler for matching endpoint
 * @param {Request} request - Cloudflare Worker request
 * @param {Object} env - Environment variables
 * @param {string} path - Request path
 * @returns {Promise<Response>}
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/berater/match
  if (path === '/api/berater/match' && request.method === 'POST') {
    return handleMatch(request, env);
  }

  // Health check endpoint
  if (path === '/health' && request.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Default 404
  return new Response(JSON.stringify({
    error: 'Not found',
    path,
    method: request.method,
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Main worker handler - Cloudflare Workers entry point
 */
export default {
  async fetch(request, env, context) {
    return handleRequest(request, env);
  },
};

/**
 * Export internal functions for testing and reuse
 */
export {
  validateInput,
  scoreRegion,
  scoreBranche,
  scoreSpezialisierung,
  scoreBewertung,
  scoreVerifizierung,
  calculateScore,
  fetchBeraterProfiles,
  handleMatch,
  NEIGHBORING_BUNDESLAENDER,
  BRANCHEN_MAP,
  VORHABEN_MAP,
  SCORING_CONFIG,
};
