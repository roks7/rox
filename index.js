const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const QRCode = require('qrcode');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// تكوين البيئة
require('dotenv').config();
const PORT = process.env.PORT || 3000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ADMIN_ID = 6808883615; // ID الخاص بك

// تهيئة البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});

// تهيئة Express
const app = express();
app.use(bodyParser.json());

// مسار ويبhook
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// بدء الخادم
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ملف تخزين بيانات الأزرار
const DATA_FILE = 'buttons_data.json';

// تحميل بيانات الأزرار
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return { buttons: [] };
}

// حفظ بيانات الأزرار
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving data:', err);
    return false;
  }
}

// إنشاء لوحة المفاتيح من البيانات المحفوظة
function createKeyboard() {
  const data = loadData();
  const keyboard = {
    inline_keyboard: []
  };

  // إضافة الأزرار المحفوظة
  data.buttons.forEach(btn => {
    keyboard.inline_keyboard.push([
      {
        text: btn.name,
        web_app: { url: btn.url }
      }
    ]);
  });

  // إضافة أزرار الإدارة (للمشرف فقط)
  keyboard.inline_keyboard.push([
    { text: '➕ إضافة زر', callback_data: 'add_button' },
    { text: '🗑️ حذف أزرار', callback_data: 'delete_buttons' }
  ]);

  return keyboard;
}

// أوامر المطور المخفية
const developerCommands = {
  '/stats': 'إحصائيات البوت',
  '/broadcast': 'بث رسالة لجميع المستخدمين',
  '/logs': 'عرض سجلات النظام'
};

// أوامر المستخدم العادية
const userCommands = {
  '/start': 'بدء استخدام البوت',
  '/help': 'عرض المساعدة',
  '/barcode': 'إنشاء باركود من النص',
  '/readbarcode': 'قراءة باركود (رد على صورة باركود)',
  '/translate': 'ترجمة النص إلى لغات مختلفة',
  '/buttons': 'عرض الأزرار الديناميكية'
};

// تسجيل الأوامر في البوت
bot.setMyCommands([
  {command: 'start', description: 'بدء استخدام البوت'},
  {command: 'help', description: 'عرض المساعدة'},
  {command: 'barcode', description: 'إنشاء باركود من النص'},
  {command: 'readbarcode', description: 'قراءة باركود (رد على صورة باركود)'},
  {command: 'translate', description: 'ترجمة النص إلى لغات مختلفة'},
  {command: 'buttons', description: 'عرض الأزرار الديناميكية'}
]);

// لغات الترجمة المدعومة
const languages = {
  'ar': 'العربية',
  'en': 'الإنجليزية',
  'fr': 'الفرنسية',
  'es': 'الإسبانية',
  'de': 'الألمانية',
  'ru': 'الروسية',
  'zh': 'الصينية',
  'ja': 'اليابانية',
  'tr': 'التركية',
  'fa': 'الفارسية'
};

// معالجة أمر /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = msg.from.id === ADMIN_ID;
  
  let welcomeMsg = `مرحباً ${msg.from.first_name}!\n\nهذا بوت متعدد الوظائف يمكنه:\n- إنشاء وقراءة الباركود\n- ترجمة النصوص إلى لغات متعددة\n- إدارة أزرار ويب ديناميكية`;
  
  if (isAdmin) {
    welcomeMsg += '\n\nأوامر المطور المتاحة:';
    Object.keys(developerCommands).forEach(cmd => {
      welcomeMsg += `\n${cmd} - ${developerCommands[cmd]}`;
    });
  }
  
  bot.sendMessage(chatId, welcomeMsg);
});

// معالجة أمر /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = msg.from.id === ADMIN_ID;
  
  let helpMsg = 'الأوامر المتاحة:\n';
  Object.keys(userCommands).forEach(cmd => {
    helpMsg += `\n${cmd} - ${userCommands[cmd]}`;
  });
  
  if (isAdmin) {
    helpMsg += '\n\nأوامر المطور:';
    Object.keys(developerCommands).forEach(cmd => {
      helpMsg += `\n${cmd} - ${developerCommands[cmd]}`;
    });
  }
  
  bot.sendMessage(chatId, helpMsg);
});

// معالجة أمر /buttons لعرض الأزرار
bot.onText(/\/buttons/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "قائمة الأزرار المتاحة:",
    { reply_markup: createKeyboard() }
  );
});

// معالجة إنشاء الزر الجديد (للمشرف فقط)
let buttonData = {};

bot.onText(/\/addbutton/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  
  buttonData[msg.chat.id] = {};
  bot.sendMessage(
    msg.chat.id,
    "أرسل اسم الزر الجديد:",
    { reply_markup: { force_reply: true } }
  );
});

// معالجة الرد على اسم الزر
bot.on('reply_to_message', (msg) => {
  if (!msg.reply_to_message) return;
  
  const chatId = msg.chat.id;
  const isAdmin = msg.from.id === ADMIN_ID;
  
  if (!isAdmin) return;
  
  if (msg.reply_to_message.text === "أرسل اسم الزر الجديد:") {
    if (msg.text.length > 20) {
      return bot.sendMessage(chatId, "اسم الزر طويل جداً (الحد الأقصى 20 حرف)");
    }
    
    buttonData[chatId] = { name: msg.text };
    bot.sendMessage(
      chatId,
      "أرسل رابط الموقع للزر:",
      { reply_markup: { force_reply: true } }
    );
  } else if (msg.reply_to_message.text === "أرسل رابط الموقع للزر:") {
    let url = msg.text;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const data = loadData();
    data.buttons.push({
      name: buttonData[chatId].name,
      url: url
    });
    
    if (saveData(data)) {
      bot.sendMessage(
        chatId,
        "تمت إضافة الزر بنجاح!",
        { reply_markup: createKeyboard() }
      );
    } else {
      bot.sendMessage(chatId, "حدث خطأ أثناء حفظ الزر!");
    }
    
    delete buttonData[chatId];
  }
});

