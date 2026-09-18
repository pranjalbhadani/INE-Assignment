const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

// Find where P is assigned to pr
const idx = code.indexOf('var P=');
console.log('P assignment:', code.slice(idx - 100, idx + 100));
