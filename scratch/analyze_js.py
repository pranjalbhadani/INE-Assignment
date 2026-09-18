import re
import sys

with open('scratch/index.js', 'r', encoding='utf-8') as f:
    code = f.read()

output = []
output.append(f"Total bundle length: {len(code)} bytes\n")

for keyword in ['price', 'stock', 'Reveal', 'pw-', 'status', 'hidden', 'cost']:
    matches = [m.start() for m in re.finditer(keyword, code, re.IGNORECASE)]
    output.append(f"\n==================== KEYWORD: {keyword} (Found {len(matches)}) ====================\n")
    for i, idx in enumerate(matches):
        start = max(0, idx - 200)
        end = min(len(code), idx + 200)
        snippet = code[start:end].replace('\n', ' ')
        output.append(f"[{i+1}] ...{snippet}...\n")

with open('scratch/js_analysis_utf8.txt', 'w', encoding='utf-8') as f:
    f.writelines(output)

print("Analysis written to scratch/js_analysis_utf8.txt")
