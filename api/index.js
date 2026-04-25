const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURACIÓN ---
const bot = new Telegraf(process.env.BOT_TOKEN || '8614330099:AAGG95zS5SSm1qlTWMB-WvHqKcjV2VMNP3A');
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://zzjxfwsqrzzehzongdrd.supabase.co', 
    process.env.SUPABASE_KEY || 'sb_secret_vRuDoOpBaWK-Mcy0bJsc8Q_aB8o3PsO'
);

const CANAL_1 = '@CryptoInvestmentsWebs'; 
const CANAL_2 = '@AlfaWithdrawalChannel';

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload ? Number(ctx.payload) : null; 

    try {
        // 1. VERIFICACIÓN ESTRICTA DE CANALES
        const member1 = await ctx.telegram.getChatMember(CANAL_1, userId);
        const member2 = await ctx.telegram.getChatMember(CANAL_2, userId);
        
        const isSubscribed = ['member', 'administrator', 'creator'].includes(member1.status) && 
                             ['member', 'administrator', 'creator'].includes(member2.status);

        if (!isSubscribed) {
            return ctx.reply(`⚠️ ACCESO RESTRINGIDO ⚠️\n\nDebes unirte a nuestros canales para poder participar y ganar TON:\n\n1️⃣ ${CANAL_1}\n2️⃣ ${CANAL_2}\n\nUna vez unido, presiona /start de nuevo.`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Unirse al Canal 1", url: `https://t.me/${CANAL_1.replace('@','')}` }],
                        [{ text: "Unirse al Canal 2", url: `https://t.me/${CANAL_2.replace('@','')}` }],
                        [{ text: "🔄 Verificar Suscripción", callback_data: "check_sub" }]
                    ]
                }
            });
        }

        // 2. REVISAR SI EL USUARIO YA EXISTE
        let { data: user } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id_telegram', userId)
            .single();

        if (!user) {
            // REGISTRAR USUARIO NUEVO (Solo si pasó la verificación)
            await supabase.from('usuarios').insert([
                { id_telegram: userId, referido_por: referrerId, balance: 0 }
            ]);

            // PAGAR AL INVITADOR
            if (referrerId && referrerId !== userId) {
                let { data: inviter } = await supabase
                    .from('usuarios')
                    .select('balance')
                    .eq('id_telegram', referrerId)
                    .single();

                if (inviter) {
                    const balanceActual = Number(inviter.balance) || 0;
                    const nuevoBalance = balanceActual + 0.01;

                    await supabase
                        .from('usuarios')
                        .update({ balance: nuevoBalance })
                        .eq('id_telegram', referrerId);
                    
                    // Notificar al invitador
                    bot.telegram.sendMessage(referrerId, `💰 ¡Nuevo referido! Has ganado 0.01 TON.\nTu nuevo balance: ${nuevoBalance.toFixed(2)} TON`);
                }
            }
        }

        // 3. RESPUESTA CON EL BOTÓN DE LA APP
        ctx.reply("✅ ¡Verificación exitosa! Ya tienes acceso al panel de control.", {
            reply_markup: {
                inline_keyboard: [[
                    { text: "🚀 Abrir Panel", web_app: { url: "https://referidos-bot-ton.vercel.app/" } }
                ]]
            }
        });

    } catch (error) {
        console.error("Error en el bot:", error);
        ctx.reply("❌ Error: Asegúrate de que el bot sea administrador en ambos canales.");
    }
});

// Manejador para el botón de verificar suscripción
bot.action('check_sub', (ctx) => ctx.reply("Vuelve a enviar el comando /start para verificar."));

// --- LÓGICA PARA VERCEL ---
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
        res.status(200).send('Bot Online');
    }
};
                              
