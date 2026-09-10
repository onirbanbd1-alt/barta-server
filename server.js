const express = require('express');
const { Bot, Keyboard } = require('grammy');

const app = express();
app.use(express.json());

// Express root route testing
app.get('/', (req, res) => {
    res.send('🚀 Barta Server & Telegram Bot is Running Smoothly!');
});

// Telegram Bot Setup
const BOT_TOKEN = '8640973095:AAGvCcWgp73s14vUyZK0pUAXEnClq9IXOrk';
const bot = new Bot(BOT_TOKEN);

const userSessions = new Map();

// 1. /start Command Handling
bot.command('start', async (ctx) => {
    const text = ctx.message.text;
    const parts = text.split(' ');
    const targetPhone = parts[1];

    if (!targetPhone) {
        return ctx.reply(
            `👋 *Welcome ${ctx.from.first_name}!*\n\nThis is the *Barta OTP Verification Bot*.\n\nPlease request an OTP from the Barta App or pass your phone number with the start command (e.g., \`/start +8801XXXXXXXXX\`).`,
            { parse_mode: 'Markdown' }
        );
    }

    userSessions.set(ctx.chat.id, { requestedPhone: targetPhone });

    const keyboard = new Keyboard()
        .requestContact('📱 Verify Phone Number')
        .resized()
        .oneTime();

    await ctx.reply(
        `👋 *Welcome ${ctx.from.first_name}!*\n\n🔒 *Security Verification:*\nYou requested an OTP for *${targetPhone}* in Barta App.\n\n👇 Tap the button below to confirm your phone number:`,
        {
            parse_mode: 'Markdown',
            reply_markup: keyboard,
        }
    );
});

// 2. Contact Share Handling
bot.on('message:contact', async (ctx) => {
    const chatId = ctx.chat.id;
    let telegramPhone = ctx.message.contact.phone_number;

    if (!telegramPhone.startsWith('+')) {
        telegramPhone = '+' + telegramPhone;
    }

    const session = userSessions.get(chatId);
    const requestedPhone = session ? session.requestedPhone : null;

    if (!requestedPhone || telegramPhone !== requestedPhone) {
        await ctx.reply(
            `❌ *Security Alert!*\n\n⚠️ Requested Phone: \`${requestedPhone || 'Not Found'}\`\n⚠️ Telegram Phone: \`${telegramPhone}\`\n\n🚫 *Phone numbers do not match!*`,
            { parse_mode: 'Markdown' }
        );
    } else {
        const otpCode = Math.floor(100000 + Math.random() * 900000);

        await ctx.reply(
            `✅ *Phone Verified (${telegramPhone})!*\n\n🔐 *Your Barta OTP Code:*\n\n👉 *${otpCode}*`,
            { parse_mode: 'Markdown' }
        );
    }
});

bot.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});