require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');

// إعدادات البيئة
const TOKEN = process.env.s;
const RENDER_URL = process.env.r;

if (!TOKEN || !RENDER_URL) {
    console.error('Error: Missing environment variables');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {polling: true});
const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء مجلد مؤقت لصور QR
if (!fs.existsSync('./temp')) {
    fs.mkdirSync('./temp');
}

app.use(express.static(__dirname));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// واجهة الأزرار الرئيسية (ماردكون)
const mainMenu = {
    reply_markup: {
        inline_keyboard: [
            [
                {text: 'توليد الصور 🖼', callback_data: 'generate_image'},
                {text: 'معلومات انستا 📷', callback_data: 'instagram_info'}
            ],
            [
                {text: 'معلومات تيك توك 🎵', callback_data: 'tiktok_info'},
                {text: 'ترجمة 🌐', callback_data: 'translation'}
            ],
            [
                {text: 'مواقع ويب 📲', callback_data: 'web_sites'},
                {text: 'إنشاء QR كود', callback_data: 'create_qr'}
            ],
            [
                {text: 'قراءة QR كود', callback_data: 'read_qr'},
                {text: 'موقع تلجرام 📨', callback_data: 'telegram_site'}
            ]
        ]
    }
};

// معالجة أمر /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'مرحباً! اختر الخدمة التي تريدها:', mainMenu);
});

// معالجة الضغط على الأزرار
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id;

    try {
        switch(data) {
            case 'generate_image':
                await bot.sendMessage(chatId, 'أرسل وصف الصورة التي تريد توليدها...');
                bot.once('message', async (msg) => {
                    if (msg.text) {
                        const response = await axios.post('https://ai-api.magicstudio.com/api/ai-art-generator', {
                            prompt: msg.text
                        });
                        if (response.data?.url) {
                            bot.sendPhoto(chatId, response.data.url);
                        }
                    }
                });
                break;

            case 'instagram_info':
                await bot.sendMessage(chatId, 'أرسل اسم مستخدم انستجرام...');
                bot.once('message', (msg) => {
                    bot.sendMessage(chatId, `جاري جلب معلومات ${msg.text}...`);
                });
                break;

            case 'tiktok_info':
                await bot.sendMessage(chatId, 'أرسل اسم مستخدم تيك توك...');
                bot.once('message', (msg) => {
                    bot.sendMessage(chatId, `جاري جلب معلومات ${msg.text}...`);
                });
                break;

            case 'translation':
                await bot.sendMessage(chatId, 'أرسل النص الذي تريد ترجمته...');
                bot.once('message', async (msg) => {
                    const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(msg.text)}&langpair=en|ar`);
                    bot.sendMessage(chatId, response.data?.responseData?.translatedText || 'حدث خطأ في الترجمة');
                });
                break;

            case 'web_sites':
                const sitesMenu = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: 'تشفير HTML', web_app: {url: 'https://roxhtml.pages.dev'}},
                                {text: 'بلاغات تيك توك', web_app: {url: 'https://tiktok.com'}}
                            ],
                            [
                                {text: 'موقع ويب', web_app: {url: 'https://ddos7.pages.dev/'}},
                                {text: 'ذكاء اصطناعي', web_app: {url: 'http://nikai.pages.dev'}}
                            ],
                            [{text: 'رجوع', callback_data: 'back_to_main'}]
                        ]
                    }
                };
                await bot.sendMessage(chatId, 'اختر موقع الويب:', sitesMenu);
                break;

            case 'create_qr':
                await bot.sendMessage(chatId, 'أرسل النص أو الرابط لإنشاء QR كود...');
                bot.once('message', async (msg) => {
                    const qrPath = `./temp/qr_${userId}.png`;
                    await QRCode.toFile(qrPath, msg.text);
                    await bot.sendPhoto(chatId, qrPath);
                    fs.unlinkSync(qrPath);
                });
                break;

            case 'read_qr':
                await bot.sendMessage(chatId, 'أرسل صورة QR كود لقراءتها...');
                break;

            case 'telegram_site':
                const userLink = `${RENDER_URL}/telegram/${userId}`;
                await bot.sendMessage(chatId, `رابطك الخاص:\n${userLink}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{text: 'فتح الموقع', web_app: {url: userLink}}]
                        ]
                    }
                });
                break;

            case 'back_to_main':
                await bot.sendMessage(chatId, 'اختر الخدمة التي تريدها:', mainMenu);
                break;
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة طلبك');
    }
});

// معالجة إرسال الصور (لقراءة QR)
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    
    // هنا يجب إضافة كود لقراءة QR من الصورة
    // يمكن استخدام مكتبة مثل qrcode-reader
    
    bot.sendMessage(chatId, 'جاري قراءة QR كود...');
});

console.log('Bot is running...');
