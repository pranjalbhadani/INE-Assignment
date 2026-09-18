const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

// Find the string table definitions
// Look from vr() backwards to P()
const startIdx = code.indexOf('function vr()');
const endIdx = code.indexOf('async function Dr');

console.log(`Extracting from ${startIdx - 3000} to ${endIdx}`);
const chunk = code.slice(startIdx - 3000, endIdx);

fs.writeFileSync('scratch/strings_chunk.js', chunk);
console.log('Saved scratch/strings_chunk.js');
