/**
 * scripts/seed-berater.ts
 *
 * Helper for provisioning real berater accounts in the prod directory.
 *
 * ──────────────────────────────────────────────────────────────────────
 *  Current state (inspected 2026-04-15):
 * ──────────────────────────────────────────────────────────────────────
 *
 *    zfbf-db.users WHERE role='berater'         →  3 real auth users
 *    bafa_antraege.berater_profiles (verfügbar) → 17 rows, 16 visible
 *
 *  Of those 16 visible public-directory entries:
 *    - 15 are DEMO seeds with user_id = "demo-berater-0NN"
 *      (realistic German names + fake ratings; no logins possible)
 *    - 1  has a real UUID user_id ("62569530-…")
 *
 *  Public 16-entry directory is already populated, so the audit's
 *  "≥ 3 aktive Berater" criterion is *visually* satisfied — but most of
 *  those are placeholders.
 *
 *  If you want the directory backed by REAL berater:
 *    1. Recruit ≥ 3 actual berater partners (contract + BAFA-Nr.)
 *    2. Fill out the BERATER array below with their real data
 *    3. Dry-run: `npx tsx scripts/seed-berater.ts --dry-run`
 *    4. Apply:   `npx tsx scripts/seed-berater.ts --apply`
 *    5. (optional) prune demo rows:
 *       npx wrangler d1 execute bafa_antraege --remote \
 *         --command "UPDATE berater_profiles SET verfuegbar=0 \
 *                    WHERE user_id LIKE 'demo-berater-%'"
 *
 *  SAFETY: this script refuses to run unless BERATER[] has at least
 *  3 entries AND every entry has `real: true` set by the operator.
 * ──────────────────────────────────────────────────────────────────────
 */

interface BeraterSeed {
  /** MUST be set to `true` once you've confirmed these are real people
   *  with signed contracts. Until then the script refuses to run. */
  real: boolean;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  display_name: string; // public directory name (e.g. "Dr. Maria Schmidt")
  bio: string;
  branchen: string[]; // e.g. ["handwerk", "it", "dienstleistung"]
  spezialisierungen: string[]; // e.g. ["Digital", "Nachhaltigkeit"]
  region?: string; // e.g. "Bayern"
  plz?: string; // 5-digit postal code
  telefon?: string;
  website?: string;
  bafa_berater_nr: string; // required — triggers admin cert-queue review
}

// ⚠️ REPLACE THIS WITH REAL DATA BEFORE RUNNING
// ⚠️ Do not commit real emails / phones; run this locally once and forget.
const BERATER: BeraterSeed[] = [
  // {
  //   real: false,  // set to true once contract is signed
  //   email: "vorname.nachname@partnerkanzlei.de",
  //   first_name: "Vorname",
  //   last_name: "Nachname",
  //   phone: "+49 …",
  //   display_name: "Dipl.-Ing. Vorname Nachname",
  //   bio: "15 Jahre Erfahrung in Digitalisierungsprojekten für KMU …",
  //   branchen: ["handwerk", "dienstleistung"],
  //   spezialisierungen: ["Digital", "Mittelstand"],
  //   region: "Bayern",
  //   plz: "80331",
  //   telefon: "+49 …",
  //   website: "https://partnerkanzlei.de",
  //   bafa_berater_nr: "DE-123-456",
  // },
];

function refuseToRun(reason: string): never {
  console.error(`\n✗ Refusing to run: ${reason}\n`);
  console.error(`  Edit the BERATER[] array in ${__filename} and re-run.\n`);
  process.exit(1);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const apply = args.has("--apply");

  if (!dryRun && !apply) {
    console.log("Usage: npx tsx scripts/seed-berater.ts --dry-run | --apply\n");
    process.exit(0);
  }

  if (BERATER.length < 3) {
    refuseToRun(`BERATER[] has ${BERATER.length} entries (min. 3 required).`);
  }

  const unconfirmed = BERATER.filter((b) => !b.real);
  if (unconfirmed.length > 0) {
    refuseToRun(
      `${unconfirmed.length} berater entries still have real=false. ` +
        `Set real=true only for signed-contract berater.`,
    );
  }

  const missingBafaNr = BERATER.filter((b) => !b.bafa_berater_nr);
  if (missingBafaNr.length > 0) {
    refuseToRun(`${missingBafaNr.length} entries missing bafa_berater_nr.`);
  }

  console.log(`\nPrepared to seed ${BERATER.length} real berater:\n`);
  for (const b of BERATER) {
    console.log(
      `  • ${b.display_name.padEnd(30)}  ${b.email.padEnd(35)}  BAFA-Nr: ${b.bafa_berater_nr}`,
    );
  }

  if (dryRun) {
    console.log("\n(dry-run) No changes made. Re-run with --apply to write.\n");
    return;
  }

  console.log("\n--apply mode — next steps (manual, documented here only):");
  console.log(
    `
For each entry:

 1. Create auth user in zfbf-db:
    npx wrangler d1 execute zfbf-db --remote --command "
      INSERT INTO users (id, email, password_hash, salt, hash_version,
                         role, first_name, last_name, email_verified,
                         bafa_berater_nr, bafa_cert_status)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, 2, 'berater',
              ?, ?, 1, ?, 'pending')
    "
    (hash/salt: use PBKDF2 100k with your RESET_TOKEN flow instead of
     hardcoding a password here — send a reset link to the berater so
     they set their own.)

 2. Create berater_profile in bafa_antraege:
    npx wrangler d1 execute bafa_antraege --remote --command "
      INSERT INTO berater_profiles (user_id, display_name, bio, branchen,
                                    spezialisierungen, region, plz,
                                    telefon, website, verfuegbar,
                                    rating_avg, rating_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0.0, 0)
    "

 3. Notify admin to approve the bafa_cert via /admin (GAP-001 flow).

This script deliberately does NOT execute wrangler commands itself —
seeding real user data is a deliberate, manual, audit-logged step.`,
  );
}

main();
