const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURACIÓN ---
// Es mejor usar process.env para que Vercel use las llaves que configuraste en su panel
const bot = new Telegraf(process.env.BOT_TOKEN || '8614330099:AAGG95zS5SSm1qlTWMB-WvHqKcjV2VMNP3A');
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://zzjxfwsqrzzehzongdrd.supabase.co', 
    process.env.SUPABASE_KEY || 'sb_secret_vRuDoOpBaWK-Mcy0bJsc8Q_aB8o3PsO'
);

const CANAL_1 = '@CryptoInvestmentsWebs'; 
const CANAL_2 = '@AlfaWithdrawalChannel';

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    // El payload llega como string, lo convertimos a número
    const referrerId = ctx.payload ? Number(ctx.payload) : null; 

    try {
        // 1. Verificación de canales
        const member1 = await ctx.telegram.getChatMember(CANAL_1, userId);
        const member2 = await ctx.telegram.getChatMember(CANAL_2, userId);
        
        const isSubscribed = ['member', 'administrator', 'creator'].includes(member1.status) && 
                             ['member', 'administrator', 'creator'].includes(member2.status);

        if (!isSubscribed) {
            return ctx.reply(`❌ Debes unirte a los canales para participar:\n1️⃣ ${CANAL_1}\n2️⃣ ${CANAL_2}`);
        }

        // 2. Revisar si el usuario ya existe
        let { data: user } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id_telegram', userId)
            .single();

        if (!user) {
            // Registrar usuario nuevo
            await supabase.from('usuarios').insert([
                { id_telegram: userId, referido_por: referrerId, balance: 0 }
            ]);

            // Pagar al invitador si existe y no es el mismo usuario
            if (referrerId && referrerId !== userId) {
                let { data: inviter } = await supabase
                    .from('usuarios')
                    .select('balance')
                    .eq('id_telegram', referrerId)
                    .single();

                if (inviter) {
                    // ARREGLO DE SUMA: Forzamos que sean números
                    const balanceActual = Number(inviter.balance) || 0;
                    const nuevoBalance = balanceActual + 0.01;

                    const { error: updateError } = await supabase
                        .from('usuarios')
                        .update({ balance: nuevoBalance })
                        .eq('id_telegram', referrerId);
                    
                    if (!updateError) {
                        bot.telegram.sendMessage(referrerId, `💰 ¡Un nuevo referido se ha unido! Has ganado 0.01 TON.\nTu nuevo balance: ${nuevoBalance.toFixed(2)} TON`);
                    }
                }
            }
        }

        ctx.reply("✅ ¡Verificación exitosa!", {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🚀 Abrir Panel", web_app: { url: "https://referidos-bot-ton.vercel.app/" } }
                ]]
            }
        });

    } catch (error) {
        console.error("Error en el bot:", error);
        ctx.reply("❌ Error al verificar canales. Asegúrate de que el bot sea administrador.");
    }
});

// --- LÓGICA PARA VERCEL (WEBHOOK) ---
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } catch (err) {
            console.error(err);
            res.status(500).send('Error');
        }
    } else {
        res.status(200).send('Servidor del Bot Activo');
    }
};
            
