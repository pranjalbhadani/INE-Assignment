import re

with open('scratch/index.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's find the obfuscation string array and lookup function
# In webpack / vite / javascript obfuscator, there is an array of strings and a function like function n(e) or function P(e)
# Let's look for functions around Dr
idx = code.find('async function Dr')
print("Found Dr at", idx)

# Let's see 2000 chars before Dr
print(code[max(0, idx - 1500):idx])
