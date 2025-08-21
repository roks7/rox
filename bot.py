import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters
from telegram.error import BadRequest
import json
import os
import random
import aiohttp
from urllib.parse import quote, quote_plus
import re
import requests
from io import BytesIO
import threading
import asyncio
import tempfile
import qrcode
import base64
import time
from datetime import datetime
import cv2
import numpy as np
from PIL import Image

# تمكين التسجيل
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# بيانات البوت
TOKEN = "8018964869:AAHevMgPMsip0CKx4-virvESUiNdcRRcKz8"
ADMIN_ID = 6808883615  # آيدي المشرف

# ملف التخزين
DATA_FILE = "bot_data.json"
CHANNELS_FILE = "channels_data.json"
QRCODES_FILE = "qrcodes_data.json"  # ملف جديد لتخزين الباركودات

# عدد الأعمدة المطلوبة للأزرار
COLUMNS = 2

# API إنشاء الصور
AI_API_URL = 'https://ai-api.magicstudio.com/api/ai-art-generator'

# API إنشاء الفيديو
VIDEO_API_BASE = "https://api.yabes-desu.workers.dev/ai/tool/txt2video"

# لغات الترجمة المدعومة
SUPPORTED_LANGUAGES = {
    "العربية": "ar",
    "الإنجليزية": "en",
    "الإسبانية": "es",
    "الفرنسية": "fr",
    "الألمانية": "de",
    "الإيطالية": "it",
    "البرتغالية": "pt",
    "روسية": "ru",
    "الصينية": "zh",
    "اليابانية": "ja",
    "الكورية": "ko",
    "التركية": "tr",
    "الفارسية": "fa",
    "العبرية": "he"
}

# BINs شائعة للفيزا
COMMON_VISA_BINS = [
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
]

# ألوان للطباعة في الكونسول (لأغراض التصحيح)
Z = '\033[1;31m'  # احمر
X = '\033[1;33m'  # اصفر
F = '\033[2;32m'  # اخضر
C = '\033[2;35m'  # وردي
W = "\033[1;37m"  # أبيض

# متغيرات عالمية لصيد اليوزرات
insta = "1234567890qwertyuiopasdfghjklzxcvbnm"
all_chars = "_."
insta_user_sessions = {}
insta_good_users_cache = {}

# تحميل البيانات
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {"buttons": []}

# حفظ البيانات
def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f)

# تحميل قنوات الاشتراك
def load_channels():
    if os.path.exists(CHANNELS_FILE):
        with open(CHANNELS_FILE, 'r') as f:
            return json.load(f)
    return {"channels": []}

# حفظ قنوات الاشتراك
def save_channels(data):
    with open(CHANNELS_FILE, 'w') as f:
        json.dump(data, f)

# تحميل الباركودات
def load_qrcodes():
    if os.path.exists(QRCODES_FILE):
        with open(QRCODES_FILE, 'r') as f:
            return json.load(f)
    return {"qrcodes": []}

# حفظ الباركودات
def save_qrcodes(data):
    with open(QRCODES_FILE, 'w') as f:
        json.dump(data, f)

# تحقق من صلاحية المشرف
def is_admin(user_id):
    return user_id == ADMIN_ID

# استخراج يوزر القناة من النص
def extract_channel_username(text):
    # البحث عن يوزر القناة (باستخدام @ أو بدون)
    patterns = [
        r'@([a-zA-Z0-9_]{5,})',  # @username
        r't\.me/([a-zA-Z00-9_]{5,})',  # t.me/username
        r'https?://t\.me/([a-zA-Z0-9_]{5,})',  # https://t.me/username
        r'([a-zA-Z0-9_]{5,})'  # username فقط
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).lower()
    
    return None

# الحصول على معلومات القناة من اليوزر
async def get_channel_info(context, username):
    try:
        # محاولة الحصول على معلومات القناة
        chat = await context.bot.get_chat(f"@{username}")
        
        return {
            "id": str(chat.id),
            "username": username,
            "name": chat.title,
            "type": chat.type
        }
    except BadRequest as e:
        if "chat not found" in str(e).lower():
            return {"error": "القناة غير موجودة أو لا يمكن الوصول لها"}
        else:
            return {"error": f"خطأ: {str(e)}"}
    except Exception as e:
        return {"error": f"خطأ غير متوقع: {str(e)}"}

# التحقق من اشتراك المستخدم في القنوات المطلوبة
async def check_user_subscription(user_id, context):
    channels = load_channels()["channels"]
    
    if not channels:
        return True  # لا توجد قنوات اشتراك إجباري
    
    for channel in channels:
        try:
            chat_member = await context.bot.get_chat_member(channel["id"], user_id)
            if chat_member.status in ['left', 'kicked']:
                return False
        except BadRequest:
            # إذا لم يستطع البوت الوصول للقناة أو المستخدم غير موجود
            return False
        except Exception as e:
            logging.error(f"Error checking subscription: {e}")
            return False
    
    return True

# دالة لترتيب الأزرار في أعمدة
def arrange_buttons_in_columns(buttons_list, columns=COLUMNS):
    keyboard = []
    for i in range(0, len(buttons_list), columns):
        row = buttons_list[i:i+columns]
        keyboard.append(row)
    return keyboard

# تطبيق خوارزمية لوهن (Luhn algorithm) للتحقق من صحة رقم البطاقة
def luhn_check(card_number):
    def digits_of(n):
        return [int(d) for d in str(n)]
    
    digits = digits_of(card_number)
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]
    checksum = sum(odd_digits)
    
    for d in even_digits:
        checksum += sum(digits_of(d * 2))
    
    return checksum % 10 == 0

# توليد رقم بطاقة صحيح باستخدام خوارزمية لوهن
def generate_valid_card(bin):
    # توليد الأرقام العشوائية
    length = 16 - len(bin)
    random_part = ''.join([str(random.randint(0, 9)) for _ in range(length - 1)])
    
    # حساب checksum باستخدام خوارزمية لوهن
    base_number = bin + random_part
    checksum = 0
    for i, digit in enumerate(base_number):
        n = int(digit)
        if (i + len(bin)) % 2 == 0:
            n *= 2
            if n > 9:
                n -= 9
        checksum += n
    
    checksum_digit = (10 - (checksum % 10)) % 10
    card_number = base_number + str(checksum_digit)
    
    return card_number

