const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

const idx = code.indexOf('function Yr()');
console.log(code.slice(idx, idx + 800));
