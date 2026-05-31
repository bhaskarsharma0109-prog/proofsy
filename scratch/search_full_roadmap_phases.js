const fs = require('fs');
const transcriptPath = 'C:\\Users\\bhask\\.gemini\\antigravity\\brain\\c768bf7e-d1ce-4b3c-9228-c10243b41d9b\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(transcriptPath)) {
  console.error("Transcript file not found");
  process.exit(1);
}

const fileContent = fs.readFileSync(transcriptPath, 'utf8');
const lines = fileContent.split('\n');

for (const line of lines) {
  if (line.trim().length === 0) continue;
  try {
    const data = JSON.parse(line);
    const content = JSON.stringify(data);
    if (content.includes("Phase 8") && content.includes("Phase 3") && content.includes("Phase 10")) {
      console.log(`Step ${data.step_index} | Type: ${data.type}`);
      let code = "";
      if (data.tool_calls && data.tool_calls[0] && data.tool_calls[0].args && data.tool_calls[0].args.CodeContent) {
        code = data.tool_calls[0].args.CodeContent;
      } else if (data.content) {
        code = data.content;
      }
      console.log(`Length: ${code.length}`);
      if (!code.includes("<truncated")) {
        console.log("Found untruncated step!");
        console.log(code.substring(0, 1000));
        fs.writeFileSync('scratch/master_roadmap_untruncated.md', code, 'utf8');
        process.exit(0);
      }
    }
  } catch (err) {}
}
console.log("No untruncated 10-phase roadmap step found!");
process.exit(1);
