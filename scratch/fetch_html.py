import urllib.request
try:
    req = urllib.request.Request("https://demo.inelabteamdev.com/product/48", headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req).read().decode('utf-8')
    print(resp)
except Exception as e:
    print(e)
