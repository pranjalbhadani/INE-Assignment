import urllib.request
import json
try:
    resp = urllib.request.urlopen("https://demo.inelabteamdev.com/api/layout").read()
    print(json.loads(resp))
except Exception as e:
    print(e)
