const mongoose = require("mongoose");
const Certificate = require("./src/models/Certificate");
const fs = require("fs");
const path = require("path");

async function reset() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://mongo:27017/proofsy";
  await mongoose.connect(mongoUri);
  const res = await Certificate.updateMany({}, { pngUrl: null, svgUrl: null });
  console.log("Database reset count:", res.modifiedCount);
  
  const pngDir = path.join(__dirname, "storage/pngs");
  if (fs.existsSync(pngDir)) {
    const pngs = fs.readdirSync(pngDir);
    for (const file of pngs) {
      if (file !== ".keep") {
        try { fs.unlinkSync(path.join(pngDir, file)); } catch (e) {}
      }
    }
  }

  const svgDir = path.join(__dirname, "storage/svgs");
  if (fs.existsSync(svgDir)) {
    const svgs = fs.readdirSync(svgDir);
    for (const file of svgs) {
      if (file !== ".keep") {
        try { fs.unlinkSync(path.join(svgDir, file)); } catch (e) {}
      }
    }
  }
  console.log("Files cleaned successfully.");
  process.exit(0);
}
reset().catch((e) => {
  console.error(e);
  process.exit(1);
});
