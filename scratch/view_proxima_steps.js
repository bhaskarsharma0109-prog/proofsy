const fs = require('fs');
const transcriptPath = 'C:\\Users\\bhask\\.gemini\\antigravity\\brain\\c768bf7e-d1ce-4b3c-9228-c10243b41d9b\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.log("No transcript file found.");
  process.exit(1);
}

const fileContent = fs.readFileSync(transcriptPath, 'utf8');
const lines = fileContent.split('\n');

for (const line of lines) {
  if (line.trim().length === 0) continue;
  try {
    const data = JSON.parse(line);
    const content = JSON.stringify(data);
    if (content.toLowerCase().includes("proxima") && [7, 17, 2356].includes(data.step_index)) {
      console.log(`--- Step ${data.step_index} | Type: ${data.type} ---`);
      let code = "";
      if (data.tool_calls && data.tool_calls[0] && data.tool_calls[0].args) {
        code = JSON.stringify(data.tool_calls[0].args);
      } else if (data.content) {
        code = data.content;
      }
      console.log(code.substring(0, 1000));
      console.log("\n");
    }
  } catch (err) {}
}
