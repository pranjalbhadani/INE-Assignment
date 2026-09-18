const fs = require('fs');

const code = fs.readFileSync('scratch/index.js', 'utf8');

// The whole block from function pr to end of Dr
const prStart = code.indexOf('function pr(');
const vrStart = code.indexOf('function vr()');
const vrEnd = code.indexOf('var yr=');

const iifeStart = code.indexOf('(function(e,t){let n=pr');
const iifeEnd = code.indexOf('(vr,308767);') + '(vr,308767);'.length;

const script = `
${code.slice(vrStart, vrEnd)}
${code.slice(prStart, vrStart)}
var P = pr;
${code.slice(iifeStart, iifeEnd)}

const dict = {};
for (let i = 486; i <= 610; i++) {
  try {
    dict[i] = pr(i);
  } catch (e) {
    dict[i] = e.message;
  }
}
fs.writeFileSync('scratch/correct_strings.json', JSON.stringify(dict, null, 2));
console.log('Successfully written correct_strings.json');
`;

fs.writeFileSync('scratch/run_correct_strings.js', "const fs = require('fs');\n" + script);
console.log('Saved run_correct_strings.js');
