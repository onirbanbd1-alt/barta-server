const express = require('express');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

// Render.com অটোমেটিক পোর্ট অ্যাসাইন করে, লোকালের জন্য ৩০০০ পোর্ট রাখা হলো
const PORT = process.env.PORT || 3000;

// ১. Nodemailer ট্রান্সপোর্টার কনফিগারেশন (আপনার জিমেইল এবং অ্যাপ পাসওয়ার্ড এখানে থাকবে)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bartaotp@gmail.com',         // আপনার জিমেইল
        pass: 'YOUR_16_DIGIT_APP_PASSWORD' // জিমেইলের App Password এখানে বসাবেন
    }
});

// সার্ভার লাইভ আছে কিনা চেক করার রুট
app.get('/', (req, res) => {
    res.send('Barta Email OTP Server is running successfully!');
});

// ২. ইমেইল ওটিপি পাঠানোর এপিআই রাউট
app.post('/api/send-otp', async (req, res) => {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
        return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
    }

    // আপনার কাঙ্ক্ষিত এইচটিএমপি ইমেইল টেমপ্লেট (ছবির ডিজাইন অনুযায়ী)
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Barta Verification Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e0e0e0;">
            
            <!-- Top Green Header -->
            <div style="background-color: #10B981; padding: 30px 20px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Barta Messenger</h1>
                <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Secure Account Verification</p>
            </div>

            <!-- Body Content -->
            <div style="padding: 30px; text-align: center; color: #333333;">
                <p style="font-size: 14px; color: #555555; line-height: 1.5;">
                    Use the following one-time password (OTP) to sign in to your Barta account:
                </p>

                <!-- OTP Box -->
                <div style="margin: 25px auto; padding: 15px 25px; display: inline-block; background-color: #E8F8F5; border: 1px dashed #10B981; border-radius: 8px;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #10B981;">${otpCode}</span>
                </div>

                <p style="font-size: 12px; color: #666666; margin-top: 20px;">
                    ⏰ This code is valid for <strong>10 minutes</strong>.
                </p>
                <p style="font-size: 11px; color: #999999; margin-top: 10px;">
                    If you did not request this code, you can safely ignore this email.
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 11px; color: #888888;">© 2026 Barta Messenger. All rights reserved.</p>
            </div>

        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: '"Barta Messenger" <bartaotp@gmail.com>',
        to: email,
        subject: `🔒 Your Barta verification code is ${otpCode}`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});

// সার্ভার স্টার্ট করা
app.listen(PORT, () => {
    console.log(`Barta Email Server is running on port ${PORT}`);
});