# توليد فيزا حقيقي مع بيانات واقعية
def generate_realistic_visa():
    # اختيار BIN عشوائي من القائمة
    bin = random.choice(COMMON_VISA_BINS)
    
    # توليد رقم بطاقة صحيح
    card_number = generate_valid_card(bin)
    
    # تنسيق الرقم للعرض
    formatted_number = ' '.join([card_number[i:i+4] for i in range(0, 16, 4)])
    
    # توليد تاريخ انتهاء واقعي (ليس في الماضي)
    current_year = 2024
    month = random.randint(1, 12)
    year = random.randint(current_year, current_year + 5)
    
    # تنسيق التاريخ
    expiry_date = f"{month:02d}/{str(year)[2:]}"
    
    # توليد CVV واقعي
    cvv = f"{random.randint(0, 999):03d}"
    
    # توليد اسم حامل البطاقة (عشوائي)
    first_names = ["AHMED", "MOHAMMED", "ALI", "OMAR", "KHALED", "HASSAN", "HUSSEIN", "IBRAHIM", "YOUSEF", "ABDULLAH"]
    last_names = ["ALI", "HASSAN", "HUSSEIN", "ABDULRAHMAN", "ALSAUD", "ALGHAMDI", "ALOTAIBI", "ALAMRI", "ALSHEHRI", "ALZAHRANI"]
    
    card_holder = f"{random.choice(first_names)} {random.choice(last_names)}"
    
    return formatted_number, expiry_date, cvv, card_holder

# ترجمة النص إلى الإنجليزية
def translate_to_english(text):
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q={requests.utils.quote(text)}"
        response = requests.get(url)
        response.raise_for_status()
        result = response.json()
        return result[0][0][0]
    except:
        return text  # إذا فشلت الترجمة، نرجع النص الأصلي

