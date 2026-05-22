/**
 * load_forests.js
 *
 * Seeds Dairas, Communes, Forests, and Fires from clean_dataset.csv into MongoDB.
 *
 * Usage:
 *   npm install mongoose csv-parse          (one-time)
 *   MONGO_URI=mongodb://localhost:27017/project_fire node load_forests.js
 *
 * Or hardcode MONGO_URI below if preferred.
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

// ── Models ────────────────────────────────────────────────────────────────────
const Daira = require("./models/Daira");
const Commune = require("./models/Commune");
const Forest = require("./models/Forest");
const Fire = require("./models/Fire");

// ── Config ────────────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/project_fire";

const CSV_PATH = path.join(__dirname, "clean_dataset.csv");

// ── Helpers ───────────────────────────────────────────────────────────────────
function validCoord(lat, lon) {
  return typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon);
}

/** Parse "2010-07-02 00:00:00" → Date (date part only, UTC midnight) */
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse a numeric string → Number, returns null if empty/NaN */
function parseNum(str) {
  if (str === "" || str == null) return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

/** Normalise CAUSE to the enum values the schema accepts */
function parseCause(str) {
  if (!str) return "Unknown";
  const up = str.trim().toUpperCase();
  if (up === "INC") return "INC";
  if (up === "CON") return "CON";
  return "Unknown";
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB:", MONGO_URI);

  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`📄  Parsed ${rows.length} rows from CSV`);

  // ── Collect unique values ──────────────────────────────────────────────────
  const dairaNames = [...new Set(rows.map((r) => r.DAIRA).filter(Boolean))];

  // commune → daira (first occurrence wins)
  const communeMap = {};
  for (const row of rows) {
    if (row.COMMUNE && row.DAIRA && !communeMap[row.COMMUNE]) {
      communeMap[row.COMMUNE] = row.DAIRA;
    }
  }

  // forest → first row (for coordinates)
  const forestMap = {};
  for (const row of rows) {
    if (row.FORET && !forestMap[row.FORET]) forestMap[row.FORET] = row;
  }
  const forestRows = Object.values(forestMap);

  // ── Upsert Dairas ──────────────────────────────────────────────────────────
  console.log(`\n🌍  Upserting ${dairaNames.length} dairas…`);
  const dairaIdMap = {};

  for (const name of dairaNames) {
    const doc = await Daira.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    dairaIdMap[name] = doc._id;
    console.log(`   Daira: ${name}`);
  }

  // ── Upsert Communes ────────────────────────────────────────────────────────
  const communeNames = Object.keys(communeMap);
  console.log(`\n🏘️   Upserting ${communeNames.length} communes…`);
  const communeIdMap = {};

  for (const name of communeNames) {
    const dairaName = communeMap[name];
    const dairaId = dairaIdMap[dairaName];

    if (!dairaId) {
      console.warn(`   ⚠️  Daira not found for commune "${name}" – skipping`);
      continue;
    }

    const doc = await Commune.findOneAndUpdate(
      { name },
      { name, daira: dairaId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    communeIdMap[name] = doc._id;
    console.log(`   Commune: ${name}  →  ${dairaName}`);
  }

  // ── Upsert Forests ─────────────────────────────────────────────────────────
  console.log(`\n🌲  Upserting ${forestRows.length} forests…`);
  const forestIdMap = {};
  let fInserted = 0, fSkipped = 0;

  for (const row of forestRows) {
    const name = row.FORET;
    const communeId = communeIdMap[row.COMMUNE] || null;
    const dairaId = dairaIdMap[row.DAIRA] || null;
    const lat = parseFloat(row.LATITUDE);
    const lon = parseFloat(row.LONGITUDE);

    try {
      const doc = await Forest.findOneAndUpdate(
        { name },
        {
          name,
          commune: communeId,
          daira: dairaId,
          latitude: validCoord(lat, lon) ? lat : null,
          longitude: validCoord(lat, lon) ? lon : null,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      forestIdMap[name] = doc._id;
      fInserted++;
      console.log(
        `   Forest: ${name.padEnd(30)} commune: ${(row.COMMUNE || "-").padEnd(25)} daira: ${(row.DAIRA || "-").padEnd(20)}  [lat: ${lat}, lon: ${lon}]`
      );
    } catch (err) {
      console.error(`   ❌  Failed to upsert forest "${name}": ${err.message}`);
      fSkipped++;
    }
  }

  // ── Insert Fires ───────────────────────────────────────────────────────────
  console.log(`\n🔥  Inserting ${rows.length} fires…`);
  let fireInserted = 0, fireSkipped = 0;

  for (const row of rows) {
    const forestId = forestIdMap[row.FORET];
    if (!forestId) {
      console.warn(`   ⚠️  Forest "${row.FORET}" not found – skipping fire on ${row.DATE_DECL}`);
      fireSkipped++;
      continue;
    }

    const communeId = communeIdMap[row.COMMUNE] || null;
    const dairaId = dairaIdMap[row.DAIRA] || null;

    const fire = {
      forest: forestId,
      commune: communeId,
      daira: dairaId,

      // Dates – strip the bogus time component; hours come from DECL/INT/EXT_HOUR
      declaration_date: parseDate(row.DATE_DECL),
      declaration_hour: parseNum(row.DECL_HOUR),
      intervention_date: parseDate(row.DATE_INT),
      intervention_hour: parseNum(row.INT_HOUR),
      extinction_date: parseDate(row.DATE_EXT),
      extinction_hour: parseNum(row.EXT_HOUR),

      // Vegetation
      essence: row.ESSENCE ? row.ESSENCE.split('+').map(s => s.trim()).filter(Boolean) : [],
      tot_foret: parseNum(row.TOT_FORET) ?? 0,
      tot_maquis: parseNum(row.TOT_MAQUIS) ?? 0,
      tot_broussailles: parseNum(row.TOT_BROUSSAILLES) ?? 0,
      surf_total: parseNum(row.SURF_TOTAL) ?? 0,

      // Metadata
      cause: parseCause(row.CAUSE),
      signale: row.SIGNALE || null,
      organismes: row.ORGANISMES ? row.ORGANISMES.split('+').map(s => s.trim()).filter(Boolean) : [],
      degats: parseNum(row.DEGATS) ?? 0,

      // Weather
      meteo_temp: parseNum(row.METEO_TEMP),
      meteo_wind_speed: parseNum(row.METEO_VENTE_VITESSE),
      meteo_wind_direction: row.METEO_VENTE_DIRECTION || null,
    };

    try {
      await Fire.create(fire);
      fireInserted++;
      console.log(
        `   Fire: ${(row.FORET || "-").padEnd(30)} ${row.DATE_DECL}  cause: ${fire.cause}  surf: ${fire.surf_total} ha`
      );
    } catch (err) {
      console.error(`   ❌  Failed to insert fire (forest: "${row.FORET}", date: "${row.DATE_DECL}"): ${err.message}`);
      fireSkipped++;
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────");
  console.log(`✅  Dairas   : ${dairaNames.length}`);
  console.log(`✅  Communes : ${communeNames.length}`);
  console.log(`✅  Forests  : ${fInserted} inserted/updated (${fSkipped} failed)`);
  console.log(`✅  Fires    : ${fireInserted} inserted (${fireSkipped} skipped)`);
  console.log("────────────────────────────────────────");

  await mongoose.disconnect();
  console.log("🔌  Disconnected.");
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});