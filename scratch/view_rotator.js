const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

console.log(code.slice(265800, 266150));
