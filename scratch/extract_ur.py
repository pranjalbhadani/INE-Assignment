import sys

with open('scratch/index.js', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('function Ur(')
chunk = code[idx:idx+3500]

with open('scratch/ur_function.js', 'w', encoding='utf-8') as f:
    f.write(chunk)

print("Saved scratch/ur_function.js")
