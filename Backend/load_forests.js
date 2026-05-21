/**
 * load_forests.js
 *
 * Seeds Dairas, Communes, and Forests from clean_dataset.csv into MongoDB.
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

// ── Config ────────────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/project_fire";

const CSV_PATH = path.join(__dirname, "clean_dataset.csv");

// Algeria WGS84 bounding box – coordinates outside this range are discarded
const LAT_MIN = 18, LAT_MAX = 40;
const LON_MIN = -9, LON_MAX = 12;

function validCoord(lat, lon) {
  return (
    typeof lat === "number" && typeof lon === "number" &&
    !isNaN(lat) && !isNaN(lon) &&
    lat >= LAT_MIN && lat <= LAT_MAX &&
    lon >= LON_MIN && lon <= LON_MAX
  );
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

  // Map commune → daira (take first occurrence)
  const communeMap = {}; // communeName → dairaName
  for (const row of rows) {
    if (row.COMMUNE && row.DAIRA && !communeMap[row.COMMUNE]) {
      communeMap[row.COMMUNE] = row.DAIRA;
    }
  }

  // For each forest keep the best row: prefer the one with valid coordinates
  const forestMap = {}; // forestName → best row
  for (const row of rows) {
    if (!row.FORET) continue;
    const name = row.FORET;
    const lat = parseFloat(row.LATITUDE);
    const lon = parseFloat(row.LONGITUDE);
    if (!forestMap[name]) {
      forestMap[name] = row;
    } else if (validCoord(lat, lon) && !validCoord(
      parseFloat(forestMap[name].LATITUDE),
      parseFloat(forestMap[name].LONGITUDE)
    )) {
      forestMap[name] = row; // upgrade to a row that has valid coords
    }
  }
  const forestRows = Object.values(forestMap);

  // ── Upsert Dairas ──────────────────────────────────────────────────────────
  console.log(`\n🌍  Upserting ${dairaNames.length} dairas…`);
  const dairaIdMap = {}; // dairaName → ObjectId

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
  const communeIdMap = {}; // communeName → ObjectId

  for (const name of communeNames) {
    const dairaName = communeMap[name];
    const dairaId = dairaIdMap[dairaName];

    if (!dairaId) {
      console.warn(`   ⚠️  Daira not found for commune "${name}" (daira: "${dairaName}") – skipping`);
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
  let inserted = 0, skipped = 0, withCoords = 0;

  for (const row of forestRows) {
    const name = row.FORET;
    const communeId = communeIdMap[row.COMMUNE] || null;
    const dairaId = dairaIdMap[row.DAIRA] || null;

    const lat = parseFloat(row.LATITUDE);
    const lon = parseFloat(row.LONGITUDE);
    const hasCoords = validCoord(lat, lon);

    const update = {
      name,
      commune: communeId,
      daira: dairaId,
      latitude: hasCoords ? lat : null,
      longitude: hasCoords ? lon : null,
    };

    try {
      await Forest.findOneAndUpdate(
        { name },
        update,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (hasCoords) withCoords++;
      inserted++;
      console.log(
        `   Forest: ${name.padEnd(30)} commune: ${(row.COMMUNE || "-").padEnd(25)} daira: ${row.DAIRA || "-"}` +
        (hasCoords ? `  [lat: ${lat}, lon: ${lon}]` : "")
      );
    } catch (err) {
      console.error(`   ❌  Failed to upsert forest "${name}": ${err.message}`);
      skipped++;
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────");
  console.log(`✅  Dairas   : ${dairaNames.length}`);
  console.log(`✅  Communes : ${communeNames.length}`);
  console.log(`✅  Forests  : ${inserted} inserted/updated (${withCoords} with valid coordinates, ${skipped} failed)`);
  console.log("────────────────────────────────────────");

  await mongoose.disconnect();
  console.log("🔌  Disconnected.");
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});