import urllib.request
import json
import re

resp = urllib.request.urlopen("https://demo.inelabteamdev.com/api/product/48").read()
data = json.loads(resp)
data_str = json.dumps(data)

# Find all occurrences of "price" and surrounding text
matches = re.finditer(r'.{0,30}price.{0,30}', data_str, re.IGNORECASE)
for m in matches:
    print("MATCH:", m.group(0))
