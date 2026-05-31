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
    if (content.includes("SaaS Production Roadmap")) {
      console.log(`Step ${data.step_index} | Type: ${data.type}`);
      let code = "";
      if (data.tool_calls && data.tool_calls[0] && data.tool_calls[0].args && data.tool_calls[0].args.CodeContent) {
        code = data.tool_calls[0].args.CodeContent;
      } else if (data.content) {
        code = data.content;
      }
      console.log(`Length: ${code.length} | Preview: ${code.substring(0, 150).replace(/\n/g, ' ')}\n`);
    }
  } catch (err) {}
}