// معالجة حذف الأزرار
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const isAdmin = query.from.id === ADMIN_ID;
  
  if (data === 'add_button') {
    if (!isAdmin) {
      return bot.answerCallbackQuery(query.id, { text: "هذا الأمر للمشرف فقط!" });
    }
    
    buttonData[chatId] = {};
    bot.sendMessage(
      chatId,
      "أرسل اسم الزر الجديد:",
      { reply_markup: { force_reply: true } }
    );
    bot.answerCallbackQuery(query.id);
  } 
  else if (data === 'delete_buttons') {
    if (!isAdmin) {
      return bot.answerCallbackQuery(query.id, { text: "هذا الأمر للمشرف فقط!" });
    }
    
    const buttons = loadData().buttons;
    if (buttons.length === 0) {
      return bot.answerCallbackQuery(query.id, { text: "لا توجد أزرار للحذف!" });
    }
    
    const keyboard = {
      inline_keyboard: buttons.map((btn, idx) => [
        { text: `🗑️ ${btn.name}`, callback_data: `delete_${idx}` }
      ])
    };
    
    keyboard.inline_keyboard.push([
      { text: "الغاء", callback_data: "cancel" }
    ]);
    
    bot.editMessageText(
      "اختر الزر الذي تريد حذفه:",
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: keyboard
      }
    );
    bot.answerCallbackQuery(query.id);
  } 
  else if (data.startsWith('delete_')) {
    if (!isAdmin) {
      return bot.answerCallbackQuery(query.id, { text: "هذا الأمر للمشرف فقط!" });
    }
    
    const idx = parseInt(data.split('_')[1]);
    const dataObj = loadData();
    
    if (idx >= 0 && idx < dataObj.buttons.length) {
      const deletedName = dataObj.buttons[idx].name;
      dataObj.buttons.splice(idx, 1);
      saveData(dataObj);
      
      bot.editMessageText(
        `تم حذف الزر: ${deletedName}`,
        {
          chat_id: chatId,
          message_id: query.message.message_id
        }
      );
      bot.sendMessage(
        chatId,
        "قائمة الأزرار المحدثة:",
        { reply_markup: createKeyboard() }
      );
    } else {
      bot.answerCallbackQuery(query.id, { text: "خطأ في تحديد الزر" });
    }
  } 
  else if (data === 'cancel') {
    bot.deleteMessage(chatId, query.message.message_id);
    bot.answerCallbackQuery(query.id);
  }
  else if (data.startsWith('translate_')) {
    const parts = data.split('_');
    const targetLang = parts[1];
    const textToTranslate = decodeURIComponent(parts.slice(2).join('_'));
    
    try {
      const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|${targetLang}`);
      const translatedText = response.data.responseData.translatedText;
      
      bot.sendMessage(chatId, `الترجمة إلى ${languages[targetLang]}:\n\n${translatedText}`);
    } catch (error) {
      bot.sendMessage(chatId, 'حدث خطأ أثناء الترجمة. يرجى المحاولة لاحقاً.');
    }
    
    bot.answerCallbackQuery(query.id);
  }
});

// معالجة أمر إنشاء الباركود
bot.onText(/\/barcode (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  
  QRCode.toDataURL(text, (err, url) => {
    if (err) {
      return bot.sendMessage(chatId, 'حدث خطأ أثناء إنشاء الباركود');
    }
    
    bot.sendPhoto(chatId, url, {caption: `تم إنشاء الباركود للنص: ${text}`});
  });
});

// معالجة أمر قراءة الباركود
bot.onText(/\/readbarcode/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!msg.reply_to_message || !msg.reply_to_message.photo) {
    return bot.sendMessage(chatId, 'يرجى الرد على صورة الباركود باستخدام الأمر /readbarcode');
  }
  
  bot.sendMessage(chatId, 'قراءة الباركود غير متاحة حالياً. هذه الميزة تحتاج إلى تكامل إضافي.');
});

// معالجة أمر الترجمة
bot.onText(/\/translate(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const textToTranslate = match[1];
  
  if (!textToTranslate) {
    return bot.sendMessage(chatId, 'يرجى إدخال النص المطلوب ترجمته بعد الأمر /translate');
  }
  
  // إنشاء أزرار اختيار اللغة
  const languageButtons = Object.keys(languages).map(langCode => {
    return [{text: languages[langCode], callback_data: `translate_${langCode}_${encodeURIComponent(textToTranslate)}`}];
  });
  
  bot.sendMessage(chatId, 'اختر اللغة الهدف:', {
    reply_markup: {
      inline_keyboard: languageButtons
    }
  });
});

// أوامر المطور (متاحة فقط للمتحكم الوحيد)
bot.onText(/\/stats/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  
  // هنا يمكنك إضافة إحصائيات البوت
  bot.sendMessage(msg.chat.id, 'إحصائيات البوت غير متاحة حالياً.');
});

bot.onText(/\/broadcast (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  
  const message = match[1];
  // هنا يمكنك إضافة منطق البث للمستخدمين
  bot.sendMessage(msg.chat.id, `سيتم بث الرسالة لجميع المستخدمين: ${message}`);
});

bot.onText(/\/logs/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  
  // هنا يمكنك إرسال سجلات النظام
  bot.sendMessage(msg.chat.id, 'سجلات النظام غير متاحة حالياً.');
});

// معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error(error);
});