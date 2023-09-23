// helper/subscriptionHelper.js
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis(process.env.REDIS_URL);
console.log('Redis connection established!');

const pool = mysql.createPool(process.env.DATABASE_URL);
const { saveSubscription } = require('./saveSubscription');
const { sendMessage } = require('./messengerApi');

const checkSubscription = async (fbid) => {
  try {
    const cacheItem = await redis.get(fbid);

    if (cacheItem) {
      if (cacheItem === 'E') {
        await sendMessage(fbid, `
📢 Offre de Renouvellement - Détails et Paiement:
🗓️ Durée: 1 Mois (24h/24) ⏰
💰 Prix: 5900 Ariary

🏧 Moyens de paiement acceptés:
Mvola: 038 82 686 00
Airtel Money: 033 20 449 55
Orange Money: 032 41 969 56
👤 Tous les comptes sont au nom de RAZAFIMANANTSOA Jean Marc.

📲 Une fois le paiement effectué, veuillez nous fournir votre numéro (10 chiffres) pour la vérification.
        `);
        console.log('Expired.');
        return {};
      }
      return {
        Status: 'A',
      };
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query('SELECT expireDate FROM users WHERE fbid = ?', [fbid]);
      const subscriptionItem = result[0];

      if (!subscriptionItem || !subscriptionItem.expireDate) {
        await saveSubscription(fbid);
        return {
          Status: 'A',
        };
      }

      const currentDate = new Date();
      const expireDate = new Date(subscriptionItem.expireDate);

      if (expireDate > currentDate) {
        const timeToLiveInSeconds = Math.ceil((expireDate - currentDate) / 1000);
        await redis.setex(fbid, timeToLiveInSeconds, 'A');
        return {
          Status: 'A',
        };
      } else {
        await Promise.all([
          connection.query('UPDATE users SET expireDate = ? WHERE fbid = ?', ['E', fbid]),
          redis.set(fbid, 'E', 'EX', 960)
        ]);

        await sendMessage(fbid, `
          📢Votre abonnement a expiré. 😢 Pour continuer à bénéficier des services de notre chatbot, nous vous encouragez à vous abonner dès maintenant. Si vous avez besoin plus de détails, n'hésitez pas à nous demander ! 💬
        `);

        console.log('Expired.');
        return {};
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error occurred while checking subscription:', error);
    return;
  }
};

module.exports = {
  checkSubscription,
};
