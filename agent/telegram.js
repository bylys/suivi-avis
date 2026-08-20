/**
 * telegram.js — Envoi de notifications Telegram automatique
 */

async function sendTelegramNotification(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Note Telegram : TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant (notification ignorée).");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
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
