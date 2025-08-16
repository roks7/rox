require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const TOKEN = process.env.BOT_TOKEN;
const RENDER_URL = process.env.RENDER_URL;
const bot = new TelegramBot(TOKEN, {polling: true});
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.listen(PORT, () => console.log('Bot server running'));

// المواقع المدمجة
const sites = [
  {name: 'ذكاء اصطناعي 🧠', url: 'http://nikai.pages.dev'},
  {name: 'قرآن كريم 📖', url: 'https://quran7.pages.dev'},
  {name: 'ترجمة متعددة 🌐', url: 'http://transla.pages.dev'},
  {name: 'متجر القراصنة 🏴‍☠️', url: 'https://roks2.pages.dev'},
  {name: 'معلومات IP 🔍', url: 'https://roxip.pages.dev'}
];

// لوحة المفاتيح الرئيسية
const mainMenu = {
  reply_markup: {
    inline_keyboard: [
      [{text: 'توليد الصور 🖼️', callback_data: 'gen_image'}],
      [{text: 'معلومات انستا 📷', callback_data: 'insta_info'}],
      [{text: 'مواقع ويب 📲', callback_data: 'show_sites'}],
      [{text: 'رابطي الخاص 🔗', callback_data: 'my_link'}]
    ]
  }
};

// معالجة /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'مرحباً! اختر خدمة:', mainMenu);
});

// معالجة الأزرار
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  try {
    switch(query.data) {
      case 'gen_image':
        await bot.sendMessage(chatId, 'أرسل وصف الصورة...');
        bot.once('message', async (msg) => {
          const res = await axios.post('https://ai-api.magicstudio.com/api/ai-art-generator', {
            prompt: msg.text
          });
          if (res.data?.url) bot.sendPhoto(chatId, res.data.url);
        });
        break;

      case 'show_sites':
        const sitesKeyboard = {
          reply_markup: {
            inline_keyboard: [
              ...sites.map(site => [{text: site.name, web_app: {url: site.url}}]),
              [{text: 'رجوع', callback_data: 'back'}]
            ]
          }
        };
        bot.sendMessage(chatId, 'اختر موقعاً:', sitesKeyboard);
        break;

      case 'my_link':
        const personalLink = `${RENDER_URL}/tele.html/${userId}`;
        bot.sendMessage(chatId, `رابطك الخاص:\n${personalLink}`, {
          reply_markup: {
            inline_keyboard: [[{text: 'فتح الرابط', web_app: {url: personalLink}]]
          }
        });
        break;

      case 'back':
        bot.sendMessage(chatId, 'اختر خدمة:', mainMenu);
        break;
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, 'حدث خطأ! حاول لاحقاً');
  }
});

console.log('Bot is ready 🚀');
