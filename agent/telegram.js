/**
 * telegram.js — Envoi de notifications Telegram automatique
 */

async function sendTelegramNotification(message) {
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!rawToken || !chatId) {
    console.log("Note Telegram : TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant (notification ignorée).");
    return;
  }

  // Nettoyage intelligent du token (supprime 'bot' si la personne l'a collé au début du secret)
  let token = rawToken.trim().replace(/^["']|["']$/g, '');
  if (token.toLowerCase().startsWith('bot')) {
    token = token.slice(3);
  }
  token = token.trim();

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId).trim(),
        text: message,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log("📲 Notification Telegram envoyée avec succès !");
    } else {
      console.log("Erreur Telegram API :", data.description);
    }
  } catch (err) {
    console.log("Erreur envoi Telegram :", err.message);
  }
}

module.exports = { sendTelegramNotification };
