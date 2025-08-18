require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RENDER_URL = process.env.RENDER_URL || `https://${process.env.RENDER_INSTANCE}.onrender.com`;
const PORT = process.env.PORT || 3000;

// إنشاء تطبيق Express
const app = express();

// تهيئة بوت Telegram
const bot = new TelegramBot(TOKEN, {polling: true});

// Middleware لتحليل JSON
app.use(express.json());
app.use(express.static('public'));

// تقديم ملف tele.html معدل حسب المستخدم
app.get('/tele/:userId', (req, res) => {
    const userId = req.params.userId;
    
    fs.readFile(path.join(__dirname, 'tele.html'), 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error loading the page');
        }
        
        const modifiedHtml = data.replace(/USER_ID_PLACEHOLDER/g, userId);
        res.send(modifiedHtml);
    });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Telegram bot is running with token: ${TOKEN?.substring(0, 5)}...`);
    console.log(`Render URL: ${RENDER_URL}`);
});

// معالجة أمر /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const options = {
        reply_markup: {
            keyboard: [
                [{text: 'توليد الصور 🖼️'}],
                [{text: 'معلومات انستا 📷'}, {text: 'معلومات تيك توك 🎵'}],
                [{text: 'ترجمة نص 🌐'}],
                [{text: 'المواقع المصغرة 🖥️'}],
                [{text: 'فتح موقع ويب 🌍'}]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
    
    bot.sendMessage(chatId, 'مرحباً! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:', options);
});

// معالجة الأزرار
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;

    try {
        if (text === 'توليد الصور 🖼️') {
            bot.sendMessage(chatId, 'أرسل لي وصف الصورة التي تريد توليدها وسأقوم بإنشائها لك.');
            
            bot.once('message', async (msg) => {
                if (msg.text && !msg.text.startsWith('/')) {
                    const description = msg.text;
                    try {
                        const response = await axios.post('https://ai-api.magicstudio.com/api/ai-art-generator', {
                            prompt: description
                        }, {
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (response.data && response.data.url) {
                            bot.sendPhoto(chatId, response.data.url);
                        } else {
                            bot.sendMessage(chatId, 'عذرًا، لم أتمكن من توليد الصورة. يرجى المحاولة مرة أخرى.');
                        }
                    } catch (error) {
                        console.error(error);
                        bot.sendMessage(chatId, 'حدث خطأ أثناء محاولة توليد الصورة. يرجى المحاولة مرة أخرى.');
                    }
                }
            });
        }
        else if (text === 'معلومات انستا 📷') {
            bot.sendMessage(chatId, 'أرسل لي اسم مستخدم انستجرام وسأحاول جلب المعلومات عنه.');
            
            bot.once('message', async (msg) => {
                if (msg.text && !msg.text.startsWith('/')) {
                    const username = msg.text;
                    try {
                        // استبدل هذا بـ API حقيقي
                        const response = await axios.get(`https://some-instagram-api.com/api/user?username=${username}`);
                        
                        if (response.data) {
                            const info = `
معلومات انستجرام:
الاسم: ${response.data.full_name}
اسم المستخدم: ${response.data.username}
المتابعون: ${response.data.followers}
يتابع: ${response.data.following}
المنشورات: ${response.data.posts}
                            `;
                            bot.sendMessage(chatId, info);
                        } else {
                            bot.sendMessage(chatId, 'عذرًا، لم أتمكن من العثور على معلومات لهذا المستخدم.');
                        }
                    } catch (error) {
                        console.error(error);
                        bot.sendMessage(chatId, 'حدث خطأ أثناء محاولة جلب المعلومات. يرجى المحاولة مرة أخرى.');
                    }
                }
            });
        }
        else if (text === 'معلومات تيك توك 🎵') {
            bot.sendMessage(chatId, 'أرسل لي اسم مستخدم تيك توك وسأحاول جلب المعلومات عنه.');
            
            bot.once('message', async (msg) => {
                if (msg.text && !msg.text.startsWith('/')) {
                    const username = msg.text;
                    try {
                        // استبدل هذا بـ API حقيقي
                        const response = await axios.get(`https://some-tiktok-api.com/api/user?username=${username}`);
                        
                        if (response.data) {
                            const info = `
معلومات تيك توك:
الاسم: ${response.data.nickname}
اسم المستخدم: ${response.data.unique_id}
المتابعون: ${response.data.followers}
يتابع: ${response.data.following}
الإعجابات: ${response.data.likes}
                            `;
                            bot.sendMessage(chatId, info);
                        } else {
                            bot.sendMessage(chatId, 'عذرًا، لم أتمكن من العثور على معلومات لهذا المستخدم.');
                        }
                    } catch (error) {
                        console.error(error);
                        bot.sendMessage(chatId, 'حدث خطأ أثناء محاولة جلب المعلومات. يرجى المحاولة مرة أخرى.');
                    }
                }
            });
        }
        else if (text === 'ترجمة نص 🌐') {
            bot.sendMessage(chatId, 'أرسل لي النص الذي تريد ترجمته وسأحاول ترجمته لك.');
            
            bot.once('message', async (msg) => {
                if (msg.text && !msg.text.startsWith('/')) {
                    const textToTranslate = msg.text;
                    try {
                        const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|ar`);
                        
                        if (response.data && response.data.responseData) {
                            bot.sendMessage(chatId, `الترجمة: ${response.data.responseData.translatedText}`);
                        } else {
                            bot.sendMessage(chatId, 'عذرًا، لم أتمكن من ترجمة النص. يرجى المحاولة مرة أخرى.');
                        }
                    } catch (error) {
                        console.error(error);
                        bot.sendMessage(chatId, 'حدث خطأ أثناء محاولة الترجمة. يرجى المحاولة مرة أخرى.');
                    }
                }
            });
        }
        else if (text === 'المواقع المصغرة 🖥️') {
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: 'تشفير HTML', callback_data: 'site_1'},
                            {text: 'بلاغات تيك توك', callback_data: 'site_2'}
                        ],
                        [
                            {text: 'موقع ويب', callback_data: 'site_3'},
                            {text: 'ذكاء اصطناعي', callback_data: 'site_4'}
                        ]
                    ]
                }
            };
            
            bot.sendMessage(chatId, 'اختر أحد المواقع المصغرة:', options);
        }
        else if (text === 'فتح موقع ويب 🌍') {
            const webAppUrl = `${RENDER_URL}/tele/${userId}`;
            bot.sendMessage(chatId, `يمكنك الوصول إلى موقع الويب الخاص بك عبر هذا الرابط:\n${webAppUrl}`);
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, 'حدث خطأ ما. يرجى المحاولة مرة أخرى.');
    }
});

// معالجة اختيارات المواقع المصغرة
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    try {
        if (data === 'site_1') {
            await bot.sendMessage(chatId, 'موقع تشفير HTML:\nhttps://roxhtml.pages.dev');
        }
        else if (data === 'site_2') {
            await bot.sendMessage(chatId, 'بلاغات تيك توك:\nhttps://repotik.pages.dev/');
        }
        else if (data === 'site_3') {
            await bot.sendMessage(chatId, 'موقع ويب:\nhttps://ddos7.pages.dev/');
        }
        else if (data === 'site_4') {
            await bot.sendMessage(chatId, 'ذكاء اصطناعي:\nhttp://nikai.pages.dev');
        }
        
        await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
        console.error(error);
        await bot.sendMessage(chatId, 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.');
    }
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
