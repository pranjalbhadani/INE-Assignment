const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

const matches = [];
let pos = 0;
while (true) {
  let idx = code.indexOf('cookie', pos);
  if (idx === -1) break;
  matches.push(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 200)));
  pos = idx + 6;
}

console.log(`Found ${matches.length} cookie matches:`);
matches.forEach((m, i) => console.log(`--- [${i+1}] ---\n${m}\n`));
