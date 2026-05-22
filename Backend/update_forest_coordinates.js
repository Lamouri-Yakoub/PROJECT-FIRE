const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const Commune = require("./models/Commune");
const Forest = require("./models/Forest");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/project_fire";
const CSV_PATH = path.join(__dirname, "..", "communes_coordinates - communes_coordinates.csv.csv");

async function run() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully.");

  console.log("Reading communes coordinates from:", CSV_PATH);
  if (!fs.existsSync(CSV_PATH)) {
    console.error("Error: CSV file not found at path:", CSV_PATH);
    await mongoose.disconnect();
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`Parsed ${rows.length} commune coordinate rows.`);

  // Create coordinates map: COMMUNE_NAME -> { lat, lon }
  const coordsMap = {};
  for (const row of rows) {
    if (row.Commune && row.Latitude && row.Longitude) {
      coordsMap[row.Commune.trim().toUpperCase()] = {
        lat: parseFloat(row.Latitude),
        lon: parseFloat(row.Longitude)
      };
    }
  }

  // Load all Communes from database
  const communes = await Commune.find({});
  console.log(`Loaded ${communes.length} communes from database.`);

  const allForests = await Forest.find({});
  console.log(`Loaded ${allForests.length} forests from database.`);
  if (allForests.length > 0) {
    console.log("Sample Forest:", {
      name: allForests[0].name,
      commune: allForests[0].commune,
      latitude: allForests[0].latitude,
      longitude: allForests[0].longitude
    });
  }

  let updatedCount = 0;
  let matchedCount = 0;

  for (const comm of communes) {
    const nameKey = comm.name.trim().toUpperCase();
    const coords = coordsMap[nameKey];

    if (coords) {
      // Find and update all forests in this commune
      const res = await Forest.updateMany(
        { commune: comm._id },
        { latitude: coords.lat, longitude: coords.lon }
      );
      matchedCount += res.matchedCount;
      if (res.modifiedCount > 0) {
        console.log(`Updated ${res.modifiedCount} forests in Commune: ${comm.name} with coords [${coords.lat}, ${coords.lon}]`);
        updatedCount += res.modifiedCount;
      }
    } else {
      console.warn(`No coordinates found in CSV for commune: ${comm.name}`);
    }
  }

  console.log(`Migration completed. Total forests matched: ${matchedCount}, updated: ${updatedCount}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
