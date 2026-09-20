const fs = require('fs');
async function find() {
  const r = await fetch('https://demo.inelabteamdev.com/');
  const html = await r.text();
  const scripts = [...html.matchAll(/src=\"([^\"]+)\"/g)].map(m => m[1]);
  for (const s of scripts) {
    if (!s.endsWith('.js')) continue;
    const js = await fetch('https://demo.inelabteamdev.com' + s).then(res => res.text());
    console.log(s, js.match(/\/api\/[a-zA-Z0-9_\-\/]+/g));
  }
}
find();
