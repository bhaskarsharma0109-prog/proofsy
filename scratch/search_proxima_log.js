const fs = require('fs');
const transcriptPath = 'C:\\Users\\bhask\\.gemini\\antigravity\\brain\\c768bf7e-d1ce-4b3c-9228-c10243b41d9b\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.log("No transcript file found.");
  process.exit(1);
}

const fileContent = fs.readFileSync(transcriptPath, 'utf8');
const lines = fileContent.split('\n');
let found = false;

for (const line of lines) {
  if (line.trim().length === 0) continue;
  try {
    const data = JSON.parse(line);
    const content = JSON.stringify(data);
    if (content.toLowerCase().includes("proxima")) {
      console.log(`Step ${data.step_index} contains "proxima". Type: ${data.type}`);
      found = true;
    }
  } catch (err) {}
}

if (!found) {
  console.log("No references to 'proxima' found in the transcript logs.");
}
