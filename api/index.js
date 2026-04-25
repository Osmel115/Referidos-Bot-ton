const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// --- CONFIGURACIÓN ---
const bot = new Telegraf(process.env.BOT_TOKEN || '8614330099:AAGG95zS5SSm1qlTWMB-WvHqKcjV2VMNP3A');
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://zzjxfwsqrzzehzongdrd.supabase.co', 
    process.env.SUPABASE_KEY || 'sb_secret_vRuDoOpBaWK-Mcy0bJsc8Q_aB8o3PsO'
);

const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN || '567910:AAdGD25QHCMfL4WOwg6SggU4DSAFpCubNfQ';
const cryptoPay = axios.create({
    baseURL: 'https://pay.crypt.bot/api',
    headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN }
});

const CANAL_1 = '@CryptoInvestmentsWebs'; 
const CANAL_2 = '@AlfaWithdrawalChannel';

// --- LÓGICA DE INICIO ---
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload ? Number(ctx.payload) : null; 

    try {
        const member1 = await ctx.telegram.getChatMember(CANAL_1, userId);
        const member2 = await ctx.telegram.getChatMember(CANAL_2, userId);
        
        const isSubscribed = ['member', 'administrator', 'creator'].includes(member1.status) && 
                             ['member', 'administrator', 'creator'].includes(member2.status);

        if (!isSubscribed) {
            return ctx.reply(`⚠️ ACCESO RESTRINGIDO ⚠️\n\nDebes unirte a nuestros canales para participar:\n\n1️⃣ ${CANAL_1}\n2️⃣ ${CANAL_2}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Unirse al Canal 1", url: `https://t.me/${CANAL_1.replace('@','')}` }],
                        [{ text: "Unirse al Canal 2", url: `https://t.me/${CANAL_2.replace('@','')}` }],
                        [{ text: "🔄 Verificar Suscripción", callback_data: "check_sub" }]
                    ]
                }
            });
        }

        let { data: user } = await supabase.from('usuarios').select('*').eq('id_telegram', userId).single();

        if (!user) {
            await supabase.from('usuarios').insert([{ id_telegram: userId, referido_por: referrerId, balance: 0 }]);
            if (referrerId && referrerId !== userId) {
                let { data: inviter } = await supabase.from('usuarios').select('balance').eq('id_telegram', referrerId).single();
                if (inviter) {
                    const nuevoBalance = (parseFloat(inviter.balance) || 0) + 0.01;
                    await supabase.from('usuarios').update({ balance: nuevoBalance }).eq('id_telegram', referrerId);
                    bot.telegram.sendMessage(referrerId, `💰 ¡Nuevo referido! +0.01 TON.\nBalance: ${nuevoBalance.toFixed(2)} TON`);
                }
            }
        }

        ctx.reply("✅ ¡Verificación exitosa!", {
            reply_markup: {
                inline_keyboard: [[{ text: "🚀 Abrir Panel", web_app: { url: "https://referidos-bot-ton.vercel.app/" } }]]
            }
        });
    } catch (error) {
        ctx.reply("❌ Error al verificar suscripción.");
    }
});

bot.action('check_sub', (ctx) => ctx.reply("Reenvía /start para verificar."));

// --- EXPORTACIÓN PARA VERCEL (Manejador de Retiro Directo) ---
module.exports = async (req, res) => {
    // Si la petición viene de la Mini App (Fetch Directo)
    if (req.body && req.body.accion_manual === "retiro_directo") {
        const { id, monto } = req.body;
        try {
            // 1. Validar en Supabase
            const { data: user } = await supabase.from('usuarios').select('balance').eq('id_telegram', id).single();
            
            if (user && parseFloat(user.balance) >= monto) {
                // 2. Transferencia en Crypto Pay
                const response = await cryptoPay.post('/transfer', {
                    user_id: id,
                    asset: 'TON',
                    amount: monto,
                    spend_id: `withdraw_${id}_${Date.now()}`
                });

                if (response.data.ok) {
                    // 3. Resetear balance
                    await supabase.from('usuarios').update({ balance: 0 }).eq('id_telegram', id);
                    await bot.telegram.sendMessage(id, `✅ **Retiro Automático Exitoso**\n💰 Has recibido ${monto} TON en @CryptoBot.`);
                    return res.status(200).json({ ok: true });
                }
            }
            return res.status(400).json({ error: "Saldo insuficiente" });
        } catch (err) {
            console.error("Error en pago:", err.response?.data || err.message);
            return res.status(500).json({ error: "Fallo en el pago automático" });
        }
    }

    // Si la petición viene de Telegram (Webhooks normales)
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('Bot Online');
    }
};
            
