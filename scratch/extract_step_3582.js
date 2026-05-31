const fs = require('fs');

const transcriptPath = 'C:\\Users\\bhask\\.gemini\\antigravity\\brain\\c768bf7e-d1ce-4b3c-9228-c10243b41d9b\\.system_generated\\logs\\transcript.jsonl';
const fileContent = fs.readFileSync(transcriptPath, 'utf8');
const lines = fileContent.split('\n');

for (const line of lines) {
  if (line.trim().length === 0) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 3582) {
      const content = data.content;
      fs.writeFileSync('scratch/step_3582.md', content, 'utf8');
      console.log('Successfully extracted step 3582 content!');
      process.exit(0);
    }
  } catch (err) {
    // Ignore
  }
}
console.error('Step 3582 not found!');
process.exit(1);
