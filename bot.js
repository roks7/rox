const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const url = require('url');
const util = require('util');
const AdmZip = require('adm-zip');

// إعداد Express
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.get('/', (req, res) => {
  res.send('Telegram Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// إعدادات البوت
const TOKEN = "8018964869:AAHevMgPMsip0CKx4-virvESUiNdcRRcKz8";
const ADMIN_ID = 6808883615;
const DEVELOPER_USERNAME = "@QR_l4";

// ملفات التخزين
const DATA_FILE = "bot_data.json";
const CHANNELS_FILE = "channels_data.json";

// APIs
const VIRUSTOTAL_API_KEY = "19462df75ad313db850e532a2e8869dc8713c07202b1c62ebf1aa7a18a2e0173";
const VIDEO_API_BASE = "https://api.yabes-desu.workers.dev/ai/tool/txt2video";
const SHORTENER_API = "https://api.dfkz.xo.je/apis/v1/short.php?url=";
const INSTA_INFO_API = "https://sherifbots.serv00.net/Api/insta.php?user=";
const AI_API_URL = 'https://ai-api.magicstudio.com/api/ai-art-generator';

// إعدادات أخرى
let COLUMNS = 2;
const DOWNLOAD_FOLDER = "site_download";
const ZIP_FILE_NAME = "site_download.zip";

// متغيرات صيد اليوزرات
const insta = "1234567890qwertyuiopasdfghjklzxcvbnm";
const all_chars = "_.";
const user_sessions = {};
const good_users_cache = {};

// لغات الترجمة المدعومة
const SUPPORTED_LANGUAGES = {
  "العربية": "ar",
  "الإنجليزية": "en",
  "الإسبانية": "es",
  "الفرنسية": "fr",
  "الألمانية": "de",
  "الإيطالية": "it",
  "البرتغالية": "pt",
  "الروسية": "ru",
  "الصينية": "zh",
  "اليابانية": "ja",
  "الكورية": "ko",
  "التركية": "tr",
  "الفارسية": "fa",
  "العبرية": "he"
};

// BINs شائعة للفيزا
const COMMON_VISA_BINS = [
  '453201', '453202', '453203', '453204', '453205', '453206', '453207', '453208', '453209',
  '453210', '453211', '453212', '453213', '453214', '453215', '453216', '453217', '453218',
  '453219', '453220', '453221', '453222', '453223', '453224', '453225', '453226', '453227',
  '453228', '453229', '453230', '453231', '453232', '453233', '453234', '453235', '453236',
  '453237', '453238', '453239', '453240', '453241', '453242', '453243', '453244', '453245',
  '453246', '453247', '453248', '453249', '453250', '453251', '453252', '453253', '453254',
  '453255', '453256', '453257', '453258', '453259', '453260', '453261', '453262', '453263',
  '453264', '453265', '453266', '453267', '453268', '453269', '453270', '453271', '453272',
  '453273', '453274', '453275', '453276', '453277', '453278', '453279', '453280', '453281',
  '453282', '453283', '453284', '453285', '453286', '453287', '453288', '453289', '453290',
  '453291', '453292', '453293', '453294', '453295', '453296', '453297', '453298', '453299',
  '454000', '454001', '454002', '454003', '454004', '454005', '454006', '454007', '454008',
  '454009', '454010', '454011', '454012', '454013', '454014', '454015', '454016', '454017',
  '454018', '454019', '454020', '454021', '454022', '454023', '454024', '454025', '454026',
  '454027', '454028', '454029', '454030', '454031', '454032', '454033', '454034', '454035',
  '454036', '454037', '454038', '454039', '454040', '454041', '454042', '454043', '454044',
  '454045', '454046', '454047', '454048', '454049', '454050', '454051', '454052', '454053',
  '454054', '454055', '454056', '454057', '454058', '454059', '454060', '454061', '454062',
  '454063', '454064', '454065', '454066', '454067', '454068', '454069', '454070', '454071',
  '454072', '454073', '454074', '454075', '454076', '454077', '454078', '454079', '454080',
  '454081', '454082', '454083', '454084', '454085', '454086', '454087', '454088', '454089',
  '454090', '454091', '454092', '454093', '454094', '454095', '454096', '454097', '454098',
  '454099'
];

// تهيئة البوت
const bot = new TelegramBot(TOKEN, { polling: true });

// وظائف مساعدة
function isAdmin(userId) {
  return userId === ADMIN_ID;
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return { buttons: [], services_order: ["translation", "visa", "image", "video", "tiktok", "file_check", "site_download", "shortener", "insta_info"] };
}

function loadChannels() {
  try {
    if (fs.existsSync(CHANNELS_FILE)) {
      return JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading channels:', error);
  }
  return { channels: [] };
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

function saveChannels(data) {
  try {
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving channels:', error);
  }
}

function arrangeButtonsInColumns(buttonsList, columns = COLUMNS) {
  const keyboard = [];
  for (let i = 0; i < buttonsList.length; i += columns) {
    const row = buttonsList.slice(i, i + columns);
    keyboard.push(row);
  }
  return keyboard;
}

async function checkSubscription(chatId, userId) {
  const channels = loadChannels().channels;
  
  if (!channels || channels.length === 0) {
    return true;
  }
  
  const notSubscribed = [];
  
  for (const channel of channels) {
    try {
      const member = await bot.getChatMember(channel.id, userId);
      if (member.status === 'left' || member.status === 'kicked') {
        notSubscribed.push(channel);
      }
    } catch (error) {
      console.error(`Error checking subscription for channel ${channel.id}:`, error);
    }
  }
  
  if (notSubscribed.length > 0) {
    const keyboard = [];
    for (const channel of notSubscribed) {
      const channelId = channel.id;
      const channelName = channel.name;
      const username = channel.username || "";
      
      let channelUrl;
      if (username) {
        channelUrl = `https://t.me/${username}`;
      } else {
        channelUrl = `https://t.me/c/${String(channelId).replace('-100', '')}`;
      }
      
      keyboard.push([{ text: `انضم إلى ${channelName}`, url: channelUrl }]);
    }
    
    keyboard.push([{ text: "✅ تحقق من الاشتراك", callback_data: "check_subscription" }]);
    
    await bot.sendMessage(chatId, "⚠️ يجب عليك الانضمام إلى القنوات التالية لاستخدام البوت:", {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
    
    return false;
  }
  
  return true;
}

function luhnCheck(cardNumber) {
  function digitsOf(n) {
    return String(n).split('').map(Number);
  }
  
  const digits = digitsOf(cardNumber);
  const oddDigits = digits.reverse().filter((_, i) => i % 2 === 0);
  const evenDigits = digits.reverse().filter((_, i) => i % 2 === 1);
  let checksum = oddDigits.reduce((sum, digit) => sum + digit, 0);
  
  for (const d of evenDigits) {
    const doubled = d * 2;
    checksum += doubled > 9 ? doubled - 9 : doubled;
  }
  
  return checksum % 10 === 0;
}

function generateValidCard(bin) {
  const length = 16 - bin.length;
  let randomPart = '';
  for (let i = 0; i < length - 1; i++) {
    randomPart += Math.floor(Math.random() * 10);
  }
  
  const baseNumber = bin + randomPart;
  let checksum = 0;
  
  for (let i = 0; i < baseNumber.length; i++) {
    let n = parseInt(baseNumber[i]);
    if ((i + bin.length) % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    checksum += n;
  }
  
  const checksumDigit = (10 - (checksum % 10)) % 10;
  return baseNumber + checksumDigit;
}

function generateRealisticVisa() {
  const bin = COMMON_VISA_BINS[Math.floor(Math.random() * COMMON_VISA_BINS.length)];
  const cardNumber = generateValidCard(bin);
  const formattedNumber = cardNumber.match(/.{1,4}/g).join(' ');
  
  const currentYear = 2024;
  const month = Math.floor(Math.random() * 12) + 1;
  const year = Math.floor(Math.random() * 6) + currentYear;
  const expiryDate = `${month.toString().padStart(2, '0')}/${year.toString().slice(2)}`;
  
  const cvv = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  const firstNames = ["AHMED", "MOHAMMED", "ALI", "OMAR", "KHALED", "HASSAN", "HUSSEIN", "IBRAHIM", "YOUSEF", "ABDULLAH"];
  const lastNames = ["ALI", "HASSAN", "HUSSEIN", "ABDULRAHMAN", "ALSAUD", "ALGHAMDI", "ALOTAIBI", "ALAMRI", "ALSHEHRI", "ALZAHRANI"];
  
  const cardHolder = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  
  return { formattedNumber, expiryDate, cvv, cardHolder };
}

async function translateToEnglish(text) {
  try {
    const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const response = await axios.get(translateUrl);
    return response.data[0][0][0];
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

async function createAIImage(prompt) {
  try {
    const headers = {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9,ar;q=0.8",
      "origin": "https://magicstudio.com",
      "priority": "u=1, i",
      "referer": "https://magicstudio.com/ai-art-generator/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    };
    
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'bytes');
    formData.append('user_profile_id', 'null');
    formData.append('user_is_subscribed', 'true');
    
    const response = await axios.post(AI_API_URL, formData, { 
      headers: { ...headers, ...formData.getHeaders() },
      responseType: 'arraybuffer'
    });
    
    return response.data;
  } catch (error) {
    console.error('AI Image generation error:', error);
    throw error;
  }
}

async function fetchVideoToTemp(prompt) {
  const videoUrl = `${VIDEO_API_BASE}?prompt=${encodeURIComponent(prompt)}`;
  
  try {
    const response = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 1200000 // 20 دقيقة
    });
    
    const contentType = response.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      const data = response.data;
      let videoUrl = data.url || data.video || data.result || data.data;
      
      if (!videoUrl) {
        throw new Error("❌ ما لكيت رابط فيديو بالـ API response.");
      }
      
      const videoResponse = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 1200000
      });
      
      const tempFilePath = path.join(__dirname, `temp_video_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempFilePath);
      
      videoResponse.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', reject);
      });
    } else {
      const tempFilePath = path.join(__dirname, `temp_video_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempFilePath);
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', reject);
      });
    }
  } catch (error) {
    console.error('Video generation error:', error);
    throw error;
  }
}

// وظائف صيد يوزرات انستجرام
async function checkInstagramUser(user) {
  const url = 'https://www.instagram.com/accounts/web_create_ajax/attempt/';
  
  const headers = {
    'Host': 'www.instagram.com',
    'content-length': '85',
    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="101"',
    'x-ig-app-id': '936619743392459',
    'x-ig-www-claim': '0',
    'sec-ch-ua-mobile': '?0',
    'x-instagram-ajax': '81f3a3c9dfe2',
    'content-type': 'application/x-www-form-urlencoded',
    'accept': '*/*',
    'x-requested-with': 'XMLHttpRequest',
    'x-asbd-id': '198387',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.40 Safari/537.36',
    'x-csrftoken': 'jzhjt4G11O37lW1aDFyFmy1K0yIEN9Qv',
    'sec-ch-ua-platform': '"Linux"',
    'origin': 'https://www.instagram.com',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://www.instagram.com/accounts/emailsignup/',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'en-IQ,en;q=0.9',
    'cookie': 'csrftoken=jzhjt4G11O37lW1aDFyFmy1K0yIEN9Qv; mid=YtsQ1gABAAEszHB5wT9VqccwQIUL; ig_did=227CCCC2-3675-4A04-8DA5-BA3195B46425; ig_nrcb=1'
  };
  
  const data = `email=aakmnnsjskksmsnsn%40gmail.com&username=${user}&first_name=&opt_into_one_tap=false`;
  
  try {
    const response = await axios.post(url, data, { headers, timeout: 10000 });
    const responseText = response.data;
    
    if (responseText.includes('{"message":"feedback_required","spam":true,')) {
      return false;
    } else if (responseText.includes('"errors": {"username":') || responseText.includes('"code": "username_is_taken"')) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.error(`Error checking user ${user}:`, error);
    return false;
  }
}

function generate4charUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.3) {
      let user = '';
      for (let j = 0; j < 4; j++) {
        user += insta[Math.floor(Math.random() * insta.length)];
      }
      users.push(user);
    } else {
      const numSymbols = Math.floor(Math.random() * 2) + 1;
      const positions = [];
      while (positions.length < numSymbols) {
        const pos = Math.floor(Math.random() * 4);
        if (!positions.includes(pos)) positions.push(pos);
      }
      
      let user = '';
      for (let j = 0; j < 4; j++) {
        if (positions.includes(j)) {
          user += all_chars[Math.floor(Math.random() * all_chars.length)];
        } else {
          user += insta[Math.floor(Math.random() * insta.length)];
        }
      }
      users.push(user);
    }
  }
  return users;
}

