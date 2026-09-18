import urllib.request
import json
import time

try:
    resp = urllib.request.urlopen("https://demo.inelabteamdev.com/api/catalog?page=1&pageSize=20").read()
    data = json.loads(resp)
    for item in data['items']:
        pid = item['id']
        url = f"https://demo.inelabteamdev.com/api/product/{pid}"
        presp = urllib.request.urlopen(url).read()
        pdata = json.loads(presp)
        keys = set(pdata.keys())
        print(f"Product {pid}: keys={keys} | has_price={'price' in keys} | has_stock={'stock' in keys}")
        time.sleep(0.2)
except Exception as e:
    print(e)
