const { Telegraf } = require('telegraf');

// REEMPLAZA ESTOS DATOS
const bot = new Telegraf('TU_TOKEN_DE_BOTFATHER');
const CANAL_1 = '@tu_canal_1'; // Reemplaza con tus canales
const CANAL_2 = '@tu_canal_2';
const APP_URL = 'https://osmel115.github.io/Referidos-Bot-ton/';

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const referrerId = ctx.payload; // Aquí llega el ID del que invitó

    try {
        // 1. Verificar si el usuario está unido a los 2 canales
        const member1 = await ctx.telegram.getChatMember(CANAL_1, userId);
        const member2 = await ctx.telegram.getChatMember(CANAL_2, userId);

        const isSubscribed = ['member', 'administrator', 'creator'].includes(member1.status) && 
                             ['member', 'administrator', 'creator'].includes(member2.status);

        if (!isSubscribed) {
            return ctx.reply(`⚠️ Para usar la app, debes unirte a nuestros canales:\n1. ${CANAL_1}\n2. ${CANAL_2}\n\n¡Luego pulsa /start de nuevo!`);
        }

        // 2. Lógica de Referidos (Simulada hasta conectar DB)
        if (referrerId && referrerId != userId) {
            console.log(`Usuario ${userId} referido por ${referrerId}`);
            // AQUÍ IRÁ LA LÓGICA DE SUMAR 0.01 TON EN LA BASE DE DATOS
        }

        // 3. Botón para abrir la Mini App
        ctx.reply('✅ Verificación exitosa. ¡Bienvenido!', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🚀 Abrir Panel de TON", web_app: { url: APP_URL } }]
                ]
            }
        });

    } catch (error) {
        console.error("Error en el start:", error);
        ctx.reply("Hubo un error al verificar los canales. Asegúrate de que el bot sea administrador de los canales.");
    }
});

bot.launch();