function generate5charUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.4) {
      let user = '';
      for (let j = 0; j < 5; j++) {
        user += insta[Math.floor(Math.random() * insta.length)];
      }
      users.push(user);
    } else {
      const numSymbols = Math.floor(Math.random() * 3) + 1;
      const positions = [];
      while (positions.length < numSymbols) {
        const pos = Math.floor(Math.random() * 5);
        if (!positions.includes(pos)) positions.push(pos);
      }
      
      let user = '';
      for (let j = 0; j < 5; j++) {
        if (positions.includes(j)) {
          user += all_chars[Math.floor(Math.random() * all_chars.length)];
        } else {
          user += insta[Math.floor(Math.random() * insta.length)];
        }
      }
      users.push(user);
    }
  }
  return users;
}

function generateSpecialUsers(count, length = 6) {
  const users = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.2) {
      let user = '';
      for (let j = 0; j < length; j++) {
        user += insta[Math.floor(Math.random() * insta.length)];
      }
      users.push(user);
    } else {
      const numSymbols = Math.floor(Math.random() * 3) + 2;
      const positions = [];
      while (positions.length < numSymbols) {
        const pos = Math.floor(Math.random() * length);
        if (!positions.includes(pos)) positions.push(pos);
      }
      
      let user = '';
      for (let j = 0; j < length; j++) {
        if (positions.includes(j)) {
          user += all_chars[Math.floor(Math.random() * all_chars.length)];
        } else {
          user += insta[Math.floor(Math.random() * insta.length)];
        }
      }
      users.push(user);
    }
  }
  return users;
}

