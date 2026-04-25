const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // La librería axios agregada

// --- CONFIGURACIÓN ---
const bot = new Telegraf(process.env.BOT_TOKEN || '8614330099:AAGG95zS5SSm1qlTWMB-WvHqKcjV2VMNP3A');
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://zzjxfwsqrzzehzongdrd.supabase.co', 
    process.env.SUPABASE_KEY || 'sb_secret_vRuDoOpBaWK-Mcy0bJsc8Q_aB8o3PsO'
);

// TOKEN DE CRYPTO PAY (Obtenlo en @CryptoBot -> Crypto Pay -> Create App)
const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN || '567910:AAdGD25QHCMfL4WOwg6SggU4DSAFpCubNfQ';
const cryptoPay = axios.create({
    baseURL: 'https://pay.crypt.bot/api',
    headers: { 'Crypto-Pay-API-Token': CRYPTO_PAY_TOKEN }
});

const CANAL_1 = '@CryptoInvestmentsWebs'; 
const CANAL_2 = '@AlfaWithdrawalChannel';

// --- LÓGICA DE INICIO Y REGISTRO ---
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

// --- LÓGICA DE RETIRO AUTOMÁTICO ---
bot.on('web_app_data', async (ctx) => {
    try {
        const data = JSON.parse(ctx.webAppData.data().text());

        if (data.accion === "retiro_solicitado") {
            const userId = data.id;
            const monto = parseFloat(data.monto.split(' ')[0]); // Extrae el número de "0.010 TON"

            // 1. Validar saldo en base de datos
            const { data: user } = await supabase.from('usuarios').select('balance').eq('id_telegram', userId).single();

            if (user && parseFloat(user.balance) >= monto) {
                // 2. Intentar transferencia vía Crypto Pay
                try {
                    const response = await cryptoPay.post('/transfer', {
                        user_id: userId,
                        asset: 'TON',
                        amount: monto,
                        spend_id: `ref_withdraw_${userId}_${Date.now()}`
                    });

                    if (response.data.ok) {
                        // 3. Descontar saldo si el pago fue exitoso
                        await supabase.from('usuarios').update({ balance: 0 }).eq('id_telegram', userId);
                        await ctx.reply(`✅ **Retiro Automático Exitoso**\n💰 Has recibido ${monto} TON en @CryptoBot.`);
                    }
                } catch (payErr) {
                    console.error("Error CryptoPay:", payErr.response?.data || payErr.message);
                    await ctx.reply("❌ Error en el procesador de pagos. Fondos insuficientes en el bot.");
                }
            } else {
                await ctx.reply("❌ Saldo insuficiente.");
            }
        }
    } catch (e) {
        console.error("Error procesando retiro:", e);
    }
});

bot.action('check_sub', (ctx) => ctx.reply("Reenvía /start para verificar."));

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) { res.status(500).send('Error'); }
    } else { res.status(200).send('Bot Activo'); }
};
          
