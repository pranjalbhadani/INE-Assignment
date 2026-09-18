import json

with open('scratch/network_48.json', 'r', encoding='utf-8') as f:
    logs = json.load(f)

for item in logs:
    if 'api' in item.get('url', ''):
        t = item.get('type')
        m = item.get('method', '')
        u = item.get('url', '')
        s = item.get('status', '')
        b = item.get('body', '')
        print(f"[{t}] {m} {u} -> Status: {s}")
        if b:
            print(f"   Body: {str(b)[:200]}")