# إنشاء صورة بالذكاء الاصطناعي
async def create_ai_image(prompt):
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,ar;q=0.8",
        "origin": "https://magicstudio.com",
        "priority": "u=1, i",
        "referer": "https://magicstudio.com/ai-art-generator/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
    }
    
    data = {
        'prompt': prompt,
        'output_format': 'bytes',
        'user_profile_id': 'null',
        'user_is_subscribed': 'true'
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(AI_API_URL, headers=headers, data=data) as response:
            response.raise_for_status()
            return await response.read()

# دالة فحص يوزر Instagram (معدلة)
def check_instagram_user(user):
    try:
        url = f'https://www.instagram.com/{user}/'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        # إذا كانت الصفحة تحتوي على "Sorry, this page isn't available" فاليوزر غير متاح
        if response.status_code == 404 or "Sorry, this page isn't available" in response.text:
            return True  # اليوزر متاح للتسجيل
        elif response.status_code == 200:
            return False  # اليوزر موجود وغير متاح
        else:
            return False  # في حالة وجود أي خطأ آخر
            
    except requests.exceptions.RequestException:
        return False
    except Exception as e:
        logging.error(f"Error checking user {user}: {e}")
        return False

# إنشاء يوزرات خماسية
def generate_5char_users(count):
    users = []
    for _ in range(count):
        user = ''.join(random.choice(insta) for _ in range(5))
        users.append(user)
    return users

# إنشاء يوزرات منوعة (بين 4-6 أحرف)
def generate_mixed_users(count, min_length=4, max_length=6):
    users = []
    for _ in range(count):
        length = random.randint(min_length, max_length)
        user = ''.join(random.choice(insta) for _ in range(length))
        users.append(user)
    return users

# إنشاء يوزرات سداسية
def generate_6char_users(count):
    users = []
    for _ in range(count):
        user = ''.join(random.choice(insta) for _ in range(6))
        users.append(user)
    return users

# إنشاء يوزرات مع underscores ونقاط
def generate_special_users(count, min_length=4, max_length=6):
    users = []
    for _ in range(count):
        length = random.randint(min_length, max_length)
        user_chars = []
        for i in range(length):
            if i > 0 and i < length - 1 and random.random() < 0.3:
                user_chars.append(random.choice(all_chars))
            else:
                user_chars.append(random.choice(insta))
        user = ''.join(user_chars)
        users.append(user)
    return users

# فحص مجموعة من اليوزرات
def check_users_batch(users):
    good_users = []
    for user in users:
        if check_instagram_user(user):
            good_users.append(user)
            logging.info(f"Found available username: {user}")
        if len(good_users) >= 5:
            break
    return good_users

# عملية الفحص الرئيسية
async def instagram_check_process(chat_id, application, user_type, min_length=None, max_length=None):
    insta_user_sessions[chat_id] = True
    total_checked = 0
    found_users = 0
    
    # تحديد نوع اليوزرات المطلوبة
    if user_type == '5char':
        type_name = "يوزرات خماسية"
        generate_func = generate_5char_users
    elif user_type == '6char':
        type_name = "يوزرات سداسية"
        generate_func = generate_6char_users
    elif user_type == 'mixed':
        type_name = "يوزرات منوعة"
        generate_func = generate_mixed_users
    elif user_type == 'special':
        type_name = "يوزرات خاصة"
        generate_func = generate_special_users
    else:
        type_name = "يوزرات مخصصة"
        def generate_func(count):
            return generate_mixed_users(count, min_length, max_length)
    
    # إرسال رسالة البدء
    await application.bot.send_message(chat_id, f"🔍 بدء البحث عن {type_name}...")
    
    good_users = []
    batch_size = 10  # تقليل الحجم لتفادي الحظر
    
    while insta_user_sessions.get(chat_id, False) and len(good_users) < 5:
        try:
            # إنشاء يوزرات جديدة
            users_batch = generate_func(batch_size)
            
            # فحص اليوزرات
            found_batch = check_users_batch(users_batch)
            good_users.extend(found_batch)
            
            total_checked += len(users_batch)
            found_users = len(good_users)
            
            # إرسال تحديث كل 50 يوزر
            if total_checked % 50 == 0:
                await application.bot.send_message(
                    chat_id, 
                    f"📊 تم فحص {total_checked} يوزر | وجدنا {found_users}/5 يوزرات جيدة"
                )
            
            # إضافة تأخير لتجنب الحظر
            await asyncio.sleep(1)
            
        except Exception as e:
            logging.error(f"Error in check process: {e}")
            await asyncio.sleep(2)
    
    # إرسال النتائج النهائية
    if good_users:
        if chat_id not in insta_good_users_cache:
            insta_good_users_cache[chat_id] = []
        insta_good_users_cache[chat_id].extend(good_users)
        
        users_list = "\n".join([f"• `{user}`" for user in good_users])
        final_message = f"""✅ تم العثور على {len(good_users)} يوزرات متاحة!

📝 النوع: {type_name}
🎯 اليوزرات المتاحة:

{users_list}

📊 إجمالي المفحوصة: {total_checked}
🔄 اضغط /insta_check لبدء فحص جديد"""
    else:
        final_message = f"""❌ لم يتم العثور على يوزرات متاحة

📊 إجمالي المفحوصة: {total_checked}
🔄 اضغط /insta_check لبدء فحص جديد"""
    
    await application.bot.send_message(chat_id, final_message, parse_mode='Markdown')
    insta_user_sessions[chat_id] = False

# جلب الفيديو من API
async def fetch_video(prompt: str) -> BytesIO:
    try:
        url = f"{VIDEO_API_BASE}?prompt={quote_plus(prompt)}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=300) as response:
                if response.status == 200:
                    video_data = await response.read()
                    return BytesIO(video_data)
                else:
                    raise Exception(f"API returned status {response.status}")
    except Exception as e:
        logging.error(f"Error fetching video: {e}")
        raise

# معالجة إنشاء الفيديو
async def handle_video_generation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_video_prompt", False):
        prompt = update.message.text
        
        if not prompt.strip():
            await update.message.reply_text("يرجى إرسال وصف صالح للفيديو.")
            return
        
        # إظهار رسالة الانتظار
        wait_msg = await update.message.reply_text("⏳ جاري إنشاء الفيديو... قد يستغرق هذا عدة دقائق")
        
        try:
            # إنشاء الفيديو
            video_buffer = await fetch_video(prompt)
            
            # إرسال الفيديو
            await context.bot.send_video(
                chat_id=update.message.chat_id,
                video=video_buffer,
                caption=f"🎬 الفيديو المنشأ للوصف: {prompt}",
                supports_streaming=True
            )
            
            await wait_msg.delete()
            
        except Exception as e:
            logging.error(f"Error generating video: {e}")
            await wait_msg.edit_text("❌ حدث خطأ أثناء إنشاء الفيديو. يرجى المحاولة مرة أخرى.")
        
        context.user_data["awaiting_video_prompt"] = False
        return

# إنشاء باركود من نص
def generate_qrcode(text, qr_id):
    try:
        # إنشاء كائن QRCode
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(text)
        qr.make(fit=True)
        
        # إنشاء صورة الباركود
        img = qr.make_image(fill_color="black", back_color="white")
        
        # حفظ الصورة في ملف مؤقت
        temp_file = f"temp_qr_{qr_id}.png"
        img.save(temp_file)
        
        return temp_file
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        return None

# قراءة الباركود من الصورة
def read_qrcode(image_path):
    try:
        # قراءة الصورة
        image = cv2.imread(image_path)
        
        # إنشاء كاشف الباركود
        detector = cv2.QRCodeDetector()
        
        # اكتشاف وفك تشفير الباركود
        data, vertices_array, binary_qrcode = detector.detectAndDecode(image)
        
        if vertices_array is not None:
            return data
        else:
            return None
    except Exception as e:
        logging.error(f"Error reading QR code: {e}")
        return None

# معالجة إنشاء باركود
async def create_qrcode_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    await query.message.edit_text(
        "📝 لإنشاء باركود جديد، أرسل النص الذي تريد تحويله إلى باركود.\n\n"
        "يمكنك إرسال أي نص مثل:\n"
        "• رابط موقع (https://example.com)\n"
        "• نص عادي\n"
        "• معلومات اتصال\n"
        "• أي محتوى تريد تخزينه في باركود"
    )
    
    context.user_data["awaiting_qr_text"] = True
    context.user_data["qr_action"] = "create"

# معالجة قراءة باركود
async def read_qrcode_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    await query.message.edit_text(
        "📷 أرسل لي صورة الباركود الذي تريد قراءته.\n\n"
        "يمكنك إرسال الصورة كملف أو كصورة مباشرة."
    )
    
    context.user_data["awaiting_qr_image"] = True
    context.user_data["qr_action"] = "read"

# معالجة نص الباركود
async def handle_qr_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_qr_text", False):
        qr_text = update.message.text
        
        if not qr_text.strip():
            await update.message.reply_text("❌ يرجى إرسال نص صالح للباركود.")
            return
        
        # إنشاء معرف فريد للباركود
        qr_id = str(int(time.time())) + str(random.randint(1000, 9999))
        
        # إنشاء الباركود
        qr_file = generate_qrcode(qr_text, qr_id)
        
        if qr_file:
            # إرسال الباركود للمستخدم
            with open(qr_file, 'rb') as f:
                await update.message.reply_photo(
                    photo=f,
                    caption=f"✅ تم إنشاء الباركود بنجاح!\n\n"
                           f"📄 المحتوى: {qr_text}\n\n"
                           f"🔍 يمكنك الآن مشاركة هذا الباركود أو حفظه."
                )
            
            # تنظيف البيانات المؤقتة
            context.user_data["awaiting_qr_text"] = False
            context.user_data["qr_action"] = None
            
            # حذف الملف المؤقت
            if os.path.exists(qr_file):
                os.remove(qr_file)
        else:
            await update.message.reply_text("❌ حدث خطأ أثناء إنشاء الباركود. يرجى المحاولة مرة أخرى.")
        
        return

# معالجة صورة الباركود
async def handle_qr_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_qr_image", False):
        # التحقق من وجود صورة
        if not update.message.photo and not update.message.document:
            await update.message.reply_text("❌ يرجى إرسال صورة الباركود.")
            return
        
        try:
            # الحصول على ملف الصورة
            if update.message.photo:
                photo_file = await update.message.photo[-1].get_file()
            else:
                photo_file = await update.message.document.get_file()
            
            # حفظ الصورة مؤقتاً
            temp_file = f"temp_qr_read_{update.message.chat_id}.jpg"
            await photo_file.download_to_drive(temp_file)
            
            # قراءة الباركود
            qr_data = read_qrcode(temp_file)
            
            if qr_data:
                await update.message.reply_text(
                    f"✅ تم قراءة الباركود بنجاح!\n\n"
                    f"📄 المحتوى: {qr_data}"
                )
            else:
                await update.message.reply_text("❌ لم أستطع قراءة الباركود من الصورة. يرجى المحاولة بصورة أخرى.")
            
            # تنظيف البيانات المؤقتة
            context.user_data["awaiting_qr_image"] = False
            context.user_data["qr_action"] = None
            
            # حذف الملف المؤقت
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
        except Exception as e:
            logging.error(f"Error handling QR image: {e}")
            await update.message.reply_text("❌ حدث خطأ أثناء معالجة الصورة. يرجى المحاولة مرة أخرى.")
        
        return

# أمر البدء مع التحقق من الاشتراك
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # التحقق من اشتراك المستخدم
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required(update, context)
        return
    
    data = load_data()
    
    # إنشاء أزرار المواقع
    buttons_list = []
    for btn in data["buttons"]:
        buttons_list.append(InlineKeyboardButton(
            btn["text"], 
            web_app=WebAppInfo(url=btn["url"])
        ))
    
    # ترتيب الأزرار في أعمدة
    keyboard = arrange_buttons_in_columns(buttons_list)
    
    # إضافة أزرار الخدمات الثابتة
    keyboard.append([InlineKeyboardButton("توليد فيزا 💳", callback_data="generate_visa")])
    keyboard.append([InlineKeyboardButton("خدمة الترجمة 🌐", callback_data="translation_service")])
    keyboard.append([InlineKeyboardButton("إنشاء صور 🎨", callback_data="generate_image")])
    keyboard.append([InlineKeyboardButton("إنشاء فيديو 🎬", callback_data="generate_video")])
    keyboard.append([InlineKeyboardButton("صيد يوزرات انستا 🔍", callback_data="instagram_hunt")])
    
    # إضافة أزرار الباركود المنفصلة
    keyboard.append([InlineKeyboardButton("إنشاء باركود 📊", callback_data="create_qrcode")])
    keyboard.append([InlineKeyboardButton("قراءة باركود 📷", callback_data="read_qrcode")])
    
    # إضافة الأزرار الجديدة
    keyboard.append([InlineKeyboardButton("مطور البوت 👨‍💻", url="https://t.me/QR_l4")])
    keyboard.append([InlineKeyboardButton("المزيد من المميزات 🚀", url="https://t.me/VIP_H3bot")])
    
    # إضافة زر الإدارة للمشرف فقط
    if is_admin(user_id):
        keyboard.append([InlineKeyboardButton("الإدارة ⚙️", callback_data="admin_panel")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "مرحباً! هذه قائمة الخدمات المتاحة:",
        reply_markup=reply_markup
    )

# عرض رسالة الاشتراك الإجباري
async def show_subscription_required(update: Update, context: ContextTypes.DEFAULT_TYPE):
    channels = load_channels()["channels"]
    
    keyboard = []
    for channel in channels:
        keyboard.append([InlineKeyboardButton(f"اشترك في {channel['name']}", url=f"https://t.me/{channel['username']}")])
    
    keyboard.append([InlineKeyboardButton("✅ تحقق من الاشتراك", callback_data="check_subscription")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "⚠️ يجب عليك الاشتراك في القنوات التالية لاستخدام البوت:",
        reply_markup=reply_markup
    )

# التحقق من الاشتراك
async def check_subscription(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if is_subscribed:
        await query.message.delete()
        await start_from_callback(query, context)
    else:
        await query.answer("لم تشترك في جميع القنوات بعد!", show_alert=True)

# بدء البوت من callback
async def start_from_callback(query, context):
    user_id = query.from_user.id
    data = load_data()
    
    # إنشاء أزرار المواقع
    buttons_list = []
    for btn in data["buttons"]:
        buttons_list.append(InlineKeyboardButton(
            btn["text"], 
            web_app=WebAppInfo(url=btn["url"])
        ))
    
    # ترتيب الأزرار في أعمدة
    keyboard = arrange_buttons_in_columns(buttons_list)
    
    # إضافة أزرار الخدمات الثابتة
    keyboard.append([InlineKeyboardButton("توليد فيزا 💳", callback_data="generate_visa")])
    keyboard.append([InlineKeyboardButton("خدمة الترجمة 🌐", callback_data="translation_service")])
    keyboard.append([InlineKeyboardButton("إنشاء صور 🎨", callback_data="generate_image")])
    keyboard.append([InlineKeyboardButton("إنشاء فيديو 🎬", callback_data="generate_video")])
    keyboard.append([InlineKeyboardButton("صيد يوزرات انستا 🔍", callback_data="instagram_hunt")])
    
    # إضافة أزرار الباركود المنفصلة
    keyboard.append([InlineKeyboardButton("إنشاء باركود 📊", callback_data="create_qrcode")])
    keyboard.append([InlineKeyboardButton("قراءة باركود 📷", callback_data="read_qrcode")])
    
    # إضافة الأزرار الجديدة
    keyboard.append([InlineKeyboardButton("مطور البوت 👨‍💻", url="https://t.me/QR_l4")])
    keyboard.append([InlineKeyboardButton("المزيد من المميزات 🚀", url="https://t.me/VIP_H3bot")])
    
    if is_admin(user_id):
        keyboard.append([InlineKeyboardButton("الإدارة ⚙️", callback_data="admin_panel")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await context.bot.send_message(
        chat_id=query.message.chat_id,
        text="مرحباً! هذه قائمة الخدمات المتاحة:",
        reply_markup=reply_markup
    )

# توليد فيزا
async def generate_visa_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # التحقق من الاشتراك
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    card_number, expiry, cvv, card_holder = generate_realistic_visa()
    
    await query.message.reply_text(
        f"💳 **بطاقة فيزا محاكاة:**\n\n"
        f"**الرقم:** `{card_number}`\n"
        f"**تاريخ الانتهاء:** `{expiry}`\n"
        f"**CVV:** `{cvv}`\n"
        f"**حامل البطاقة:** `{card_holder}`\n\n"
        "⚠️ *ملاحظة: هذه أرقام محاكاة للاختبار فقط وليست حقيقية*",
        parse_mode="Markdown"
    )

# خدمة الترجمة
async def translation_service(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # التحقق من الاشتراك
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    # إنشاء لوحة اختيار اللغة المصدر
    keyboard = []
    lang_list = list(SUPPORTED_LANGUAGES.keys())
    
    for i in range(0, len(lang_list), 2):
        row = []
        if i < len(lang_list):
            row.append(InlineKeyboardButton(lang_list[i], callback_data=f"src_lang_{SUPPORTED_LANGUAGES[lang_list[i]]}"))
        if i+1 < len(lang_list):
            row.append(InlineKeyboardButton(lang_list[i+1], callback_data=f"src_lang_{SUPPORTED_LANGUAGES[lang_list[i+1]]}"))
        keyboard.append(row)
    
    keyboard.append([InlineKeyboardButton("إلغاء ❌", callback_data="back_to_main")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "اختر اللغة المصدر للنص الذي تريد ترجمته:",
        reply_markup=reply_markup
    )

# إنشاء صور
async def generate_image_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # التحقق من الاشتراك
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    await query.message.edit_text(
        "🎨 **إنشاء صور بالذكاء الاصطناعي**\n\n"
        "أرسل لي وصفاً للصورة التي تريد إنشاءها.\n\n"
        "مثال:\n"
        "• منظر غروب الشمس على البحر\n"
        "• قطة لطيفة تجلس على كرسي\n"
        "• منزل حديث في غابة\n\n"
        "سيقوم البوت بإنشاء صورة فريدة based على وصفك!"
    )
    
    context.user_data["awaiting_image_prompt"] = True

# إنشاء فيديو
async def generate_video_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # التحقق من الاشتراك
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    await query.message.edit_text(
        "🎬 **إنشاء فيديو بالذكاء الاصطناعي**\n\n"
        "أرسل لي وصفاً للفيديو الذي تريد إنشاءه.\n\n"
        "مثال:\n"
        "• شاب يجري تحت المطر\n"
        "• منظر مدينة مستقبلية\n"
        "• طبيعة خلابة مع شلال\n\n"
        "⚠️ قد يستغرق إنشاء الفيديو عدة دقائق"
    )
    
    context.user_data["awaiting_video_prompt"] = True

# معالجة إنشاء الصور
async def handle_image_generation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_image_prompt", False):
        prompt = update.message.text
        
        if not prompt.strip():
            await update.message.reply_text("يرجى إرسال وصف صالح للصورة.")
            return
        
        # إظهار رسالة الانتظار
        wait_msg = await update.message.reply_text("⏳ جاري إنشاء الصورة... قد يستغرق هذا بضع ثوانٍ")
        
        try:
            # ترجمة الوصف إلى الإنجليزية
            english_prompt = translate_to_english(prompt)
            
            # إنشاء الصورة
            image_data = await create_ai_image(english_prompt)
            
            # إرسال الصورة
            await context.bot.send_photo(
                chat_id=update.message.chat_id,
                photo=image_data,
                caption=f"🖼️ الصورة المنشأة للوصف: {prompt}"
            )
            
            await wait_msg.delete()
            
        except Exception as e:
            logging.error(f"Error generating image: {e}")
            await wait_msg.edit_text("❌ حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى.")
        
        context.user_data["awaiting_image_prompt"] = False
        return

# معالجة زر صيد اليوزرات
async def instagram_hunt_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    # عرض قائمة أنواع اليوزرات
    keyboard = [
        [InlineKeyboardButton("يوزرات خماسية (5 أحرف) 🔍", callback_data='insta_5char')],
        [InlineKeyboardButton("يوزرات سداسية (6 أحرف) 🔍", callback_data='insta_6char')],
        [InlineKeyboardButton("يوزرات منوعة (4-6 أحرف) 🔍", callback_data='insta_mixed')],
        [InlineKeyboardButton("يوزرات خاصة (مع _ .) 🔍", callback_data='insta_special')],
        [InlineKeyboardButton("عرض اليوزرات الموجودة 📋", callback_data='insta_show')],
        [InlineKeyboardButton("العودة ↩️", callback_data='back_to_main')]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "🎯 اختر نوع اليوزرات التي تريد صيدها:\n\n"
        "• يوزرات خماسية: 5 أحرف فقط\n"
        "• يوزرات سداسية: 6 أحرف فقط\n"
        "• يوزرات منوعة: 4-6 أحرف عشوائية\n"
        "• يوزرات خاصة: تحتوي على _ أو .",
        reply_markup=reply_markup
    )

# معالجة أنواع اليوزرات
async def handle_insta_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_type = query.data.split('_')[1]
    chat_id = query.message.chat_id
    
    # بدء عملية الفحص في thread منفصل
    thread = threading.Thread(
        target=asyncio.run,
        args=(instagram_check_process(chat_id, context.application, user_type),)
    )
    thread.daemon = True
    thread.start()
    
    await query.message.edit_text("🚀 بدأ الصيد! سأخبرك عندما أعثر على يوزرات متاحة.")

# عرض اليوزرات الموجودة
async def show_insta_users(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    chat_id = query.message.chat_id
    
    if chat_id in insta_good_users_cache and insta_good_users_cache[chat_id]:
        users_list = "\n".join([f"• `{user}`" for user in insta_good_users_cache[chat_id][-20:]])  # آخر 20 يوزر
        message = f"""📋 اليوزرات التي تم العثور عليها:

{users_list}

🎯 الإجمالي: {len(insta_good_users_cache[chat_id])} يوزر"""
    else:
        message = "❌ لم يتم العثور على أي يوزرات بعد"
    
    await query.message.edit_text(message, parse_mode='Markdown')

# إيقاف الفحص
async def stop_insta_check(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    insta_user_sessions[chat_id] = False
    await context.bot.send_message(chat_id, "⏹️ تم إيقاف صيد اليوزرات")

# أمر لبدء الصيد مباشرة
async def start_insta_check(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await instagram_hunt_callback(update, context)

# عرض رسالة الاشتراك للcallback
async def show_subscription_required_callback(query, context):
    channels = load_channels()["channels"]
    
    keyboard = []
    for channel in channels:
        keyboard.append([InlineKeyboardButton(f"اشترك في {channel['name']}", url=f"https://t.me/{channel['username']}")])
    
    keyboard.append([InlineKeyboardButton("✅ تحقق من الاشتراك", callback_data="check_subscription")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "⚠️ يجب عليك الاشتراك في القنوات التالية لاستخدام البوت:",
        reply_markup=reply_markup
    )

# اختيار اللغة المصدر
async def choose_source_language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # التحقق من الاشتراك
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    lang_code = query.data.split("_")[2]
    context.user_data["translation_source"] = lang_code
    
    # إنشاء لوحة اختيار اللغة الهدف
    keyboard = []
    lang_list = list(SUPPORTED_LANGUAGES.keys())
    
    for i in range(0, len(lang_list), 2):
        row = []
        if i < len(lang_list):
            row.append(InlineKeyboardButton(lang_list[i], callback_data=f"tgt_lang_{SUPPORTED_LANGUAGES[lang_list[i]]}"))
        if i+1 < len(lang_list):
            row.append(InlineKeyboardButton(lang_list[i+1], callback_data=f"tgt_lang_{SUPPORTED_LANGUatures[lang_list[i+1]]}"))
        keyboard.append(row)
    
    keyboard.append([InlineKeyboardButton("إلغاء ❌", callback_data="back_to_main")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # الحصول على اسم اللغة المصدر
    src_lang_name = [name for name, code in SUPPORTED_LANGUAGES.items() if code == lang_code][0]
    
    await query.message.edit_text(
        f"لقد اخترت {src_lang_name} كلغة مصدر. الآن اختر اللغة الهدف:",
        reply_markup=reply_markup
    )

# اختيار اللغة الهدف وطلب النص للترجمة
async def choose_target_language(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # التحقق من الاشتراك
    user_id = query.from_user.id
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    lang_code = query.data.split("_")[2]
    context.user_data["translation_target"] = lang_code
    
    # الحصول على أسماء اللغات
    src_lang_code = context.user_data["translation_source"]
    src_lang_name = [name for name, code in SUPPORTED_LANGUAGES.items() if code == src_lang_code][0]
    tgt_lang_name = [name for name, code in SUPPORTED_LANGUAGES.items() if code == lang_code][0]
    
    await query.message.edit_text(
        f"لقد اخترت الترجمة من {src_lang_name} إلى {tgt_lang_name}.\n\n"
        "أرسل الآن النص الذي تريد ترجمته:"
    )
    
    context.user_data["awaiting_translation"] = True

# ترجمة النص باستخدام MyMemory API
async def translate_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_translation", False):
        text_to_translate = update.message.text
        
        if not text_to_translate.strip():
            await update.message.reply_text("يرجى إرسال نص صالح للترجمة.")
            return
        
        src_lang = context.user_data.get("translation_source", "auto")
        tgt_lang = context.user_data.get("translation_target", "en")
        
        # استخدام API MyMemory للترجمة
        async with aiohttp.ClientSession() as session:
            encoded_text = quote(text_to_translate)
            url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair={src_lang}|{tgt_lang}"
            
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        translated_text = data["responseData"]["translatedText"]
                        
                        # الحصول على أسماء اللغات
                        src_lang_name = [name for name, code in SUPPORTED_LANGUAGES.items() if code == src_lang][0]
                        tgt_lang_name = [name for name, code in SUPPORTED_LANGUAGES.items() if code == tgt_lang][0]
                        
                        await update.message.reply_text(
                            f"الترجمة من {src_lang_name} إلى {tgt_lang_name}:\n\n"
                            f"النص الأصلي: {text_to_translate}\n\n"
                            f"النص المترجم: {translated_text}"
                        )
                    else:
                        await update.message.reply_text("عذراً، حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى.")
            except Exception as e:
                logging.error(f"Translation error: {e}")
                await update.message.reply_text("عذراً، حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى.")
        
        context.user_data["awaiting_translation"] = False

# لوحة تحكم المشرف
async def admin_panel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        await query.message.reply_text("ليس لديك صلاحية للوصول إلى هذه اللوحة.")
        return
    
    keyboard = [
        [InlineKeyboardButton("إضافة زر ➕", callback_data="add_button")],
        [InlineKeyboardButton("حذف زر ➖", callback_data="delete_button")],
        [InlineKeyboardButton("تغيير عدد الأعمدة 🔢", callback_data="change_columns")],
        [InlineKeyboardButton("إدارة القنوات 📢", callback_data="manage_channels")],
        [InlineKeyboardButton("العودة ↩️", callback_data="back_to_main")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "لوحة تحكم المشرف:",
        reply_markup=reply_markup
    )

# إدارة القنوات
async def manage_channels(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    keyboard = [
        [InlineKeyboardButton("إضافة قناة ➕", callback_data="add_channel")],
        [InlineKeyboardButton("حذف قناة ➖", callback_data="delete_channel")],
        [InlineKeyboardButton("عرض القنوات 📋", callback_data="view_channels")],
        [InlineKeyboardButton("العودة ↩️", callback_data="admin_panel")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "إدارة قنوات الاشتراك الإجباري:",
        reply_markup=reply_markup
    )

# إضافة قناة
async def add_channel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    await query.message.edit_text(
        "📩 أرسل يوزر القناة الآن:\n\n"
        "يمكنك إرسال:\n"
        "• @username\n"
        "• username\n"
        "• https://t.me/username\n\n"
        "سيقوم البوت تلقائياً بجمع معلومات القناة وإضافتها!"
    )
    
    context.user_data["awaiting_channel"] = True

# حذف قناة
async def delete_channel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    channels_data = load_channels()
    
    if not channels_data["channels"]:
        await query.message.edit_text("لا توجد قنوات لحذفها.")
        return
    
    # ترتيب أزرار الحذف في أعمدة
    buttons_list = []
    for i, channel in enumerate(channels_data["channels"]):
        buttons_list.append(InlineKeyboardButton(
            f"{channel['name']}", 
            callback_data=f"delete_ch_{i}"
        ))
    
    keyboard = arrange_buttons_in_columns(buttons_list, columns=2)
    keyboard.append([InlineKeyboardButton("إلغاء ❌", callback_data="manage_channels")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "اختر القناة التي تريد حذفها:",
        reply_markup=reply_markup
    )

# عرض القنوات
async def view_channels(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    channels_data = load_channels()
    
    if not channels_data["channels"]:
        await query.message.edit_text("لا توجد قنوات مضافة حالياً.")
        return
    
    channels_text = "📋 قنوات الاشتراك الإجباري:\n\n"
    for i, channel in enumerate(channels_data["channels"], 1):
        channels_text += f"{i}. {channel['name']} (@{channel['username']})\n"
    
    keyboard = [[InlineKeyboardButton("العودة ↩️", callback_data="manage_channels")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        channels_text,
        reply_markup=reply_markup
    )

# تأكيد حذف القناة
async def confirm_delete_channel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    index = int(query.data.split("_")[2])
    channels_data = load_channels()
    
    if 0 <= index < len(channels_data["channels"]):
        deleted_channel = channels_data["channels"].pop(index)
        save_channels(channels_data)
        
        await query.message.edit_text(
            f"✅ تم حذف القناة: {deleted_channel['name']} (@{deleted_channel['username']})"
        )
    else:
        await query.message.edit_text("❌ حدث خطأ أثناء الحذف.")

# معالجة إضافة زر جديد
async def add_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    await query.message.edit_text(
        "أرسل نص الزر والرابط بالتنسيق التالي:\n\n"
        "نص الزر - الرابط\n\n"
        "مثال:\n"
        "جوجل - https://google.com\n"
        "فيسبوك - https://facebook.com\n"
        "يوتيوب - https://youtube.com"
    )
    
    # حفظ حالة المستخدم للإدخال التالي
    context.user_data["awaiting_button"] = True

# معالجة حذف زر
async def delete_button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    data = load_data()
    
    if not data["buttons"]:
        await query.message.edit_text("لا توجد أزرار لحذفها.")
        return
    
    # ترتيب أزرار الحذف في أعمدة
    buttons_list = []
    for i, btn in enumerate(data["buttons"]):
        buttons_list.append(InlineKeyboardButton(
            f"{btn['text']}", 
            callback_data=f"delete_{i}"
        ))
    
    keyboard = arrange_buttons_in_columns(buttons_list, columns=2)
    keyboard.append([InlineKeyboardButton("إلغاء ❌", callback_data="admin_panel")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "اختر الزر الذي تريد حذفه:",
        reply_markup=reply_markup
    )

# معالجة تغيير عدد الأعمدة
async def change_columns(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    keyboard = [
        [InlineKeyboardButton("عمود واحد 1", callback_data="set_columns_1")],
        [InlineKeyboardButton("عمودين 2", callback_data="set_columns_2")],
        [InlineKeyboardButton("ثلاثة أعمدة 3", callback_data="set_columns_3")],
        [InlineKeyboardButton("إلغاء ❌", callback_data="admin_panel")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        f"عدد الأعمدة الحالي: {COLUMNS}\nاختر عدد الأعمدة الجديد:",
        reply_markup=reply_markup
    )

# تأكيد الحذف
async def confirm_delete(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    index = int(query.data.split("_")[1])
    data = load_data()
    
    if 0 <= index < len(data["buttons"]):
        deleted_btn = data["buttons"].pop(index)
        save_data(data)
        
        await query.message.edit_text(
            f"تم حذف الزر: {deleted_btn['text']} - {deleted_btn['url']}"
        )
    else:
        await query.message.edit_text("حدث خطأ أثناء الحذف.")

# تغيير عدد الأعمدة
async def set_columns(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    global COLUMNS
    COLUMNS = int(query.data.split("_")[2])
    
    await query.message.edit_text(
        f"تم تغيير عدد الأعمدة إلى: {COLUMNS}"
    )

# معالجة الرسائل النصية (لإضافة أزرار جديدة أو الترجمة أو القنوات أو الصور أو الفيديو)
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # معالجة إضافة أزرار جديدة
    if context.user_data.get("awaiting_button", False) and is_admin(user_id):
        text = update.message.text
        
        # التحقق من وجود فاصلة بين النص والرابط
        if " - " not in text:
            await update.message.reply_text("التنسيق غير صحيح. يرجى استخدام: نص الزر - الرابط")
            return
        
        try:
            btn_text, url = text.split(" - ", 1)
            btn_text = btn_text.strip()
            url = url.strip()
            
            # التحقق من صحة الرابط
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            
            # إضافة الزر إلى البيانات
            data = load_data()
            data["buttons"].append({"text": btn_text, "url": url})
            save_data(data)
            
            context.user_data["awaiting_button"] = False
            await update.message.reply_text(f"تم إضافة الزر بنجاح: {btn_text} - {url}")
            
        except Exception as e:
            await update.message.reply_text(f"حدث خطأ: {str(e)}")
        return
    
    # معالجة إضافة قنوات جديدة
    elif context.user_data.get("awaiting_channel", False) and is_admin(user_id):
        text = update.message.text
        
        # استخراج يوزر القناة من النص
        username = extract_channel_username(text)
        
        if not username:
            await update.message.reply_text("❌ لم أستطع التعرف على يوزر القناة. يرجى المحاولة مرة أخرى.")
            return
        
        # إظهار رسالة الانتظار
        wait_msg = await update.message.reply_text("⏳ جاري جلب معلومات القناة...")
        
        try:
            # الحصول على معلومات القناة
            channel_info = await get_channel_info(context, username)
            
            if "error" in channel_info:
                await wait_msg.edit_text(f"❌ {channel_info['error']}")
                return
            
            # التحقق من نوع القناة
            if channel_info["type"] not in ["channel", "supergroup"]:
                await wait_msg.edit_text("❌ هذا اليوزر ليس لقناة أو مجموعة超级. يجب أن تكون قناة أو مجموعة超级.")
                return
            
            # التحقق من أن البوت مشرف في القناة
            try:
                bot_member = await context.bot.get_chat_member(channel_info["id"], context.bot.id)
                if bot_member.status not in ["administrator", "creator"]:
                    await wait_msg.edit_text("❌ البوت ليس مشرفاً في هذه القناة. يرجى ترقيته إلى مشرف أولاً.")
                    return
            except BadRequest:
                await wait_msg.edit_text("❌ البوت ليس مشرفاً في هذه القناة. يرجى ترقيته إلى مشرف أولاً.")
                return
            
            # إضافة القناة إلى البيانات
            channels_data = load_channels()
            
            # التحقق من عدم وجود القناة مسبقاً
            for channel in channels_data["channels"]:
                if channel["id"] == channel_info["id"] or channel["username"] == channel_info["username"]:
                    await wait_msg.edit_text("❌ هذه القناة مضافه مسبقاً!")
                    return
            
            channels_data["channels"].append({
                "id": channel_info["id"],
                "username": channel_info["username"],
                "name": channel_info["name"]
            })
            save_channels(channels_data)
            
            context.user_data["awaiting_channel"] = False
            await wait_msg.edit_text(f"✅ تم إضافة القناة بنجاح!\n\n📢 {channel_info['name']}\n👥 @{channel_info['username']}")
            
        except Exception as e:
            await wait_msg.edit_text(f"❌ حدث خطأ: {str(e)}")
        return
    
    # معالجة الترجمة
    elif context.user_data.get("awaiting_translation", False):
        await translate_text(update, context)
        return
    
    # معالجة إنشاء الصور
    elif context.user_data.get("awaiting_image_prompt", False):
        await handle_image_generation(update, context)
        return
    
    # معالجة إنشاء الفيديو
    elif context.user_data.get("awaiting_video_prompt", False):
        await handle_video_generation(update, context)
        return
    
    # معالجة إنشاء الباركود (النص)
    elif context.user_data.get("awaiting_qr_text", False):
        await handle_qr_text(update, context)
        return
    
    # معالجة قراءة الباركود (الصورة)
    elif context.user_data.get("awaiting_qr_image", False):
        await handle_qr_image(update, context)
        return
    
    # إذا لم تكن الرسالة جزءاً من محادثة، نعيدها للقائمة الرئيسية
    else:
        await start(update, context)

# العودة للقائمة الرئيسية
async def back_to_main(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    
    # التحقق من الاشتراك
    is_subscribed = await check_user_subscription(user_id, context)
    
    if not is_subscribed:
        await show_subscription_required_callback(query, context)
        return
    
    data = load_data()
    
    # إنشاء أزرار المواقع
    buttons_list = []
    for btn in data["buttons"]:
        buttons_list.append(InlineKeyboardButton(
            btn["text"], 
            web_app=WebAppInfo(url=btn["url"])
        ))
    
    # ترتيب الأزرار في أعمدة
    keyboard = arrange_buttons_in_columns(buttons_list)
    
    # إضافة أزرار الخدمات الثابتة
    keyboard.append([InlineKeyboardButton("توليد فيزا 💳", callback_data="generate_visa")])
    keyboard.append([InlineKeyboardButton("خدمة الترجمة 🌐", callback_data="translation_service")])
    keyboard.append([InlineKeyboardButton("إنشاء صور 🎨", callback_data="generate_image")])
    keyboard.append([InlineKeyboardButton("إنشاء فيديو 🎬", callback_data="generate_video")])
    keyboard.append([InlineKeyboardButton("صيد يوزرات انستا 🔍", callback_data="instagram_hunt")])
    
    # إضافة أزرار الباركود المنفصلة
    keyboard.append([InlineKeyboardButton("إنشاء باركود 📊", callback_data="create_qrcode")])
    keyboard.append([InlineKeyboardButton("قراءة باركود 📷", callback_data="read_qrcode")])
    
    # إضافة الأزرار الجديدة
    keyboard.append([InlineKeyboardButton("مطور البوت 👨‍💻", url="https://t.me/QR_l4")])
    keyboard.append([InlineKeyboardButton("المزيد من المميزات 🚀", url="https://t.me/VIP_H3bot")])
    
    if is_admin(user_id):
        keyboard.append([InlineKeyboardButton("الإدارة ⚙️", callback_data="admin_panel")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.message.edit_text(
        "مرحباً! هذه قائمة الخدمات المتاحة:",
        reply_markup=reply_markup
    )

def main():
    # إنشاء التطبيق
    application = Application.builder().token(TOKEN).build()
    
    # إضافة المعالجات
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("generate", generate_image_callback))
    application.add_handler(CommandHandler("insta_check", start_insta_check))
    application.add_handler(CommandHandler("insta_stop", stop_insta_check))
    application.add_handler(CommandHandler("insta_list", show_insta_users))
    
    application.add_handler(CallbackQueryHandler(admin_panel, pattern="^admin_panel$"))
    application.add_handler(CallbackQueryHandler(generate_visa_callback, pattern="^generate_visa$"))
    application.add_handler(CallbackQueryHandler(translation_service, pattern="^translation_service$"))
    application.add_handler(CallbackQueryHandler(generate_image_callback, pattern="^generate_image$"))
    application.add_handler(CallbackQueryHandler(generate_video_callback, pattern="^generate_video$"))
    application.add_handler(CallbackQueryHandler(instagram_hunt_callback, pattern="^instagram_hunt$"))
    application.add_handler(CallbackQueryHandler(create_qrcode_callback, pattern="^create_qrcode$"))
    application.add_handler(CallbackQueryHandler(read_qrcode_callback, pattern="^read_qrcode$"))
    
    application.add_handler(CallbackQueryHandler(choose_source_language, pattern="^src_lang_"))
    application.add_handler(CallbackQueryHandler(choose_target_language, pattern="^tgt_lang_"))
    application.add_handler(CallbackQueryHandler(handle_insta_type, pattern="^insta_"))
    application.add_handler(CallbackQueryHandler(show_insta_users, pattern="^insta_show$"))
    application.add_handler(CallbackQueryHandler(back_to_main, pattern="^back_to_main$"))
    application.add_handler(CallbackQueryHandler(manage_channels, pattern="^manage_channels$"))
    application.add_handler(CallbackQueryHandler(add_channel, pattern="^add_channel$"))
    application.add_handler(CallbackQueryHandler(delete_channel, pattern="^delete_channel$"))
    application.add_handler(CallbackQueryHandler(view_channels, pattern="^view_channels$"))
    application.add_handler(CallbackQueryHandler(confirm_delete_channel, pattern="^delete_ch_"))
    application.add_handler(CallbackQueryHandler(add_button, pattern="^add_button$"))
    application.add_handler(CallbackQueryHandler(delete_button, pattern="^delete_button$"))
    application.add_handler(CallbackQueryHandler(change_columns, pattern="^change_columns$"))
    application.add_handler(CallbackQueryHandler(confirm_delete, pattern="^delete_"))
    application.add_handler(CallbackQueryHandler(set_columns, pattern="^set_columns_"))
    application.add_handler(CallbackQueryHandler(check_subscription, pattern="^check_subscription$"))
    
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    application.add_handler(MessageHandler(filters.PHOTO | filters.Document.IMAGE, handle_qr_image))
    
    # بدء البوت
    application.run_polling()

if __name__ == "__main__":
    main()