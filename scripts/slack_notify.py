#!/usr/bin/env python3
"""
Slack notifications for GMB Tracker avis stats.
Mode daily   : avis publiés hier/vendredi + cumul du mois (lun-ven, 9h TH)
Mode survival: taux de survie J+30, top fiches (1er et 15, 9h30 TH)
"""

import os, sys, json, urllib.request, urllib.error
from datetime import date, timedelta
from collections import Counter

SB_URL = os.environ["SUPABASE_URL"]
SB_KEY = os.environ["SUPABASE_KEY"]
SLACK_WEBHOOK = os.environ["SLACK_WEBHOOK_URL"]
MODE = sys.argv[1] if len(sys.argv) > 1 else "daily"


def sb_get(path):
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{path}")
    req.add_header("apikey", SB_KEY)
    req.add_header("Authorization", f"Bearer {SB_KEY}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def post_slack(blocks):
    data = json.dumps({"blocks": blocks}).encode()
    req = urllib.request.Request(SLACK_WEBHOOK, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            print(f"Slack OK: {r.status}")
    except urllib.error.HTTPError as e:
        print(f"Slack error: {e.read().decode()}")
        sys.exit(1)


def daily():
    today = date.today()

    # Lundi → couvrir vendredi + samedi + dimanche
    if today.weekday() == 0:
        date_from = today - timedelta(days=3)
        date_to   = today - timedelta(days=1)
        periode_label = f"{date_from.strftime('%d/%m')} → {date_to.strftime('%d/%m')}"
        date_filter = f"date=gte.{date_from.isoformat()}&date=lte.{date_to.isoformat()}"
    else:
        yesterday = today - timedelta(days=1)
        periode_label = yesterday.strftime('%d/%m')
        date_filter = f"date=eq.{yesterday.isoformat()}"

    # Avis de la période
    avis_periode = sb_get(f"avis?select=id,fiche_nom,statut&{date_filter}&limit=2000")
    nb_periode = len(avis_periode)
    nb_actifs  = sum(1 for a in avis_periode if a["statut"] != "supprime")

    # Cumul du mois en cours
    month_start = today.replace(day=1).isoformat()
    mois_label  = today.strftime("%B %Y").capitalize()
    avis_mois   = sb_get(f"avis?select=id,statut&date=gte.{month_start}&limit=5000")
    nb_mois         = len(avis_mois)
    nb_mois_actifs  = sum(1 for a in avis_mois if a["statut"] != "supprime")

    emoji_day = "🟢" if nb_periode >= 10 else "🟡" if nb_periode >= 5 else "🔴"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"📊 Rapport avis GMB — {periode_label}"}
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": (
                        f"*{emoji_day} Avis publiés ({periode_label})*\n"
                        f"`{nb_periode}` publiés\n"
                        f"{nb_actifs} toujours en ligne"
                    )
                },
                {
                    "type": "mrkdwn",
                    "text": (
                        f"*📅 Cumul {mois_label}*\n"
                        f"`{nb_mois}` publiés\n"
                        f"{nb_mois_actifs} toujours en ligne"
                    )
                }
            ]
        },
        {"type": "divider"}
    ]

    post_slack(blocks)
    print(f"Daily sent — période: {nb_periode}, mois: {nb_mois}")


def survival():
    today = date.today()

    # Cohorte analysée : tous les avis >30j (ont eu le temps d'être confirmés ou supprimés)
    j30_cutoff = (today - timedelta(days=30)).isoformat()
    avis_old = sb_get(f"avis?select=id,fiche_nom,date,statut&date=lte.{j30_cutoff}&limit=10000")

    total      = len(avis_old)
    survivants = sum(1 for a in avis_old if a["statut"] == "j30")
    supprimes  = sum(1 for a in avis_old if a["statut"] == "supprime")
    taux       = round(survivants / total * 100, 1) if total else 0

    # Cohorte précédente (J-60 à J-30) pour la tendance
    j60_cutoff = (today - timedelta(days=60)).isoformat()
    avis_prev  = sb_get(
        f"avis?select=id,statut&date=gte.{j60_cutoff}&date=lte.{j30_cutoff}&limit=5000"
    )
    prev_total = len(avis_prev)
    prev_surv  = sum(1 for a in avis_prev if a["statut"] == "j30")
    taux_prev  = round(prev_surv / prev_total * 100, 1) if prev_total else 0
    tendance   = "📈" if taux > taux_prev else "📉" if taux < taux_prev else "➡️"

    # Top 3 fiches avec le plus d'avis encore en ligne (j30)
    top_fiches = Counter(
        a["fiche_nom"] for a in avis_old if a["statut"] == "j30"
    ).most_common(3)
    top_text = "\n".join(
        f"• {nom[:50]} — *{n}* en ligne" for nom, n in top_fiches
    ) if top_fiches else "_Aucune donnée_"

    emoji_taux = "🟢" if taux >= 30 else "🟡" if taux >= 15 else "🔴"

    # Label période : 1er du mois = rapport du mois précédent
    if today.day == 1:
        import calendar
        prev_month = (today.replace(day=1) - timedelta(days=1))
        periode_label = f"Rapport survie — {prev_month.strftime('%B %Y').capitalize()}"
    else:
        periode_label = f"Rapport survie — mi {today.strftime('%B %Y').capitalize()}"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"🛡️ {periode_label}"}
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": (
                        f"*{emoji_taux} Taux de survie J+30*\n"
                        f"`{taux}%` {tendance} _(était {taux_prev}%)_"
                    )
                },
                {
                    "type": "mrkdwn",
                    "text": (
                        f"*📦 Sur {total} avis analysés*\n"
                        f"✅ {survivants} encore en ligne\n"
                        f"❌ {supprimes} supprimés"
                    )
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*🏆 Top fiches (avis toujours en ligne) :*\n{top_text}"
            }
        },
        {"type": "divider"}
    ]

    post_slack(blocks)
    print(f"Survival sent — taux: {taux}%, survivants: {survivants}/{total}")


if MODE == "daily":
    daily()
elif MODE == "survival":
    survival()
else:
    print(f"Mode inconnu: {MODE}")
    sys.exit(1)
