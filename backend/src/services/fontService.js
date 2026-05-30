const fs = require("fs");
const path = require("path");

const FONTS_DIR = path.join(__dirname, "../../storage/fonts");

if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Map frontend font names to Google Fonts URL (ttf format)
const FONT_URLS = {
  "Inter": {
    normal: "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf",
    bold: "https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf"
  },
  "Roboto": {
    normal: "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf",
    bold: "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf"
  },
  "Poppins": {
    normal: "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf",
    bold: "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf"
  },
  "Playfair Display": {
    normal: "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf", // Variable font
    bold: "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf"
  },
  "Courier New": {
    // Courier Prime as fallback for Courier New
    normal: "https://github.com/google/fonts/raw/main/ofl/courierprime/CourierPrime-Regular.ttf",
    bold: "https://github.com/google/fonts/raw/main/ofl/courierprime/CourierPrime-Bold.ttf"
  },
  "Georgia": {
    // PT Serif as fallback for Georgia
    normal: "https://github.com/google/fonts/raw/main/ofl/ptserif/PTSerif-Regular.ttf",
    bold: "https://github.com/google/fonts/raw/main/ofl/ptserif/PTSerif-Bold.ttf"
  },
  "Arial": {
    // Arimo as fallback for Arial
    normal: "https://github.com/google/fonts/raw/main/apache/arimo/Arimo-Regular.ttf",
    bold: "https://github.com/google/fonts/raw/main/apache/arimo/Arimo-Bold.ttf"
  },
  "Fira Code": {
    normal: "https://github.com/google/fonts/raw/main/ofl/firacode/FiraCode%5Bwght%5D.ttf",
    bold: "https://github.com/google/fonts/raw/main/ofl/firacode/FiraCode%5Bwght%5D.ttf"
  },
  "Fira Sans": {
    normal: "https://github.com/google/fonts/raw/main/ofl/firasans/FiraSans-Regular.ttf",
    bold: "https://github.com/google/fonts/raw/main/ofl/firasans/FiraSans-Bold.ttf"
  }
};

/**
 * Ensures a font is downloaded locally, then returns the raw buffer.
 */
exports.getFontBuffer = async (fontFamily, fontWeight = "normal") => {
  const familySafe = fontFamily.replace(/[^a-zA-Z0-9]/g, "");
  const fontFile = `${familySafe}-${fontWeight}.ttf`;
  const fontPath = path.join(FONTS_DIR, fontFile);

  if (fs.existsSync(fontPath)) {
    return fs.readFileSync(fontPath);
  }

  // Not cached, download it
  const urls = FONT_URLS[fontFamily] || FONT_URLS["Inter"];
  const url = urls[fontWeight] || urls.normal;

  console.log(`[Fonts] Downloading font ${fontFamily} (${fontWeight}) from ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(fontPath, buffer);
    return buffer;
  } catch (err) {
    console.error(`[Fonts] Failed to download font:`, err);
    // Fallback to Inter
    if (fontFamily !== "Inter") {
      return exports.getFontBuffer("Inter", fontWeight);
    }
    throw err;
  }
};
