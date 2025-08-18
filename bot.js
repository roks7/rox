const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// استبدل 'YOUR_BOT_TOKEN' بتوكن البوت الخاص بك
const token = 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(token, {polling: true});

// ملف لتخزين البيانات
const DATA_FILE = 'sites_data.json';

// ID المسؤول
const ADMIN_ID = 6808883615;

// تحميل البيانات المحفوظة
let sitesData = {};
try {
    const data = fs.readFileSync(DATA_FILE);
    sitesData = JSON.parse(data);
} catch (err) {
    console.log('No existing data file, starting fresh.');
    sitesData = {
        sites: []
    };
}

// حفظ البيانات
function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sitesData, null, 2));
}

// أوامر البوت
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = msg.from.id === ADMIN_ID;
    
    let message = 'مرحباً! هذا البوت يسمح لك بإنشاء تطبيق مصغر من أزرار المواقع.\n';
    
    if (isAdmin) {
        message += '\nأنت مسؤول، يمكنك استخدام الأوامر التالية:\n' +
                   '/addsite - لإضافة موقع جديد\n' +
                   '/listsites - لعرض جميع المواقع\n' +
                   '/removesite - لحذف موقع';
    }
    
    message += '\n\nاضغط على الزر أدناه لعرض المواقع المتاحة:';
    
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [{text: 'عرض المواقع', callback_data: 'show_sites'}]
            ]
        }
    });
});

// إضافة موقع (للمسؤول فقط)
bot.onText(/\/addsite/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        bot.sendMessage(msg.chat.id, 'عفواً، هذا الأمر للمسؤول فقط.');
        return;
    }
    
    bot.sendMessage(msg.chat.id, 'أرسل اسم الموقع ثم الرابط في السطر التالي مثل:\n\nموقعي\nhttps://example.com', {
        reply_markup: {
            force_reply: true
        }
    });
});

// معالجة الردود لإضافة المواقع
bot.on('reply_to_message', (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    
    const replyTo = msg.reply_to_message;
    if (replyTo.text && replyTo.text.includes('/addsite')) {
        const lines = msg.text.split('\n');
        if (lines.length >= 2) {
            const name = lines[0].trim();
            const url = lines[1].trim();
            
            // التحقق من صحة الرابط
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                bot.sendMessage(msg.chat.id, 'الرابط يجب أن يبدأ بـ http:// أو https://');
                return;
            }
            
            sitesData.sites.push({name, url});
            saveData();
            
            bot.sendMessage(msg.chat.id, `تم إضافة الموقع "${name}" بنجاح!`);
        } else {
            bot.sendMessage(msg.chat.id, 'التنسيق غير صحيح. يرجى إرسال اسم الموقع ثم الرابط في السطر التالي.');
        }
    }
});

// عرض قائمة المواقع (للمسؤول فقط)
bot.onText(/\/listsites/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        bot.sendMessage(msg.chat.id, 'عفواً، هذا الأمر للمسؤول فقط.');
        return;
    }
    
    if (sitesData.sites.length === 0) {
        bot.sendMessage(msg.chat.id, 'لا توجد مواقع مضاف حتى الآن.');
        return;
    }
    
    let message = 'المواقع المضاف:\n\n';
    sitesData.sites.forEach((site, index) => {
        message += `${index + 1}. ${site.name} - ${site.url}\n`;
    });
    
    bot.sendMessage(msg.chat.id, message);
});

// حذف موقع (للمسؤول فقط)
bot.onText(/\/removesite/, (msg) => {
    if (msg.from.id !== ADMIN_ID) {
        bot.sendMessage(msg.chat.id, 'عفواً، هذا الأمر للمسؤول فقط.');
        return;
    }
    
    if (sitesData.sites.length === 0) {
        bot.sendMessage(msg.chat.id, 'لا توجد مواقع مضاف حتى الآن.');
        return;
    }
    
    let message = 'اختر الموقع الذي تريد حذفه:\n\n';
    sitesData.sites.forEach((site, index) => {
        message += `${index + 1}. ${site.name}\n`;
    });
    
    bot.sendMessage(msg.chat.id, message, {
        reply_markup: {
            force_reply: true
        }
    });
});

// معالجة الردود لحذف المواقع
bot.on('reply_to_message', (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    
    const replyTo = msg.reply_to_message;
    if (replyTo.text && replyTo.text.includes('/removesite')) {
        const index = parseInt(msg.text.trim()) - 1;
        
        if (isNaN(index) {
            bot.sendMessage(msg.chat.id, 'الرجاء إدخال رقم صحيح.');
            return;
        }
        
        if (index >= 0 && index < sitesData.sites.length) {
            const removedSite = sitesData.sites.splice(index, 1)[0];
            saveData();
            
            bot.sendMessage(msg.chat.id, `تم حذف الموقع "${removedSite.name}" بنجاح!`);
        } else {
            bot.sendMessage(msg.chat.id, 'رقم الموقع غير صحيح.');
        }
    }
});

// معالجة ضغط الأزرار
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data === 'show_sites') {
        if (sitesData.sites.length === 0) {
            bot.sendMessage(chatId, 'لا توجد مواقع مضاف حتى الآن.');
            return;
        }
        
        // إنشاء أزرار المواقع
        const buttons = sitesData.sites.map(site => {
            return [{text: site.name, url: site.url}];
        });
        
        bot.sendMessage(chatId, 'اختر موقعاً من القائمة:', {
            reply_markup: {
                inline_keyboard: buttons
            }
        });
    }
    
    bot.answerCallbackQuery(query.id);
});

console.log('Bot is running...');