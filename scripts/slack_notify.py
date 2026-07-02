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


def post_slack(blocks, text_fallback):
    data = json.dumps({"text": text_fallback, "blocks": blocks}).encode()
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

    # Fenêtre glissante 30 jours
    j30_start     = today - timedelta(days=30)
    avis_30j      = sb_get(f"avis?select=id,statut&date=gte.{j30_start.isoformat()}&date=lte.{today.isoformat()}&limit=5000")
    nb_30j        = len(avis_30j)
    nb_30j_actifs = sum(1 for a in avis_30j if a["statut"] != "supprime")
    nb_30j_supp   = nb_30j - nb_30j_actifs
    taux_30j      = round(nb_30j_actifs / nb_30j * 100) if nb_30j else 0
    emoji_30j     = "🟢" if taux_30j >= 30 else "🟡" if taux_30j >= 15 else "🔴"

    emoji_day = "🟢" if nb_periode >= 10 else "🟡" if nb_periode >= 5 else "🔴"

    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": f"📊 Rapport avis GMB — {periode_label}"}
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*{emoji_day} Période {periode_label}*\n"
                    f"• Avis publiés : *{nb_periode}*"
                )
            }
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*📅 30 derniers jours ({j30_start.strftime('%d/%m')} → {today.strftime('%d/%m')})*\n"
                    f"• Avis publiés : *{nb_30j}*\n"
                    f"• Encore en ligne : *{nb_30j_actifs}*\n"
                    f"• Supprimés : *{nb_30j_supp}*\n"
                    f"• {emoji_30j} Taux de succès : *{taux_30j}%* _({nb_30j_actifs}/{nb_30j})_"
                )
            }
        },
        {"type": "divider"}
    ]

    fallback = f"📊 Avis GMB {periode_label} — {nb_periode} publiés | 30j: {nb_30j} publiés, {nb_30j_actifs} en ligne ({taux_30j}%)"
    post_slack(blocks, fallback)
    print(f"Daily sent — période: {nb_periode}, 30j: {nb_30j} publiés {taux_30j}% survie")


def survival():
    today = date.today()

    if today.day == 1:
        # ── 1er du mois : rapport complet sur le mois J-2 ───────────────────
        # Ex: 1er juillet → rapport de mai (avis de juin pas encore tous à J+30)
        cohort_end   = today.replace(day=1) - timedelta(days=1)   # dernier jour du mois précédent
        cohort_end   = cohort_end.replace(day=1) - timedelta(days=1)  # dernier jour de J-2
        cohort_start = cohort_end.replace(day=1)
        mois_label   = cohort_start.strftime("%B %Y").capitalize()
        titre        = f"Rapport survie — {mois_label}"

        avis_cohort = sb_get(
            f"avis?select=id,fiche_nom,statut"
            f"&date=gte.{cohort_start.isoformat()}"
            f"&date=lte.{cohort_end.isoformat()}&limit=10000"
        )
        total      = len(avis_cohort)
        survivants = sum(1 for a in avis_cohort if a["statut"] == "j30")
        supprimes  = sum(1 for a in avis_cohort if a["statut"] == "supprime")
        taux       = round(survivants / total * 100, 1) if total else 0

        # Tendance : mois d'avant (J-3)
        prev2_end   = cohort_start - timedelta(days=1)
        prev2_start = prev2_end.replace(day=1)
        avis_prev = sb_get(
            f"avis?select=id,statut"
            f"&date=gte.{prev2_start.isoformat()}"
            f"&date=lte.{prev2_end.isoformat()}&limit=5000"
        )
        prev_total = len(avis_prev)
        prev_surv  = sum(1 for a in avis_prev if a["statut"] == "j30")
        taux_prev  = round(prev_surv / prev_total * 100, 1) if prev_total else 0
        tendance   = "📈" if taux > taux_prev else "📉" if taux < taux_prev else "➡️"

        # Top 3 fiches
        top_fiches = Counter(
            a["fiche_nom"] for a in avis_cohort if a["statut"] == "j30"
        ).most_common(3)
        top_text = "\n".join(
            f"• {nom[:50]} — *{n}* en ligne" for nom, n in top_fiches
        ) if top_fiches else "_Aucune donnée_"

        emoji_taux = "🟢" if taux >= 30 else "🟡" if taux >= 15 else "🔴"

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"🛡️ {titre}"}
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*{emoji_taux} Taux de survie J+30 : {taux}%* {tendance} _(était {taux_prev}%)_\n\n"
                        f"*Sur {total} avis analysés :*\n"
                        f"• ✅ {survivants} encore en ligne\n"
                        f"• ❌ {supprimes} supprimés"
                    )
                }
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
        fallback = f"🛡️ {titre} — {taux}% survie | {survivants} en ligne, {supprimes} supprimés"

    else:
        # ── 15 du mois : rapport léger sur les avis qui viennent d'atteindre J+30 ──
        # Avis publiés il y a 30-45 jours (première quinzaine du mois dernier)
        j30_date = today - timedelta(days=30)
        j45_date = today - timedelta(days=45)
        mois_label = j30_date.strftime("%B %Y").capitalize()
        titre      = f"Rapport survie — mi-{mois_label}"

        avis_cohort = sb_get(
            f"avis?select=id,statut"
            f"&date=gte.{j45_date.isoformat()}"
            f"&date=lte.{j30_date.isoformat()}&limit=5000"
        )
        total      = len(avis_cohort)
        survivants = sum(1 for a in avis_cohort if a["statut"] == "j30")
        taux       = round(survivants / total * 100, 1) if total else 0
        emoji_taux = "🟢" if taux >= 30 else "🟡" if taux >= 15 else "🔴"

        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"🛡️ {titre}"}
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        f"*{emoji_taux} Taux de survie J+30 : {taux}%*\n\n"
                        f"*Sur {total} avis analysés :*\n"
                        f"• ✅ {survivants} encore en ligne à J+30"
                    )
                }
            },
            {"type": "divider"}
        ]
        fallback = f"🛡️ {titre} — {taux}% survie | {survivants}/{total} en ligne"

    post_slack(blocks, fallback)
    print(f"Survival sent — taux: {taux}%, survivants: {survivants}/{total}")


if MODE == "daily":
    daily()
elif MODE == "survival":
    survival()
else:
    print(f"Mode inconnu: {MODE}")
    sys.exit(1)
