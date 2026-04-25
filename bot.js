const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURACIÓN ---
const bot = new Telegraf('8614330099:AAGG95zS5SSm1qlTWMB-WvHqKcjV2VMNP3A');
const supabase = createClient('https://zzjxfwsqrzzehzongdrd.supabase.co', 'sb_secret_vRuDoOpBaWK-Mcy0bJsc8Q_aB8o3PsO');

const CANAL_1 = '@tu_canal_1';
const CANAL_2 = '@tu_canal_2';

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload; // ID del que invitó

    // 1. Verificación de canales
    const member1 = await ctx.telegram.getChatMember(CANAL_1, userId);
    const member2 = await ctx.telegram.getChatMember(CANAL_2, userId);
    
    const isSubscribed = ['member', 'administrator', 'creator'].includes(member1.status) && 
                         ['member', 'administrator', 'creator'].includes(member2.status);

    if (!isSubscribed) {
        return ctx.reply("❌ Únete a los canales para participar.");
    }

    // 2. Revisar si el usuario ya existe en la base de datos
    let { data: user } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_telegram', userId)
        .single();

    if (!user) {
        // ES UN USUARIO NUEVO
        await supabase.from('usuarios').insert([
            { id_telegram: userId, referido_por: referrerId }
        ]);

        // Si fue referido por alguien, le pagamos al invitador
        if (referrerId && referrerId != userId) {
            // Sumar 0.01 al balance del invitador
            let { data: inviter } = await supabase
                .from('usuarios')
                .select('balance')
                .eq('id_telegram', referrerId)
                .single();

            if (inviter) {
                const nuevoBalance = inviter.balance + 0.01;
                await supabase
                    .from('usuarios')
                    .update({ balance: nuevoBalance })
                    .eq('id_telegram', referrerId);
                
                // Avisar al invitador (opcional)
                bot.telegram.sendMessage(referrerId, "💰 ¡Alguien se unió con tu link! Has ganado 0.01 TON.");
            }
        }
    }

    ctx.reply("✅ ¡Bienvenido! Usa el botón de abajo para ver tu balance.", {
        reply_markup: {
            inline_keyboard: [[{ text: "Abrir App", web_app: { url: "https://osmel115.github.io/Referidos-Bot-ton/" } }]]
        }
    });
});

bot.launch();
        
