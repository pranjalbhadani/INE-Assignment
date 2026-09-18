const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

const end = code.indexOf('(vr,308767);') + '(vr,308767);'.length;
const start = code.lastIndexOf('function', end - 1000);

console.log('Block from', start, 'to', end);
console.log(code.slice(start, end));
