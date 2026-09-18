const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

// Find all occurrences of "pr" near Dr
const idx = code.indexOf('async function Dr');
const chunk = code.slice(idx - 3000, idx + 500);

console.log(chunk.match(/[a-zA-Z0-9_$]+\s*=\s*pr/g));
console.log(chunk.match(/function\s+pr\b/g));
// Let's find what identifier equals pr
let pos = chunk.indexOf('function pr(');
console.log("Snippet around function pr:", chunk.slice(pos - 100, pos + 300));