function generateEasy4charUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.1) {
      let user = '';
      for (let j = 0; j < 4; j++) {
        user += insta[Math.floor(Math.random() * insta.length)];
      }
      users.push(user);
    } else {
      const positions = [];
      while (positions.length < 2) {
        const pos = Math.floor(Math.random() * 4);
        if (!positions.includes(pos)) positions.push(pos);
      }
      
      let user = '';
      for (let j = 0; j < 4; j++) {
        if (positions.includes(j)) {
          user += all_chars[Math.floor(Math.random() * all_chars.length)];
        } else {
          user += insta[Math.floor(Math.random() * insta.length)];
        }
      }
      users.push(user);
    }
  }
  return users;
}

async function checkUsersBatch(users) {
  const goodUsers = [];
  for (const user of users) {
    if (await checkInstagramUser(user)) {
      goodUsers.push(user);
      if (goodUsers.length >= 5) break;
    }
  }
  return goodUsers;
}

async function instagramCheckProcess(chatId, userType) {
  user_sessions[chatId] = true;
  let totalChecked = 0;
  let foundUsers = 0;
  
  const typeName = userType === "5char" ? "خماسية" : 
                  userType === "4char" ? "رباعية" : 
                  userType === "easy4char" ? "رباعية سهلة" : "خاصة";
  
  await bot.sendMessage(chatId, `🔍 بدء البحث عن 5 يوزرات ${typeName} متاحة...`);
  
  while (user_sessions[chatId] && foundUsers < 5) {
    let usersBatch;
    if (userType === "5char") {
      usersBatch = generate5charUsers(15);
    } else if (userType === "4char") {
      usersBatch = generate4charUsers(15);
    } else if (userType === "easy4char") {
      usersBatch = generateEasy4charUsers(15);
    } else {
      usersBatch = generateSpecialUsers(15);
    }
    
    const goodUsers = await checkUsersBatch(usersBatch);
    totalChecked += usersBatch.length;
    
    if (!good_users_cache[chatId]) {
      good_users_cache[chatId] = [];
    }
    
    for (const user of goodUsers) {
      if (!good_users_cache[chatId].includes(user)) {
        good_users_cache[chatId].push(user);
        foundUsers++;
        
        const symbolCount = user.split('').filter(char => all_chars.includes(char)).length;
        let userTypeDesc = "";
        if (symbolCount === 0) {
          userTypeDesc = "بدون رموز";
        } else if (symbolCount === 1) {
          userTypeDesc = "برمز واحد";
        } else if (symbolCount === 2) {
          userTypeDesc = "برمزين";
        } else {
          userTypeDesc = `ب${symbolCount} رموز`;
        }
        
        const message = `✅ يوزر Instagram متاح!

📝 اليوزر: \`${user}\`
🔢 النوع: ${typeName} (${userTypeDesc})
🎯 الحاية: متاح للتسجيل

💾 اليوزر ${foundUsers} من 5`;
        
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
        if (foundUsers >= 5) break;
      }
    }
    
    if (foundUsers >= 5) break;
  }
  
  let finalMessage;
  if (foundUsers > 0) {
    const usersList = good_users_cache[chatId].slice(-foundUsers).map(user => `• \`${user}\``).join('\n');
    finalMessage = `🎉 تم العثور على ${foundUsers} يوزر متاح!

${usersList}

📊 إجمالي المفحوصة: ${totalChecked}`;
  } else {
    finalMessage = `❌ لم يتم العثور على يوزرات متاحة

📊 إجمالي المفحوصة: ${totalChecked}`;
  }
  
  await bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });
  user_sessions[chatId] = false;
}

