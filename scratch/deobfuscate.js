const fs = require('fs');

let chunk = fs.readFileSync('scratch/strings_chunk.js', 'utf8');
let prIdx = chunk.indexOf('function pr(');
let vrIdx = chunk.indexOf('function vr(');
let vrEnd = chunk.indexOf('var yr=');

let prCode = chunk.slice(prIdx, vrIdx);
let vrCode = chunk.slice(vrIdx, vrEnd);

eval(vrCode);
eval(prCode);

let target = fs.readFileSync('scratch/reveal_mechanism.js', 'utf8');

// Replace all P(...) or n(...) with the evaluated string
// Note: In Dr, let n = P, so n(xxx) is P(xxx)
let replaced = target.replace(/\b(?:P|n)\((\d+)\)/g, (match, num) => {
  try {
    const val = pr(parseInt(num, 10));
    return JSON.stringify(val);
  } catch (e) {
    return match;
  }
});

fs.writeFileSync('scratch/reveal_deobfuscated.js', replaced);
console.log('Deobfuscated successfully written to scratch/reveal_deobfuscated.js');
