require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

// Get environment variables
const TOKEN = process.env.s; // Bot token
const RENDER_URL = process.env.r; // Project URL

if (!TOKEN || !RENDER_URL) {
    console.error('Error: Missing required environment variables');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {polling: true});

// Create Express app for web views
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files (including your tele.html)
app.use(express.static(__dirname));

// Start the web server
app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            keyboard: [
                [{text: 'توليد الصور 🖼️'}],
                [{text: 'معلومات انستا 📷'}, {text: 'معلومات تيك توك 🎵'}],
                [{text: 'ترجمة 🌐'}],
                [{text: 'مواقع ويب 📲'}],
                [{text: 'تلجرام 📨'}]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
    
    bot.sendMessage(chatId, 'مرحباً! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:', options);
});

// Handle button clicks
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    try {
        if (text === 'توليد الصور 🖼️') {
            bot.sendMessage(chatId, 'أرسل لي وصف الصورة التي تريد توليدها...');
            bot.once('message', async (msg) => {
                const prompt = msg.text;
                try {
                    const response = await axios.post('https://ai-api.magicstudio.com/api/ai-art-generator', {
                        prompt: prompt
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.data && response.data.url) {
                        bot.sendPhoto(chatId, response.data.url);
                    } else {
                        bot.sendMessage(chatId, 'عذراً، لم أتمكن من توليد الصورة. حاول مرة أخرى.');
                    }
                } catch (error) {
                    console.error(error);
                    bot.sendMessage(chatId, 'حدث خطأ أثناء توليد الصورة. حاول مرة أخرى لاحقاً.');
                }
            });
        }
        else if (text === 'معلومات انستا 📷') {
            bot.sendMessage(chatId, 'أرسل لي اسم المستخدم على انستجرام...');
            bot.once('message', async (msg) => {
                const username = msg.text;
                // In a real implementation, you would call an Instagram API here
                bot.sendMessage(chatId, `معلومات انستجرام لـ ${username}:\n(هذه خدمة وهمية لأغراض التوضيح)`);
            });
        }
        else if (text === 'معلومات تيك توك 🎵') {
            bot.sendMessage(chatId, 'أرسل لي اسم المستخدم على تيك توك...');
            bot.once('message', async (msg) => {
                const username = msg.text;
                // In a real implementation, you would call a TikTok API here
                bot.sendMessage(chatId, `معلومات تيك توك لـ ${username}:\n(هذه خدمة وهمية لأغراض التوضيح)`);
            });
        }
        else if (text === 'ترجمة 🌐') {
            bot.sendMessage(chatId, 'أرسل لي النص الذي تريد ترجمته...');
            bot.once('message', async (msg) => {
                const textToTranslate = msg.text;
                try {
                    const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|ar`);
                    
                    if (response.data && response.data.responseData) {
                        bot.sendMessage(chatId, `الترجمة: ${response.data.responseData.translatedText}`);
                    } else {
                        bot.sendMessage(chatId, 'عذراً، لم أتمكن من ترجمة النص. حاول مرة أخرى.');
                    }
                } catch (error) {
                    console.error(error);
                    bot.sendMessage(chatId, 'حدث خطأ أثناء الترجمة. حاول مرة أخرى لاحقاً.');
                }
            });
        }
        else if (text === 'مواقع ويب 📲') {
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: 'تشفير HTML', url: 'https://roxhtml.pages.dev'},
                            {text: 'بلاغات تيك توك', url: 'https://tiktok.com'}
                        ],
                        [
                            {text: 'موقع ويب', url: 'https://ddos7.pages.dev/'},
                            {text: 'ذكاء اصطناعي', url: 'http://nikai.pages.dev'}
                        ]
                    ]
                }
            };
            bot.sendMessage(chatId, 'اختر موقع الويب الذي تريد زيارته:', options);
        }
        else if (text === 'تلجرام 📨') {
            // Send the link to your tele.html file
            const webAppUrl = `${RENDER_URL}/tele.html`;
            bot.sendMessage(chatId, `يمكنك الوصول إلى موقع تلجرام من هنا:\n${webAppUrl}`);
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى لاحقاً.');
    }
});

console.log('Bot is running...');
