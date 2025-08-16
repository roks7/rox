require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');

// إعدادات البيئة
const TOKEN = process.env.BOT_TOKEN;
const RENDER_URL = process.env.RENDER_URL;

const bot = new TelegramBot(TOKEN, {polling: true});
const app = express();
const PORT = process.env.PORT || 3000;

// إنشاء مجلد مؤقت لصور QR
if (!fs.existsSync('./temp')) {
    fs.mkdirSync('./temp');
}

app.use(express.static(__dirname));
app.listen(PORT, () => console.log('Bot is running...'));

// جميع الخدمات والمواقع
const services = {
    // الخدمات الأصلية
    image_generation: {
        name: 'توليد الصور 🖼️',
        handler: async (chatId) => {
            await bot.sendMessage(chatId, 'أرسل وصف الصورة التي تريد توليدها...');
            bot.once('message', async (msg) => {
                const response = await axios.post('https://ai-api.magicstudio.com/api/ai-art-generator', {
                    prompt: msg.text
                });
                if (response.data?.url) {
                    bot.sendPhoto(chatId, response.data.url);
                }
            });
        }
    },
    instagram_info: {
        name: 'معلومات انستا 📷',
        handler: (chatId) => {
            bot.sendMessage(chatId, 'أرسل اسم مستخدم انستجرام...');
            bot.once('message', (msg) => {
                bot.sendMessage(chatId, `جاري جلب معلومات ${msg.text}...`);
            });
        }
    },
    tiktok_info: {
        name: 'معلومات تيك توك 🎵',
        handler: (chatId) => {
            bot.sendMessage(chatId, 'أرسل اسم مستخدم تيك توك...');
            bot.once('message', (msg) => {
                bot.sendMessage(chatId, `جاري جلب معلومات ${msg.text}...`);
            });
        }
    },
    translation: {
        name: 'ترجمة 🌐',
        handler: async (chatId) => {
            await bot.sendMessage(chatId, 'أرسل النص الذي تريد ترجمته...');
            bot.once('message', async (msg) => {
                const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(msg.text)}&langpair=en|ar`);
                bot.sendMessage(chatId, response.data?.responseData?.translatedText || 'حدث خطأ في الترجمة');
            });
        }
    },
    qr_create: {
        name: 'إنشاء QR كود',
        handler: async (chatId, userId) => {
            await bot.sendMessage(chatId, 'أرسل النص أو الرابط لإنشاء QR كود...');
            bot.once('message', async (msg) => {
                const qrPath = `./temp/qr_${userId}.png`;
                await QRCode.toFile(qrPath, msg.text);
                await bot.sendPhoto(chatId, qrPath);
                fs.unlinkSync(qrPath);
            });
        }
    },
    qr_read: {
        name: 'قراءة QR كود',
        handler: (chatId) => {
            bot.sendMessage(chatId, 'أرسل صورة QR كود لقراءتها...');
        }
    },

    // المواقع الجديدة (تفتح داخل البوت)
    nikai: {
        name: 'ذكاء اصطناعي 🧠',
        url: 'http://nikai.pages.dev'
    },
    quran: {
        name: 'قرآن كريم 📖',
        url: 'https://quran7.pages.dev'
    },
    translator: {
        name: 'ترجمة متعددة 🌐',
        url: 'http://transla.pages.dev'
    },
    hacker_shop: {
        name: 'متجر القراصنة 🏴‍☠️',
        url: 'https://roks2.pages.dev'
    },
    ip_info: {
        name: 'جلب معلومات IP 🔍',
        url: 'https://roxip.pages.dev'
    },
    personal_site: {
        name: 'موقعك الخاص 🔗',
        url: `${RENDER_URL}/tele.html`
    }
};

// إنشاء لوحة المفاتيح الرئيسية
function createMainKeyboard() {
    const keyboard = [];
    const allServices = Object.entries(services);
    
    // إضافة الخدمات الأصلية
    for (let i = 0; i < 6; i += 2) {
        const row = allServices.slice(i, i + 2).map(([key, service]) => ({
            text: service.name,
            callback_data: key
        }));
        keyboard.push(row);
    }
    
    // إضافة المواقع الجديدة
    for (let i = 6; i < allServices.length; i += 2) {
        const row = allServices.slice(i, i + 2).map(([key, service]) => ({
            text: service.name,
            web_app: {url: service.url}
        }));
        keyboard.push(row);
    }
    
    // زر الرابط المخصص
    keyboard.push([{
        text: 'رابطك المخصص ✨',
        callback_data: 'personal_link'
    }]);
    
    return {inline_keyboard: keyboard};
}

// معالجة /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, '🚀 مرحباً! اختر من الخدمات التالية:', {
        reply_markup: createMainKeyboard()
    });
});

// معالجة الضغط على الأزرار
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (data === 'personal_link') {
        const personalLink = `${RENDER_URL}/tele.html/${userId}`;
        bot.sendMessage(chatId, `🔗 هذا هو رابطك المخصص:\n${personalLink}`, {
            reply_markup: {
                inline_keyboard: [[{
                    text: 'فتح الرابط',
                    web_app: {url: personalLink}
                }]]
            }
        });
    } 
    else if (services[data]) {
        if (services[data].handler) {
            services[data].handler(chatId, userId);
        } 
        else if (services[data].url) {
            // المواقع تفتح تلقائيًا عبر web_app
        }
    }
});

// معالجة إرسال الصور (لقراءة QR)
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'جاري قراءة QR كود...');
});

console.log('✅ البوت يعمل بنجاح!');