async function getTikTokInfo(username) {
  const apiUrl = `https://tik-batbyte.vercel.app/tiktok?username=${username}`;
  try {
    const response = await axios.get(apiUrl, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error('TikTok API error:', error);
    return {};
  }
}

async function checkFileWithVirusTotal(fileBuffer, fileName) {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, fileName);
    
    const headers = {
      'x-apikey': VIRUSTOTAL_API_KEY,
      ...formData.getHeaders()
    };
    
    const uploadResponse = await axios.post('https://www.virustotal.com/api/v3/files', formData, { headers });
    const analysisId = uploadResponse.data.data.id;
    
    // الانتظار حتى تجهز النتيجة
    let result;
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const analysisResponse = await axios.get(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, { headers });
      result = analysisResponse.data;
      
      if (result.data.attributes.status === 'completed') {
        break;
      }
    }
    
    const stats = result.data.attributes.stats;
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const undetected = stats.undetected || 0;
    const sha256 = result.meta.file_info.sha256;
    
    return {
      malicious,
      suspicious,
      harmless,
      undetected,
      sha256,
      success: true
    };
  } catch (error) {
    console.error('VirusTotal error:', error);
    return { success: false, error: error.message };
  }
}

async function downloadSiteSimple(url, folder) {
  try {
    if (fs.existsSync(folder)) {
      fs.removeSync(folder);
    }
    fs.ensureDirSync(folder);
    
    const response = await axios.get(url, { timeout: 30000 });
    const parsedUrl = new URL(url);
    let filename = path.basename(parsedUrl.pathname);
    
    if (!filename || !path.extname(filename)) {
      filename = 'index.html';
    }
    
    const mainFile = path.join(folder, filename);
    fs.writeFileSync(mainFile, response.data, 'utf8');
    
    return true;
  } catch (error) {
    console.error('Error downloading site:', error);
    return false;
  }
}

function zipFolderSite(folder, zipName) {
  const zip = new AdmZip();
  zip.addLocalFolder(folder);
  zip.writeZip(zipName);
}

async function cleanupSiteFiles(zipPath, folderPath) {
  await new Promise(resolve => setTimeout(resolve, 180000));
  try {
    if (fs.existsSync(zipPath)) fs.removeSync(zipPath);
    if (fs.existsSync(folderPath)) fs.removeSync(folderPath);
  } catch (error) {
    console.error('Error cleaning up site files:', error);
  }
}

async function getInstagramInfo(username) {
  try {
    // استخدام instaloader غير متوفر مباشرة في Node.js
    // سنستخدم API بديل
    const response = await axios.get(`${INSTA_INFO_API}${username}`);
    return response.data;
  } catch (error) {
    console.error('Instagram info error:', error);
    return {};
  }
}

function createMainKeyboard(userId) {
  const data = loadData();
  const keyboard = [];
  
  // إضافة أزرار المواقع أولاً
  const buttonsList = [];
  for (const btn of data.buttons) {
    buttonsList.push({
      text: btn.text,
      web_app: { url: btn.url }
    });
  }
  
  if (buttonsList.length > 0) {
    keyboard.push(...arrangeButtonsInColumns(buttonsList));
  }
  
  // إضافة أزرار الخدمات حسب الترتيب المحدد
  const servicesOrder = data.services_order || ["translation", "visa", "image", "video", "tiktok", "file_check", "site_download", "shortener", "insta_info"];
  const serviceButtons = [];
  
  for (const service of servicesOrder) {
    if (service === "translation") {
      serviceButtons.push({ text: "خدمة الترجمة 🌐", callback_data: "translation_service" });
    } else if (service === "visa") {
      serviceButtons.push({ text: "توليد فيزا 💳", callback_data: "generate_visa" });
    } else if (service === "image") {
      serviceButtons.push({ text: "إنشاء صورة 🎨", callback_data: "generate_image" });
    } else if (service === "video") {
      serviceButtons.push({ text: "إنشاء فيديو 🎬", callback_data: "generate_video" });
    } else if (service === "tiktok") {
      serviceButtons.push({ text: "معلومات تيك توك 📱", callback_data: "tiktok_service" });
    } else if (service === "file_check") {
      serviceButtons.push({ text: "فحص الملفات 🔍", callback_data: "file_check_service" });
    } else if (service === "site_download") {
      serviceButtons.push({ text: "سحب ملفات الموقع 🌐", callback_data: "site_download_service" });
    } else if (service === "shortener") {
      serviceButtons.push({ text: "اختصار الروابط 🔗", callback_data: "shortener_service" });
    } else if (service === "insta_info") {
      serviceButtons.push({ text: "معلومات انستجرام 📷", callback_data: "insta_info_service" });
    }
  }
  
  if (serviceButtons.length > 0) {
    keyboard.push(...arrangeButtonsInColumns(serviceButtons));
  }
  
  // إضافة الأزرار الثابتة الجديدة
  keyboard.push([{ text: "صيد يوزرات انستا 🎯", callback_data: "instagram_hunt" }]);
  keyboard.push([{ text: "المزيد من المميزات 🦾", url: "https://t.me/VIP_H3bot" }]);
  keyboard.push([{ text: "مطور البوت 👑", url: `https://t.me/${DEVELOPER_USERNAME.replace('@', '')}` }]);
  
  // إضافة زر الإدارة للمشرف فقط
  if (isAdmin(userId)) {
    keyboard.push([{ text: "الإدارة ⚙️", callback_data: "admin_panel" }]);
  }
  
  return { inline_keyboard: keyboard };
}

