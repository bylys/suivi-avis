#!/usr/bin/env python3
import os, sys, json, urllib.request, urllib.error

SLACK_WEBHOOK = os.environ["SLACK_WEBHOOK_URL"]

def post_slack(text):
    data = json.dumps({"text": text}).encode()
    req = urllib.request.Request(SLACK_WEBHOOK, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read().decode()
            print(f"Slack status: {r.status}, body: {body}")
    except urllib.error.HTTPError as e:
        print(f"Slack error {e.code}: {e.read().decode()}")
        sys.exit(1)

post_slack("test message depuis GitHub Actions")
print("Script terminé")
