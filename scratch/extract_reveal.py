import sys

with open('scratch/index.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Find the function around `minMoves` or `missing()`
idx = code.find('minMoves')
start = max(0, idx - 2000)
end = min(len(code), idx + 4000)

with open('scratch/reveal_mechanism.js', 'w', encoding='utf-8') as f:
    f.write(code[start:end])

print(f"Written {end - start} bytes around minMoves to scratch/reveal_mechanism.js")
