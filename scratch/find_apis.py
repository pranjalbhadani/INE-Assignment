import re

with open("index.js", "r", encoding="utf-8") as f:
    content = f.read()

urls = re.findall(r'/api/[a-zA-Z0-9_/-]+', content)
print(set(urls))
