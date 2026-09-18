import urllib.request
import json
import time

for i in range(20):
    try:
        resp = urllib.request.urlopen("https://demo.inelabteamdev.com/api/product/48").read()
        data = json.loads(resp)
        keys = set(data.keys())
        has_price = 'price' in keys or 'price' in str(data).lower()
        has_stock = 'stock' in keys or 'stock' in str(data).lower()
        print(f"Attempt {i+1}: keys={keys} | has_price={has_price} | has_stock={has_stock}")
    except Exception as e:
        print(f"Attempt {i+1}: Error {e}")
    time.sleep(0.5)