// معالجة الأوامر
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!await checkSubscription(chatId, userId)) return;
  
  const replyMarkup = createMainKeyboard(userId);
  await bot.sendMessage(chatId, "مرحباً! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:", {
    reply_markup: replyMarkup
  });
});

// معالجة callback queries
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  try {
    if (data === 'check_subscription') {
      if (await checkSubscription(chatId, userId)) {
        await bot.editMessageText("✅ أنت مشترك في جميع القنوات! يمكنك الآن استخدام البوت.", {
          chat_id: chatId,
          message_id: msg.message_id
        });
        await startFromCallback(chatId, msg.message_id);
      }
    }
    else if (data === 'back_to_main') {
      if (!await checkSubscription(chatId, userId)) return;
      await startFromCallback(chatId, msg.message_id);
    }
    else if (data === 'generate_visa') {
      if (!await checkSubscription(chatId, userId)) return;
      const { formattedNumber, expiryDate, cvv, cardHolder } = generateRealisticVisa();
      await bot.sendMessage(chatId, `💳 تم توليد بطاقة فيزا جديدة:
      
🔢 الرقم: \`${formattedNumber}\`
📅 تاريخ الانتهاء: ${expiryDate}
🔐 CVV: ${cvv}
👤 حامل البطاقة: ${cardHolder}

⚠️ ملاحظة: هذه البطاقة للاختبار فقط وغير صالحة للاستخدام الفعلي.`, { parse_mode: 'Markdown' });
    }
    else if (data === 'generate_image') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "🎨 أرسل لي وصف الصورة التي تريد إنشاءها:");
      user_sessions[chatId] = { action: 'generate_image' };
    }
    else if (data === 'generate_video') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "🎬 أرسل لي وصف الفيديو الذي تريد إنشاءه:");
      user_sessions[chatId] = { action: 'generate_video' };
    }
    else if (data === 'translation_service') {
      if (!await checkSubscription(chatId, userId)) return;
      const languagesKeyboard = {
        inline_keyboard: Object.keys(SUPPORTED_LANGUAGES).map(lang => [{ text: lang, callback_data: `translate_${SUPPORTED_LANGUAGES[lang]}` }])
      };
      await bot.sendMessage(chatId, "🌐 اختر اللغة الهدف للترجمة:", { reply_markup: languagesKeyboard });
    }
    else if (data.startsWith('translate_')) {
      if (!await checkSubscription(chatId, userId)) return;
      const targetLang = data.split('_')[1];
      user_sessions[chatId] = { action: 'translation', targetLang };
      await bot.sendMessage(chatId, `🌐 أرسل النص الذي تريد ترجمته إلى ${Object.keys(SUPPORTED_LANGUAGES).find(key => SUPPORTED_LANGUAGES[key] === targetLang)}:`);
    }
    else if (data === 'tiktok_service') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "📱 أرسل اسم المستخدم على TikTok:");
      user_sessions[chatId] = { action: 'tiktok_info' };
    }
    else if (data === 'file_check_service') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "🔍 أرسل الملف الذي تريد فحصه:");
      user_sessions[chatId] = { action: 'file_check' };
    }
    else if (data === 'site_download_service') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "🌐 أرسل رابط الموقع الذي تريد سحب ملفاته:");
      user_sessions[chatId] = { action: 'site_download' };
    }
    else if (data === 'shortener_service') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "🔗 أرسل الرابط الذي تريد اختصاره:");
      user_sessions[chatId] = { action: 'shortener' };
    }
    else if (data === 'insta_info_service') {
      if (!await checkSubscription(chatId, userId)) return;
      await bot.sendMessage(chatId, "📷 أرسل اسم المستخدم على Instagram:");
      user_sessions[chatId] = { action: 'insta_info' };
    }
    else if (data === 'instagram_hunt') {
      if (!await checkSubscription(chatId, userId)) return;
      const huntKeyboard = {
        inline_keyboard: [
          [{ text: "يوزرات رباعية 🎯", callback_data: "hunt_4char" }],
          [{ text: "يوزرات خماسية 🎯", callback_data: "hunt_5char" }],
          [{ text: "يوزرات رباعية سهلة 🎯", callback_data: "hunt_easy4char" }],
          [{ text: "يوزرات خاصة 🎯", callback_data: "hunt_special" }],
          [{ text: "رجوع ↩️", callback_data: "back_to_main" }]
        ]
      };
      await bot.sendMessage(chatId, "🎯 اختر نوع اليوزرات التي تريد صيدها:", { reply_markup: huntKeyboard });
    }
    else if (data.startsWith('hunt_')) {
      if (!await checkSubscription(chatId, userId)) return;
      const huntType = data.split('_')[1];
      await instagramCheckProcess(chatId, huntType);
    }
    else if (data === 'admin_panel') {
      if (!isAdmin(userId)) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: "❌ ليس لديك صلاحية الوصول إلى لوحة الإدارة." });
        return;
      }
      
      const adminKeyboard = {
        inline_keyboard: [
          [{ text: "إضافة زر موقع 🌐", callback_data: "add_web_button" }],
          [{ text: "إزالة زر موقع 🗑️", callback_data: "remove_web_button" }],
          [{ text: "إضافة قناة اشتراك 📢", callback_data: "add_channel" }],
          [{ text: "إزالة قناة اشتراك 🗑️", callback_data: "remove_channel" }],
          [{ text: "تغيير عدد الأعمدة 🔢", callback_data: "change_columns" }],
          [{ text: "إعادة ترتيب الخدمات 🔄", callback_data: "reorder_services" }],
          [{ text: "رجوع ↩️", callback_data: "back_to_main" }]
        ]
      };
      
      await bot.editMessageText("⚙️ لوحة إدارة البوت:", {
        chat_id: chatId,
        message_id: msg.message_id,
        reply_markup: adminKeyboard
      });
    }
    else if (data === 'add_web_button') {
      if (!isAdmin(userId)) return;
      await bot.sendMessage(chatId, "🌐 أرسل النص والرابط للزر الجديد بالشكل التالي:\n\nنص الزر|الرابط\n\nمثال:\nموقعنا|https://example.com");
      user_sessions[chatId] = { action: 'add_web_button' };
    }
    else if (data === 'remove_web_button') {
      if (!isAdmin(userId)) return;
      const dataObj = loadData();
      if (dataObj.buttons.length === 0) {
        await bot.sendMessage(chatId, "❌ لا توجد أزرار مواقع لإزالتها.");
        return;
      }
      
      const buttonsKeyboard = {
        inline_keyboard: dataObj.buttons.map((btn, index) => [{ text: btn.text, callback_data: `remove_button_${index}` }])
      };
      buttonsKeyboard.inline_keyboard.push([{ text: "إلغاء ❌", callback_data: "admin_panel" }]);
      
      await bot.sendMessage(chatId, "🗑️ اختر الزر الذي تريد إزالته:", { reply_markup: buttonsKeyboard });
    }
    else if (data.startsWith('remove_button_')) {
      if (!isAdmin(userId)) return;
      const index = parseInt(data.split('_')[2]);
      const dataObj = loadData();
      
      if (index >= 0 && index < dataObj.buttons.length) {
        const removedButton = dataObj.buttons.splice(index, 1)[0];
        saveData(dataObj);
        await bot.sendMessage(chatId, `✅ تم إزالة الزر "${removedButton.text}" بنجاح.`);
      } else {
        await bot.sendMessage(chatId, "❌ فشل إزالة الزر. الرجاء المحاولة مرة أخرى.");
      }
    }
    else if (data === 'add_channel') {
      if (!isAdmin(userId)) return;
      await bot.sendMessage(chatId, "📢 أرسل معرف القناة أو رابطها (يجب أن يكون البوت مشرفاً في القناة):");
      user_sessions[chatId] = { action: 'add_channel' };
    }
    else if (data === 'remove_channel') {
      if (!isAdmin(userId)) return;
      const channelsData = loadChannels();
      if (channelsData.channels.length === 0) {
        await bot.sendMessage(chatId, "❌ لا توجد قنوات اشتراك لإزالتها.");
        return;
      }
      
      const channelsKeyboard = {
        inline_keyboard: channelsData.channels.map((channel, index) => [{ text: channel.name, callback_data: `remove_channel_${index}` }])
      };
      channelsKeyboard.inline_keyboard.push([{ text: "إلغاء ❌", callback_data: "admin_panel" }]);
      
      await bot.sendMessage(chatId, "🗑️ اختر القناة التي تريد إزالتها:", { reply_markup: channelsKeyboard });
    }
    else if (data.startsWith('remove_channel_')) {
      if (!isAdmin(userId)) return;
      const index = parseInt(data.split('_')[2]);
      const channelsData = loadChannels();
      
      if (index >= 0 && index < channelsData.channels.length) {
        const removedChannel = channelsData.channels.splice(index, 1)[0];
        saveChannels(channelsData);
        await bot.sendMessage(chatId, `✅ تم إزالة قناة "${removedChannel.name}" بنجاح.`);
      } else {
        await bot.sendMessage(chatId, "❌ فشل إزالة القناة. الرجاء المحاولة مرة أخرى.");
      }
    }
    else if (data === 'change_columns') {
      if (!isAdmin(userId)) return;
      await bot.sendMessage(chatId, "🔢 أرسل عدد الأعمدة الجديد (1-4):");
      user_sessions[chatId] = { action: 'change_columns' };
    }
    else if (data === 'reorder_services') {
      if (!isAdmin(userId)) return;
      const dataObj = loadData();
      const servicesOrder = dataObj.services_order || ["translation", "visa", "image", "video", "tiktok", "file_check", "site_download", "shortener", "insta_info"];
      
      const servicesNames = {
        "translation": "خدمة الترجمة 🌐",
        "visa": "توليد فيزا 💳",
        "image": "إنشاء صورة 🎨",
        "video": "إنشاء فيديو 🎬",
        "tiktok": "معلومات تيك توك 📱",
        "file_check": "فحص الملفات 🔍",
        "site_download": "سحب ملفات الموقع 🌐",
        "shortener": "اختصار الروابط 🔗",
        "insta_info": "معلومات انستجرام 📷"
      };
      
      let message = "🔄 أرسل الترتيب الجديد للخدمات (افصل بينها بفاصلة):\n\n";
      servicesOrder.forEach((service, index) => {
        message += `${index + 1}. ${servicesNames[service]}\n`;
      });
      
      await bot.sendMessage(chatId, message);
      user_sessions[chatId] = { action: 'reorder_services' };
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: "❌ حدث خطأ أثناء معالجة طلبك." });
  }
});

