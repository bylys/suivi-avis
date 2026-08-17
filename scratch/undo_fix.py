import urllib.request
import json
import re

URL = "https://rrbvghxmnimusfyqixau.supabase.co"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"

def update_avis(avis_id, new_op):
    req = urllib.request.Request(f"{URL}/rest/v1/avis?id=eq.{avis_id}", method="PATCH")
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    data = json.dumps({"operateur": new_op}).encode()
    try:
        with urllib.request.urlopen(req, data=data) as resp:
            return True
    except Exception as e:
        print(f"Error updating {avis_id}: {e}")
        return False

log_file = "/Users/mailyspayot/.gemini/antigravity/brain/6edaab1d-8ce8-43ff-8242-9464ce06f814/.system_generated/tasks/task-282.log"
with open(log_file, "r") as f:
    log_data = f.read()

pattern = r"Fixing avis ([a-f0-9\-]+) from (\w+) -> (\w+)"
matches = re.findall(pattern, log_data)

undos = 0
for avis_id, old_op, new_op in matches:
    # We want to revert TO old_op
    print(f"Reverting {avis_id} back to {old_op}")
    if update_avis(avis_id, old_op):
        undos += 1

print(f"Undid {undos} changes.")
