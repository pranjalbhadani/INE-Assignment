import re

with open('scratch/reveal_mechanism.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Simple formatting: add newlines after semicolons, open braces, and close braces
formatted = text.replace(';', ';\n').replace('{', '{\n').replace('}', '\n}\n')

with open('scratch/reveal_mechanism_pretty.js', 'w', encoding='utf-8') as f:
    f.write(formatted)

print("Saved scratch/reveal_mechanism_pretty.js")