async function startFromCallback(chatId, messageId) {
  const userId = chatId;
  const replyMarkup = createMainKeyboard(userId);
  await bot.editMessageText("مرحباً! يمكنك التمتع بالخدمات واختيار ما يناسبك من الخيارات المتاحة:", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup
  });
}

// معالجة الرسائل النصية
bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (!user_sessions[chatId]) return;
  
  try {
    if (user_sessions[chatId].action === 'generate_image') {
      await bot.sendMessage(chatId, "⏳ جاري إنشاء الصورة...");
      
      try {
        const imageBuffer = await createAIImage(text);
        await bot.sendPhoto(chatId, imageBuffer, { caption: "🎨 تم إنشاء الصورة بنجاح!" });
      } catch (error) {
        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء إنشاء الصورة. الرجاء المحاولة مرة أخرى.");
      }
      
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'generate_video') {
      await bot.sendMessage(chatId, "⏳ جاري إنشاء الفيديو... (قد تستغرق هذه العملية بعض الوقت)");
      
      try {
        const videoPath = await fetchVideoToTemp(text);
        await bot.sendVideo(chatId, videoPath, { caption: "🎬 تم إنشاء الفيديو بنجاح!" });
        fs.removeSync(videoPath);
      } catch (error) {
        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء إنشاء الفيديو. الرجاء المحاولة مرة أخرى.");
      }
      
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'translation') {
      const targetLang = user_sessions[chatId].targetLang;
      await bot.sendMessage(chatId, "⏳ جاري الترجمة...");
      
      try {
        const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await axios.get(translateUrl);
        const translatedText = response.data[0][0][0];
        
        const langName = Object.keys(SUPPORTED_LANGUAGES).find(key => SUPPORTED_LANGUAGES[key] === targetLang);
        await bot.sendMessage(chatId, `🌐 الترجمة إلى ${langName}:\n\n${translatedText}`);
      } catch (error) {
        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء الترجمة. الرجاء المحاولة مرة أخرى.");
      }
      
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'tiktok_info') {
      await bot.sendMessage(chatId, "⏳ جاري جلب معلومات TikTok...");
      
      try {
        const tiktokInfo = await getTikTokInfo(text);
        
        if (tiktokInfo && tiktokInfo.user) {
          const user = tiktokInfo.user;
          let message = `📱 معلومات TikTok لـ ${user.uniqueId}:\n\n`;
          message += `👤 الاسم: ${user.nickname}\n`;
          message += `📝 البايو: ${user.signature || 'لا يوجد'}\n`;
          message += `✅ موثوق: ${user.verified ? 'نعم' : 'لا'}\n`;
          message += `👀 متابعين: ${user.followerCount}\n`;
          message += `❤️ يتابع: ${user.followingCount}\n`;
          message += `⭐️ عدد الإعجابات: ${user.heartCount}\n`;
          message += `🎬 عدد الفيديوهات: ${user.videoCount}\n`;
          
          if (user.avatarLarger) {
            await bot.sendPhoto(chatId, user.avatarLarger, { caption: message });
          } else {
            await bot.sendMessage(chatId, message);
          }
        } else {
          await bot.sendMessage(chatId, "❌ لم يتم العثور على معلومات لهذا المستخدم.");
        }
      } catch (error) {
        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء جلب معلومات TikTok. الرجاء المحاولة مرة أخرى.");
      }
      
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'shortener') {
      await bot.sendMessage(chatId, "⏳ جاري اختصار الرابط...");
      
      try {
        const shortUrl = `${SHORTENER_API}${encodeURIComponent(text)}`;
        await bot.sendMessage(chatId, `🔗 الرابط المختصر:\n${shortUrl}`);
      } catch (error) {
        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء اختصار الرابط. الرجاء المحاولة مرة أخرى.");
      }
      
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'insta_info') {
      await bot.sendMessage(chatId, "⏳ جاري جلب معلومات Instagram...");
      
      try {
        const instaInfo = await getInstagramInfo(text);
        
        if (instaInfo && instaInfo.username) {
          let message = `📷 معلومات Instagram لـ ${instaInfo.username}:\n\n`;
          message += `👤 الاسم الكامل: ${instaInfo.full_name}\n`;
          message += `📝 البايو: ${instaInfo.biography || 'لا يوجد'}\n`;
          message += `✅ موثوق: ${instaInfo.is_verified ? 'نعم' : 'لا'}\n`;
          message += `🔒 خاص: ${instaInfo.is_private ? 'نعم' : 'لا'}\n`;
          message += `👀 متابعين: ${instaInfo.followers}\n`;
          message += `❤️ يتابع: ${instaInfo.following}\n`;
          message += `📸 عدد المنشورات: ${instaInfo.posts}\n`;
          
          if (instaInfo.profile_pic_url) {
            await bot.sendPhoto(chatId, instaInfo.profile_pic_url, { caption: message });
          } else {
            await bot.sendMessage(chatId, message);
          }
        } else {
          await bot.sendMessage(chatId, "❌ لم يتم العثور على معلومات لهذا المستخدم.");
        }
      } catch (error) {
        await bot.sendMessage(chatId, "❌ حدث خطأ أثناء جلب معلومات Instagram. الرجاء المحاولة مرة أخرى.");
      }
      
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'add_web_button') {
      if (!isAdmin(userId)) return;
      
      const parts = text.split('|');
      if (parts.length !== 2) {
        await bot.sendMessage(chatId, "❌ التنسيق غير صحيح. الرجاء استخدام:\nنص الزر|الرابط");
        return;
      }
      
      const buttonText = parts[0].trim();
      const buttonUrl = parts[1].trim();
      
      if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
        await bot.sendMessage(chatId, "❌ الرابط يجب أن يبدأ بـ http:// أو https://");
        return;
      }
      
      const dataObj = loadData();
      dataObj.buttons.push({ text: buttonText, url: buttonUrl });
      saveData(dataObj);
      
      await bot.sendMessage(chatId, `✅ تم إضافة الزر "${buttonText}" بنجاح.`);
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'add_channel') {
      if (!isAdmin(userId)) return;
      
      let channelId = text.trim();
      let channelName = "قناة";
      
      // استخراج معرف القناة من الرابط إذا كان رابطاً
      if (text.includes('t.me/')) {
        const match = text.match(/t\.me\/(.+)/);
        if (match && match[1]) {
          channelId = `@${match[1]}`;
        }
      }
      
      // الحصول على معلومات القناة
      try {
        const chat = await bot.getChat(channelId);
        channelId = chat.id;
        channelName = chat.title;
      } catch (error) {
        await bot.sendMessage(chatId, "❌ لا يمكن الوصول إلى القناة. تأكد من أن البوت مشرف فيها.");
        return;
      }
      
      const channelsData = loadChannels();
      if (channelsData.channels.some(ch => ch.id === channelId)) {
        await bot.sendMessage(chatId, "❌ هذه القناة مضافه مسبقاً.");
        return;
      }
      
      channelsData.channels.push({ id: channelId, name: channelName, username: channelId.startsWith('@') ? channelId.slice(1) : null });
      saveChannels(channelsData);
      
      await bot.sendMessage(chatId, `✅ تم إضافة قناة "${channelName}" بنجاح.`);
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'change_columns') {
      if (!isAdmin(userId)) return;
      
      const columns = parseInt(text);
      if (isNaN(columns) || columns < 1 || columns > 4) {
        await bot.sendMessage(chatId, "❌ عدد الأعمدة يجب أن يكون بين 1 و 4.");
        return;
      }
      
      COLUMNS = columns;
      await bot.sendMessage(chatId, `✅ تم تغيير عدد الأعمدة إلى ${columns}.`);
      delete user_sessions[chatId];
    }
    else if (user_sessions[chatId].action === 'reorder_services') {
      if (!isAdmin(userId)) return;
      
      const servicesList = text.split(',').map(s => s.trim());
      const validServices = ["translation", "visa", "image", "video", "tiktok", "file_check", "site_download", "shortener", "insta_info"];
      
      // التحقق من أن جميع الخدمات المدرجة صحيحة
      const invalidServices = servicesList.filter(s => !validServices.includes(s));
      if (invalidServices.length > 0) {
        await bot.sendMessage(chatId, `❌ الخدمات التالية غير صحيحة: ${invalidServices.join(', ')}`);
        return;
      }
      
      // التحقق من أن جميع الخدمات الأساسية موجودة
      const missingServices = validServices.filter(s => !servicesList.includes(s));
      if (missingServices.length > 0) {
        await bot.sendMessage(chatId, `❌ الخدمات التالية مفقودة: ${missingServices.join(', ')}`);
        return;
      }
      
      const dataObj = loadData();
      dataObj.services_order = servicesList;
      saveData(dataObj);
      
      await bot.sendMessage(chatId, "✅ تم إعادة ترتيب الخدمات بنجاح.");
      delete user_sessions[chatId];
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, "❌ حدث خطأ أثناء معالجة طلبك.");
    delete user_sessions[chatId];
  }
});

