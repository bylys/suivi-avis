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
    # Pagination automatique — Supabase plafonne à 1000 lignes par requête
    base = path.split('?')[0]
    qs   = path[len(base):].lstrip('?')  # sans le '?' initial
    # Supprimer tout limit= existant dans la query string
    import re
    qs = re.sub(r'[&?]?limit=\d+', '', qs).strip('&')
    sep = '?' if qs else ''
    all_rows, offset = [], 0
    PAGE = 1000
    while True:
        off_param = f"&offset={offset}" if offset else ""
        url = f"{SB_URL}/rest/v1/{base}{sep}{qs}&limit={PAGE}{off_param}" if qs else f"{SB_URL}/rest/v1/{base}?limit={PAGE}{off_param}"
        req = urllib.request.Request(url)
        req.add_header("apikey", SB_KEY)
        req.add_header("Authorization", f"Bearer {SB_KEY}")
        with urllib.request.urlopen(req) as r:
            page = json.loads(r.read())
        all_rows.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
    return all_rows


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

    # Cumul du mois calendaire (volume uniquement, pas de taux)
    month_start  = today.replace(day=1).isoformat()
    mois_label   = today.strftime("%B %Y").capitalize()
    avis_mois    = sb_get(f"avis?select=id,statut&date=gte.{month_start}&date=lte.{today.isoformat()}&limit=5000")
    nb_mois      = len(avis_mois)
    nb_mois_supp = sum(1 for a in avis_mois if a["statut"] == "supprime")

    # Taux de succès J+30 — J-60 à J-30 uniquement (avis ayant eu le temps d'être jugés)
    j60_start    = today - timedelta(days=60)
    j30_end      = today - timedelta(days=30)
    avis_succes  = sb_get(f"avis?select=id,statut&date=gte.{j60_start.isoformat()}&date=lte.{j30_end.isoformat()}&limit=5000")
    nb_succes    = len(avis_succes)
    nb_en_ligne  = sum(1 for a in avis_succes if a["statut"] != "supprime")
    nb_supp      = nb_succes - nb_en_ligne
    taux_succes  = round(nb_en_ligne / nb_succes * 100) if nb_succes else 0
    emoji_succes = "🟢" if taux_succes >= 50 else "🟡" if taux_succes >= 30 else "🔴"

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
                    f"*{emoji_day} Avis publiés — {periode_label}*\n"
                    f"• Total : *{nb_periode}*"
                )
            }
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*📅 Cumul {mois_label}*\n"
                    f"• Avis publiés : *{nb_mois}*\n"
                    f"• Supprimés : *{nb_mois_supp}*"
                )
            }
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*🎯 Taux de succès J+30 ({j60_start.strftime('%d/%m')} → {j30_end.strftime('%d/%m')})*\n"
                    f"• Avis analysés : *{nb_succes}*\n"
                    f"• Encore en ligne : *{nb_en_ligne}*\n"
                    f"• Supprimés : *{nb_supp}*\n"
                    f"• {emoji_succes} Taux de succès : *{taux_succes}%* _({nb_en_ligne}/{nb_succes})_"
                )
            }
        },
        {"type": "divider"}
    ]

    fallback = f"📊 Avis GMB {periode_label} — {nb_periode} publiés | Cumul {mois_label}: {nb_mois} | Succès J+30: {taux_succes}%"
    post_slack(blocks, fallback)
    print(f"Daily sent — période: {nb_periode}, mois: {nb_mois}, taux succès: {taux_succes}%")


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
