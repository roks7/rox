const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const FormData = require('form-data');
const { AllHtmlEntities } = require('html-entities');
const entities = new AllHtmlEntities();
const path = require('path');

// تهيئة تطبيق Express لتقديم ملف HTML
const app = express();
const PORT = process.env.PORT || 3000;

// استبدل هذا بـ token بوتك
const BOT_TOKEN = '7676735779:AAFsBQZPOYuVWB8D3dTNnfipNLoJTI6xP5s';
const bot = new Telegraf(BOT_TOKEN);

// Middleware لمعالجة الأخطاء
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  return ctx.reply('حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقًا.');
});

// بدء تشغيل خادم Express لتقديم ملف HTML
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// مسار لتقديم ملف tele.html
app.get('/tele', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tele.html'));
});

// مسار لمعالجة بيانات النموذج
app.post('/submit-form', (req, res) => {
  const { userId, ...formData } = req.body;
  
  if (!userId) {
    return res.status(400).send('معرف المستخدم مطلوب');
  }
  
  bot.telegram.sendMessage(userId, `تم استلام بيانات النموذج:\n${JSON.stringify(formData, null, 2)}`)
    .then(() => res.send('تم إرسال البيانات بنجاح!'))
    .catch(err => {
      console.error('Error sending message:', err);
      res.status(500).send('حدث خطأ أثناء إرسال البيانات');
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// أمر البدء
bot.start((ctx) => {
  const welcomeMessage = `مرحباً ${ctx.from.first_name}! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:`;
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('توليد الصور', 'generate_image')],
    [Markup.button.callback('معلومات انستجرام', 'instagram_info')],
    [Markup.button.callback('معلومات تيك توك', 'tiktok_info')],
    [Markup.button.callback('ترجمة', 'translation')],
    [Markup.button.callback('المواقع المصغرة', 'mini_sites')],
    [Markup.button.callback('فتح موقع HTML', 'open_html_site')]
  ]);
  
  ctx.reply(welcomeMessage, keyboard);
});

// معالجة توليد الصور
bot.action('generate_image', async (ctx) => {
  await ctx.reply('يرجى إرسال وصف الصورة التي تريد توليدها');
  
  // استخدام hears بدلاً من on لمنع التكرار
  const textHandler = async (textCtx) => {
    if (textCtx.message && textCtx.message.text) {
      const prompt = textCtx.message.text;
      
      try {
        await textCtx.reply('جاري توليد الصور، يرجى الانتظار...');
        
        const form = new FormData();
        form.append('prompt', prompt);
        
        const response = await axios.post('https://ai-api.magicstudio.com/api/ai-art-generator', form, {
          headers: form.getHeaders()
        });
        
        if (response.data?.images?.length > 0) {
          for (const imageUrl of response.data.images) {
            await textCtx.replyWithPhoto({ url: imageUrl });
          }
        } else {
          await textCtx.reply('لم يتم العثور على أي صور. يرجى المحاولة مرة أخرى.');
        }
      } catch (error) {
        console.error('Error generating image:', error);
        await textCtx.reply('حدث خطأ أثناء توليد الصور. يرجى المحاولة مرة أخرى.');
      }
      
      // إزالة المعالج بعد الاستخدام
      bot.off('text', textHandler);
    }
  };
  
  bot.on('text', textHandler);
});

// معالجة معلومات انستجرام
bot.action('instagram_info', async (ctx) => {
  await ctx.reply('يرجى إرسال اسم مستخدم انستجرام');
  
  const textHandler = async (textCtx) => {
    if (textCtx.message && textCtx.message.text) {
      const username = textCtx.message.text;
      
      try {
        await textCtx.reply('جاري جلب المعلومات، يرجى الانتظار...');
        
        const response = await axios.get(`https://www.instagram.com/${username}/?__a=1`);
        
        if (response.data?.graphql?.user) {
          const user = response.data.graphql.user;
          const info = `
معلومات انستجرام:
الاسم: ${user.full_name}
اسم المستخدم: ${user.username}
المتابعون: ${user.edge_followed_by.count}
يتبع: ${user.edge_follow.count}
المنشورات: ${user.edge_owner_to_timeline_media.count}
حساب خاص: ${user.is_private ? 'نعم' : 'لا'}
السيرة الذاتية: ${user.biography}
          `;
          
          await textCtx.reply(info);
          
          if (user.profile_pic_url_hd) {
            await textCtx.replyWithPhoto({ url: user.profile_pic_url_hd });
          }
        } else {
          await textCtx.reply('لم يتم العثور على المستخدم. يرجى التأكد من اسم المستخدم والمحاولة مرة أخرى.');
        }
      } catch (error) {
        console.error('Error fetching Instagram info:', error);
        await textCtx.reply('حدث خطأ أثناء جلب المعلومات. يرجى المحاولة مرة أخرى.');
      }
      
      bot.off('text', textHandler);
    }
  };
  
  bot.on('text', textHandler);
});

// معالجة معلومات تيك توك
bot.action('tiktok_info', async (ctx) => {
  await ctx.reply('يرجى إرسال اسم مستخدم تيك توك');
  
  const textHandler = async (textCtx) => {
    if (textCtx.message && textCtx.message.text) {
      const username = textCtx.message.text;
      
      try {
        await textCtx.reply('جاري جلب المعلومات، يرجى الانتظار...');
        
        // هذه مجرد مثال - تحتاج إلى استبداله بـ API حقيقي
        await textCtx.reply(`تم استلام اسم المستخدم: ${username}\n\nهذه الميزة تحتاج إلى API خاص لاستخراج معلومات تيك توك.`);
      } catch (error) {
        console.error('Error fetching TikTok info:', error);
        await textCtx.reply('حدث خطأ أثناء جلب المعلومات. يرجى المحاولة مرة أخرى.');
      }
      
      bot.off('text', textHandler);
    }
  };
  
  bot.on('text', textHandler);
});

// معالجة الترجمة
bot.action('translation', async (ctx) => {
  await ctx.reply('يرجى إرسال النص الذي تريد ترجمته');
  
  const textHandler = async (textCtx) => {
    if (textCtx.message && textCtx.message.text) {
      const text = textCtx.message.text;
      
      try {
        await textCtx.reply('جاري الترجمة، يرجى الانتظار...');
        
        const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ar`);
        
        if (response.data?.responseData) {
          const translatedText = entities.decode(response.data.responseData.translatedText);
          await textCtx.reply(`النص المترجم:\n\n${translatedText}`);
        } else {
          await textCtx.reply('لم يتم العثور على ترجمة. يرجى المحاولة مرة أخرى.');
        }
      } catch (error) {
        console.error('Error translating text:', error);
        await textCtx.reply('حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى.');
      }
      
      bot.off('text', textHandler);
    }
  };
  
  bot.on('text', textHandler);
});

// معالجة عرض المواقع المصغرة
bot.action('mini_sites', async (ctx) => {
  const sites = [
    { name: 'موقع تشفير HTML', url: 'https://roxhtml.pages.dev' },
    { name: 'بلاغات تيك توك', url: 'https://www.tiktok.com/safety/report' },
    { name: 'موقع ويب', url: 'https://ddos7.pages.dev/' },
    { name: 'ذكاء اصطناعي', url: 'http://nikai.pages.dev' }
  ];
  
  let message = 'المواقع المصغرة المتاحة:\n\n';
  sites.forEach((site, index) => {
    message += `${index + 1}. ${site.name}\n${site.url}\n\n`;
  });
  
  await ctx.reply(message);
});

// معالجة فتح موقع HTML
bot.action('open_html_site', async (ctx) => {
  const userId = ctx.from.id;
  const webAppUrl = `https://your-render-app-name.onrender.com/tele?userId=${userId}`;
  
  await ctx.reply('يمكنك فتح الموقع من خلال الرابط التالي:', Markup.inlineKeyboard([
    Markup.button.webApp('فتح موقع HTML', webAppUrl)
  ]));
});

// تشغيل البوت
bot.launch()
  .then(() => console.log('Bot is running...'))
  .catch(err => console.error('Error starting bot:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