// معالجة الملفات المرسلة
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  
  if (!user_sessions[chatId] || user_sessions[chatId].action !== 'file_check') return;
  
  try {
    const fileId = msg.document.file_id;
    const fileName = msg.document.file_name;
    const fileSize = msg.document.file_size;
    
    if (fileSize > 32 * 1024 * 1024) { // 32MB limit
      await bot.sendMessage(chatId, "❌ حجم الملف كبير جداً. الحد الأقصى هو 32MB.");
      return;
    }
    
    await bot.sendMessage(chatId, "⏳ جاري فحص الملف...");
    
    const fileStream = bot.getFileStream(fileId);
    const chunks = [];
    
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    
    const fileBuffer = Buffer.concat(chunks);
    const result = await checkFileWithVirusTotal(fileBuffer, fileName);
    
    if (result.success) {
      let message = `🔍 نتيجة فحص الملف "${fileName}":\n\n`;
      message += `🦠 ضار: ${result.malicious}\n`;
      message += `⚠️ مشبوه: ${result.suspicious}\n`;
      message += `✅ نظيف: ${result.harmless}\n`;
      message += `❓ غير مفحوص: ${result.undetected}\n\n`;
      
      if (result.malicious > 0) {
        message += "❌ هذا الملف ضار! لا تقم بفتحه.";
      } else if (result.suspicious > 0) {
        message += "⚠️ هذا الملف مشبوه. كن حذراً عند فتحه.";
      } else {
        message += "✅ هذا الملف آمن للاستخدام.";
      }
      
      message += `\n\n🔐 SHA256: \`${result.sha256}\``;
      
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, `❌ فشل فحص الملف: ${result.error}`);
    }
    
    delete user_sessions[chatId];
  } catch (error) {
    console.error('Error handling document:', error);
    await bot.sendMessage(chatId, "❌ حدث خطأ أثناء فحص الملف.");
    delete user_sessions[chatId];
  }
});

console.log('Bot is running...');