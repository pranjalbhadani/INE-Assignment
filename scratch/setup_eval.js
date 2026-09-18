const fs = require('fs');

let chunk = fs.readFileSync('scratch/strings_chunk.js', 'utf8');

// Extract function pr and function vr
let prIdx = chunk.indexOf('function pr(');
let vrIdx = chunk.indexOf('function vr(');
let vrEnd = chunk.indexOf('var yr=');

let prCode = chunk.slice(prIdx, vrIdx);
let vrCode = chunk.slice(vrIdx, vrEnd);

const script = `
${vrCode}
${prCode}
const P = pr;
const dict = {};
for (let i = 486; i <= 610; i++) {
  try {
    dict[i] = pr(i);
  } catch (e) {
    dict[i] = e.message;
  }
}
fs.writeFileSync('scratch/strings.json', JSON.stringify(dict, null, 2));
console.log('Successfully written scratch/strings.json');
`;

fs.writeFileSync('scratch/eval_pr.js', "const fs = require('fs');\n" + script);
console.log('Written eval_pr.js');
