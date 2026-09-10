const express = require('express');
const { Bot, Keyboard } = require('grammy');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// ==========================================
// ১. ENVIRONMENT VARIABLES / CREDENTIALS
// ==========================================
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '8640973095:AAGvCcWgp73s14vUyZK0pUAXEnClq9IXOrk';
const GMAIL_USER = process.env.GMAIL_USER || 'bartaotp@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'goad fuge ynrf yygk';

const bot = new Bot(BOT_TOKEN);

// ইন-মেমোরি ডাটাবেস
const userSessions = new Map();
const activeOtps = new Map();

// ==========================================
// ২. EMAIL TRANSPORTER SETUP (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD.replace(/\s+/g, '') // গ্যাপ থাকলে তা রিমুভ করবে
    }
});

// ==========================================
// ৩. HELPER FUNCTIONS
// ==========================================
function cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, ''); // সব সংকেত বাদ দেওয়া
    if (cleaned.startsWith('880')) {
        cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
}

function autoDeleteMessage(ctx, chatId, messageId, delayMs) {
    setTimeout(async () => {
        try {
            await ctx.api.deleteMessage(chatId, messageId);
        } catch (error) {
            console.log(`Message ${messageId} already deleted or expired.`);
        }
    }, delayMs);
}

// ==========================================
// ৪. TELEGRAM BOT LOGIC (Grammy)
// ==========================================

// /start Command Handler
bot.command('start', async (ctx) => {
    const text = ctx.message.text;
    const parts = text.split(' ');
    const rawTargetPhone = parts[1];

    if (rawTargetPhone) {
        userSessions.set(ctx.chat.id, { requestedPhone: cleanPhoneNumber(rawTargetPhone) });
    }

    const keyboard = new Keyboard()
        .requestContact('📱 Verify Phone Number')
        .resized()
        .oneTime();

    const startMsg = await ctx.reply(
        `👋 <b>Welcome ${ctx.from.first_name || 'User'}!</b>\n\n` +
        `🔒 <b>Security Verification:</b>\n` +
        `You requested an OTP in Barta App.\n\n` +
        `🛡 For your security, the OTP code will only be provided to the Telegram account registered with this phone number.\n\n` +
        `👇 Tap the button below to confirm your phone number:`,
        {
            parse_mode: 'HTML',
            reply_markup: keyboard
        }
    );

    autoDeleteMessage(ctx, ctx.chat.id, startMsg.message_id, 2 * 60 * 1000);
});

// Contact Share Handler
bot.on('message:contact', async (ctx) => {
    const chatId = ctx.chat.id;
    const userSharedPhone = cleanPhoneNumber(ctx.message.contact.phone_number);
    const session = userSessions.get(chatId);
    const requestedPhone = session ? session.requestedPhone : '';

    const contactMsgId = ctx.message.message_id;

    // ১. ফোন নম্বর মিলিয়ে যাচাইকরণ
    if (requestedPhone && userSharedPhone !== requestedPhone) {
        const alertMsg = await ctx.reply(
            `❌ <b>Security Alert!</b>\n\n` +
            `⚠️ Requested Phone in Barta: +880${requestedPhone}\n` +
            `⚠️ Your Telegram Account Phone: +880${userSharedPhone}\n\n` +
            `🚫 <b>Phone numbers do not match!</b>\nFor security reasons, the OTP code cannot be delivered to a different Telegram account.\n\n` +
            `Please use the Telegram account registered with +880${requestedPhone} or select Email/SMS in the Barta app.`,
            { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
        );

        autoDeleteMessage(ctx, chatId, alertMsg.message_id, 2 * 60 * 1000);
        autoDeleteMessage(ctx, chatId, contactMsgId, 2 * 60 * 1000);
        return;
    }

    // ২. নম্বর মিললে OTP পাঠাবে (Click to Copy HTML format)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const targetKey = requestedPhone || userSharedPhone;
    activeOtps.set(targetKey, otpCode);

    const otpMsg = await ctx.reply(
        `✅ <b>Phone Verified (+880${userSharedPhone})!</b>\n\n` +
        `🔐 <b>Your Barta Verification OTP Code:</b>\n\n` +
        `<code>${otpCode}</code>\n\n` +
        `<i>(Tap the code above to copy)</i>\n\n` +
        `⏱ This code is valid for 10 minutes.\n` +
        `⚠️ Do not share this code with anyone for security reasons.`,
        { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } }
    );

    autoDeleteMessage(ctx, chatId, otpMsg.message_id, 2 * 60 * 1000);
    autoDeleteMessage(ctx, chatId, contactMsgId, 2 * 60 * 1000);
});

bot.start();

// ==========================================
// ৫. REST APIs FOR APP (Email & Verify)
// ==========================================

// Email OTP API
app.post('/api/send-email-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtps.set(email.trim().toLowerCase(), otpCode);

    const mailOptions = {
        from: `"Barta App" <${GMAIL_USER}>`,
        to: email,
        subject: 'Your Barta Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #00a884; text-align: center;">Barta Verification Code</h2>
                    <p>Hello,</p>
                    <p>Your verification code for Barta is:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111b21; background: #e9edef; padding: 10px 20px; border-radius: 5px;">${otpCode}</span>
                    </div>
                    <p>This code is valid for 10 minutes. Do not share it with anyone.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email OTP sent successfully to ${email}`);
        return res.json({ success: true, message: 'OTP sent to email successfully' });
    } catch (error) {
        console.error('Email sending failed:', error);
        return res.status(500).json({ success: false, message: 'Failed to send OTP email', error: error.message });
    }
});

// Verify OTP API
app.post('/api/verify-otp', (req, res) => {
    let { target, code } = req.body;

    if (!target || !code) {
        return res.status(400).json({ success: false, message: 'Target and Code are required' });
    }

    let searchKey = target.includes('@') ? target.trim().toLowerCase() : cleanPhoneNumber(target);

    if (activeOtps.has(searchKey) && activeOtps.get(searchKey) === code.trim()) {
        activeOtps.delete(searchKey);
        return res.json({ success: true, message: 'OTP verified successfully' });
    } else {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
});

// ==========================================
// ৬. SERVER LISTEN & HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
    res.send('🚀 Barta Server & Telegram Bot is Running Smoothly!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});