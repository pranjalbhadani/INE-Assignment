const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

let pos = 0;
while (true) {
  let idx = code.indexOf('vr', pos);
  if (idx === -1) break;
  // check if vr(
  if (code.slice(idx, idx + 4).startsWith('vr(') || code.slice(idx, idx + 4).startsWith('vr,')) {
    console.log(`Found vr at ${idx}:`, code.slice(idx - 100, idx + 100));
  }
  pos = idx + 2;
}
