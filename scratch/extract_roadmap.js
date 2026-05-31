const fs = require('fs');

const transcriptPath = 'C:\\Users\\bhask\\.gemini\\antigravity\\brain\\c768bf7e-d1ce-4b3c-9228-c10243b41d9b\\.system_generated\\logs\\transcript.jsonl';
const fileContent = fs.readFileSync(transcriptPath, 'utf8');
const lines = fileContent.split('\n');

for (const line of lines) {
  if (line.trim().length === 0) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 1912) {
      let code = data.tool_calls[0].args.CodeContent;
      code = code.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      fs.writeFileSync('scratch/master_roadmap.md', code, 'utf8');
      console.log('Successfully extracted and unescaped full master roadmap!');
      process.exit(0);
    }
  } catch (err) {
    // Ignore malformed lines
  }
}
console.error('Step 1912 not found!');
process.exit(1);
