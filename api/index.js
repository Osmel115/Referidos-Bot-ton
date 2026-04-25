const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURACIÓN ---
const bot = new Telegraf('8614330099:AAGG95zS5SSm1qlTWMB-WvHqKcjV2VMNP3A');
const supabase = createClient('https://zzjxfwsqrzzehzongdrd.supabase.co', 'sb_secret_vRuDoOpBaWK-Mcy0bJsc8Q_aB8o3PsO');

// REEMPLAZA ESTOS CON TUS CANALES REALES
const CANAL_1 = '@tu_canal_1'; 
const CANAL_2 = '@tu_canal_2';

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload; 

    try {
        // 1. Verificación de canales
        const member1 = await ctx.telegram.getChatMember(CANAL_1, userId);
        const member2 = await ctx.telegram.getChatMember(CANAL_2, userId);
        
        const isSubscribed = ['member', 'administrator', 'creator'].includes(member1.status) && 
                             ['member', 'administrator', 'creator'].includes(member2.status);

        if (!isSubscribed) {
            return ctx.reply(`❌ Debes unirte a ${CANAL_1} y ${CANAL_2} para participar.`);
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
                { id_telegram: userId, referido_por: referrerId }
            ]);

            // Pagar al invitador
            if (referrerId && referrerId != userId) {
                let { data: inviter } = await supabase
                    .from('usuarios')
                    .select('balance')
                    .eq('id_telegram', referrerId)
                    .single();

                if (inviter) {
                    const nuevoBalance = (inviter.balance || 0) + 0.01;
                    await supabase
                        .from('usuarios')
                        .update({ balance: nuevoBalance })
                        .eq('id_telegram', referrerId);
                    
                    bot.telegram.sendMessage(referrerId, "💰 ¡Un nuevo referido se ha unido! Has ganado 0.01 TON.");
                }
            }
        }

        ctx.reply("✅ ¡Verificación exitosa!", {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🚀 Abrir Panel", web_app: { url: "https://osmel115.github.io/Referidos-Bot-ton/" } }
                ]]
            }
        });

    } catch (error) {
        console.error(error);
        ctx.reply("Hubo un error. Asegúrate de que el bot sea administrador de los canales.");
    }
});

// --- LÓGICA PARA VERCEL (WEBHOOK) ---
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body, res);
        } else {
            res.status(200).send('Bot funcionando correctamente');
        }
    } catch (error) {
        console.error("Error en Webhook:", error);
        res.status(500).send('Error interno');
    }
};
                  
