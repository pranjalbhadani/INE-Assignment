const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

// Find where vr is invoked or rotated
const idx = code.indexOf('function vr()');
console.log(code.slice(idx - 600, idx + 400));
