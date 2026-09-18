import json

for pid in [48, 675, 12]:
    try:
        with open(f'scratch/api_events_{pid}.json', 'r', encoding='utf-8') as f:
            events = json.load(f)
        print(f"\n--- API EVENTS FOR {pid} (Total {len(events)}) ---")
        for ev in events:
            if ev.get("type") == "REQ":
                print(f"[REQ] {ev.get('method')} {ev.get('url')}")
                if ev.get('post_data'):
                    print(f"      Body: {ev.get('post_data')[:150]}")
            else:
                print(f"[RES] {ev.get('status')} {ev.get('url')}")
                if ev.get('body'):
                    print(f"      Body: {str(ev.get('body'))[:150]}")
    except Exception as e:
        print(f"Error reading {pid}: {e}")
