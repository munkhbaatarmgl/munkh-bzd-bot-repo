// ============================================
// МӨНХБААТАР.МН — Facebook Chatbot
// Vercel Serverless Function
// ============================================

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ============================================
// STATIC RESPONSES — Бэлэн хариулт ($0)
// ============================================
const STATIC = {
  greeting: `Сайн байна уу! 👋

Би Баянзүрх дүүргийн НИТХ-ын төлөөлөгч Мөнхбаатарын AI туслах.

Та надаар дамжуулж:
📝 Санал, гомдол илгээх
📍 Хороогийн мэдээ авах
👤 Намтар үзэх
🔖 Хүсэлтийн явц шалгах

боломжтой. Юугаар туслах вэ?`,

  bio: `👤 Батбилэгийн Мөнхбаатар
1985 он • Улаанбаатар

🎓 БОЛОВСРОЛ:
• 2002–2008 Санкт-Петербургийн Уул уурхайн институт — Инженер
  (П.Очирбат мөн төгссөн!)
• 2021 МУИС — Эрхзүйч

💼 АЖЛЫН ГАРАА:
• 2008 Эрдэнэс Монгол — Инженер
• 2010–2022 Эрдэнэс Тавантолгой
  Инженер → Орлогч захирал
• 2022–2024 Эрдэнэс Баянбогд — Захирал

🏛️ ОДОО (2024):
• НИТХ — БЗД 3-р тойрог (МАН)
• Blockchain Eco Park — ТУЗ дарга
• Monbeef Cattle — ТУЗ дарга
• Хариуцлагатай нүүдэлчин хоршоо — Тэргүүн

🌱 ТӨСЛҮҮД:
• Treelings — 12,000+ мод блокчейнд бүртгэсэн
• Monbeef — Сэлэнгэ үүлдрийн үхэр

🔗 linkedin.com/in/munkhbaatar-batbileg-5299a2412
🌐 мөнхбаатар.мн`,

  treelings: `🌱 Treelings төсөл

"Тэрбум мод" үндэсний хөтөлбөрийг дэмжих технологийн шийдэл.

🔗 Блокчейн технологиор:
• Мод тарих, ургуулах, хянах
• Оролцогч талуудыг бүртгэлжүүлэх
• Улс орон даяар мод тарих боломж

📊 Одоогийн байдал:
• 2,000+ хэрэглэгч
• 12,000+ мод бүртгэлтэй

🌐 treelings.org`,

  monbeef: `🥩 Monbeef Cattle

Эрүүл, чанарын баталгаатай мах үйлдвэрлэх зорилготой.

📍 Булган аймгийн Сэлэнгэ суманд:
• 40 жилийн түүхтэй Сэлэнгэ үүлдрийн үхрийн цөм сүрэг сэргээж байна
• Малын удмын сан бүртгэлжүүлсэн
• Монголчуудыг эрүүл хүнсээр хангах

Мөнхбаатар ТУЗ-ийн даргаар ажиллаж байна.`,

  contact: `📞 Холбоо барих:

🌐 мөнхбаатар.мн
📘 Facebook: Мөнхбаатар БЗД
📸 Instagram: @munkh_bzd
💼 linkedin.com/in/munkhbaatar-batbileg-5299a2412

Санал хүсэлтээ энд ч бичиж болно 👇`,

  thanks: `Баярлалаа 🙏

Танд туслах боломж олдсонд баяртай байна. Цаашид ч санал хүсэлтээ илгээгээрэй!`,

  unknown: `Уучлаарай, таны мессежийг ойлгохгүй байна 🙏

Дараах зүйлсийн аль нэгийг илгээнэ үү:
• Санал, гомдол
• Хороогийн мэдээ (жишээ: "5-р хороонд юу хийсэн?")
• Намтар, танилцуулга
• Хүсэлтийн дугаар (BZD-XXXX)`,
};

// ============================================
// RATE LIMITING
// ============================================
const rateLimitMap = new Map();

function checkRateLimit(senderId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 5;
  if (!rateLimitMap.has(senderId)) rateLimitMap.set(senderId, []);
  const requests = rateLimitMap.get(senderId).filter(t => now - t < windowMs);
  requests.push(now);
  rateLimitMap.set(senderId, requests);
  return requests.length <= maxRequests;
}

// ============================================
// KEYWORD DETECTION
// ============================================
function detectIntent(text) {
  const t = text.toLowerCase();
  if (/сайн байна|сайн уу|hello|hi|байна уу|start/i.test(t)) return 'greeting';
  if (/намтар|хэн бэ|танилцуул|мөнхбаатар|чи хэн/i.test(t)) return 'bio';
  if (/treelings|мод тарих|блокчейн мод/i.test(t)) return 'treelings';
  if (/monbeef|мах|үхэр|сэлэнгэ үүлдэр/i.test(t)) return 'monbeef';
  if (/холбоо|утас|хаяг|email|хэрхэн холбогдох/i.test(t)) return 'contact';
  if (/баярлалаа|болно оо|за тэгье|ойлголоо/i.test(t)) return 'thanks';
  if (/bzd-|хүсэлт яасан|санал яасан|явц|миний хүсэлт|сүүлийн хүсэлт/i.test(t)) return 'tracking';
  if (/хороонд юу|хороо.*хийсэн|хороо.*ажил|юу болсон.*хороо/i.test(t)) return 'khoroo_report';
  return 'complaint';
}

// ============================================
// FACEBOOK API
// ============================================
async function sendMessage(recipientId, text, quickReplies = null) {
  const body = {
    recipient: { id: recipientId },
    message: quickReplies ? { text, quick_replies: quickReplies } : { text },
  };
  await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
}

// ============================================
// TELEGRAM
// ============================================
async function notifyTelegram(message) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' }),
    });
  } catch (e) { console.error('Telegram error:', e); }
}

// ============================================
// CLAUDE API
// ============================================
async function callClaude(message) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `Та Баянзүрх дүүргийн НИТХ-ын төлөөлөгч Мөнхбаатарын AI туслах байна.
Иргэдийн монгол мессежийг ойлгож ЗӨВХӨН дараах JSON форматаар хариулна. Нэмэлт текст байхгүй:
{
  "khoroo": <тоо 1-30 эсвэл null>,
  "age_group": "<youth|adult|senior|unknown>",
  "category": "<infrastructure|safety|sanitation|environment|social_services|other>",
  "urgency": "<low|medium|high|critical>",
  "summary": "<товч тайлбар монголоор>",
  "reply": "<иргэнд өгөх эелдэг хариу монголоор, 1-2 өгүүлбэр>"
}`,
      messages: [{ role: 'user', content: message }],
    }),
  });
  const data = await response.json();
  try {
    return JSON.parse(data.content[0].text);
  } catch {
    return { khoroo: null, age_group: 'unknown', category: 'other', urgency: 'low', summary: message.substring(0, 100), reply: 'Таны саналыг хүлээн авлаа 🙏' };
  }
}

// ============================================
// SUPABASE — Conversation State
// ============================================
async function getState(senderId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/conversation_state?sender_id=eq.${senderId}&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  return data[0] || null;
}

async function setState(senderId, state, tempData = {}) {
  await fetch(`${SUPABASE_URL}/rest/v1/conversation_state`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ sender_id: senderId, state, temp_data: tempData, updated_at: new Date().toISOString() }),
  });
}

async function clearState(senderId) {
  await fetch(`${SUPABASE_URL}/rest/v1/conversation_state?sender_id=eq.${senderId}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
}

// ============================================
// SUPABASE — Санал хадгалах
// ============================================
async function saveRequest(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/citizen_requests`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  return result[0];
}

async function updateRequest(trackingId, updateData) {
  await fetch(`${SUPABASE_URL}/rest/v1/citizen_requests?tracking_id=eq.${trackingId}`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
}

async function getRequestByTracking(trackingId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/citizen_requests?tracking_id=eq.${trackingId}&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await res.json();
  return data[0] || null;
}

async function getRequestsBySender(senderId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/citizen_requests?sender_id=eq.${senderId}&order=created_at.desc&limit=5&select=*`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  return await res.json();
}

async function getKhorooReport(khoroo) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/citizen_requests?khoroo=eq.${khoroo}&status=eq.resolved&created_at=gte.${threeMonthsAgo.toISOString()}&select=tracking_id,category,ai_summary&order=created_at.desc&limit=20`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  return await res.json();
}

// ============================================
// ХОРООГИЙН ТАЙЛАН — Claude нэгтгэнэ
// ============================================
async function generateKhorooSummary(khoroo, requests) {
  if (requests.length === 0) {
    return `📍 ${khoroo}-р хороонд сүүлийн 3 сард бүртгэгдсэн шийдэгдсэн ажил байхгүй байна.\n\nСанал, гомдлоо илгээгээрэй 🙏`;
  }
  const dataText = requests.map(r => `- ${r.category}: ${r.ai_summary}`).join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: `Баянзүрх дүүргийн ${khoroo}-р хороонд сүүлийн 3 сард шийдэгдсэн иргэдийн дараах хүсэлтүүдийг нэгтгэж товч хураангуйлж монголоор бич. 3-4 өгүүлбэр:\n${dataText}` }],
    }),
  });
  const data = await res.json();
  const summary = data.content[0].text;
  const categories = {};
  requests.forEach(r => { categories[r.category] = (categories[r.category] || 0) + 1; });
  const names = { infrastructure: 'Дэд бүтэц', safety: 'Аюулгүй байдал', sanitation: 'Ариун цэвэр', environment: 'Байгаль орчин', social_services: 'Нийгмийн үйлчилгээ', other: 'Бусад' };
  const catText = Object.entries(categories).map(([cat, count]) => `• ${names[cat] || cat} — ${count} хүсэлт ✅`).join('\n');
  return `📍 ${khoroo}-р хороо — Сүүлийн 3 сарын ажлууд\n\n${summary}\n\n🏷️ Ангиллаар:\n${catText}`;
}

// ============================================
// МЕССЕЖ БОЛОВСРУУЛАХ
// ============================================
async function processMessage(senderId, messageText) {
  const state = await getState(senderId);

  // ---- STATE: waiting_khoroo ----
  if (state?.state === 'waiting_khoroo') {
    const khorooMatch = messageText.match(/\d+/);
    const khoroo = khorooMatch ? parseInt(khorooMatch[0]) : null;
    if (!khoroo || khoroo < 1 || khoroo > 30) {
      await sendMessage(senderId, '1-ээс 30 хүртэлх хорооны дугаар оруулна уу 🙏');
      return;
    }
    const tempData = state.temp_data || {};
    const saved = await saveRequest({
      source: 'facebook', sender_id: senderId, message: tempData.message || '',
      khoroo, age_group: tempData.age_group || 'unknown', category: tempData.category || 'other',
      ai_summary: tempData.summary || '', ai_reply: tempData.reply || '',
    });
    await setState(senderId, 'waiting_contact', { tracking_id: saved?.tracking_id });
    await sendMessage(senderId,
      `Бүртгэлээ ✅\n\n🔖 ${saved?.tracking_id}\n📍 ${khoroo}-р хороо\n\nШийдвэрлэгдэхэд энэ чатаар мэдэгдэнэ 📨\n\nУтас эсвэл email үлдээх үү? (заавал биш)`,
      [{ content_type: 'text', title: 'Алгасах →', payload: 'SKIP_CONTACT' }]
    );
    await notifyTelegram(`🔔 <b>Шинэ санал!</b>\n📍 ${khoroo}-р хороо\n🏷️ ${tempData.category || 'other'}\n💬 ${tempData.message || ''}\n🔖 ${saved?.tracking_id}`);
    return;
  }

  // ---- STATE: waiting_contact ----
  if (state?.state === 'waiting_contact') {
    const trackingId = state.temp_data?.tracking_id;
    if (messageText === 'SKIP_CONTACT' || /алгасах|үгүй|болсон/i.test(messageText)) {
      await clearState(senderId);
      await sendMessage(senderId, `За тэгье! 🙏\n\n🔖 ${trackingId} дугаараараа явцаа шалгаж болно.\n\nАсуух зүйл байвал энд бичнэ үү!`);
      return;
    }
    const isPhone = /^\d{8}$/.test(messageText.replace(/\s/g, ''));
    const isEmail = /\S+@\S+\.\S+/.test(messageText);
    if (isPhone || isEmail) {
      await updateRequest(trackingId, isPhone ? { contact_phone: messageText } : { contact_email: messageText });
      await clearState(senderId);
      await sendMessage(senderId, `Баярлалаа! ✅\n\n🔖 ${trackingId}\nШийдвэрлэгдэхэд танд мэдэгдэнэ 🙏`);
      await notifyTelegram(`📞 <b>Холбоо нэмэгдлээ</b>\n🔖 ${trackingId}\n${isPhone ? '📞' : '📧'} ${messageText}`);
    } else {
      await sendMessage(senderId, 'Утасны дугаар (8 оронтой) эсвэл email оруулна уу 🙏',
        [{ content_type: 'text', title: 'Алгасах →', payload: 'SKIP_CONTACT' }]);
    }
    return;
  }

  // Keyword filter
  const intent = detectIntent(messageText);

  if (intent === 'greeting') {
    await sendMessage(senderId, STATIC.greeting, [
      { content_type: 'text', title: '📝 Санал илгээх', payload: 'COMPLAINT' },
      { content_type: 'text', title: '📍 Хороогийн мэдээ', payload: 'KHOROO' },
      { content_type: 'text', title: '👤 Намтар', payload: 'BIO' },
    ]);
    return;
  }
  if (intent === 'bio') { await sendMessage(senderId, STATIC.bio); return; }
  if (intent === 'treelings') { await sendMessage(senderId, STATIC.treelings); return; }
  if (intent === 'monbeef') { await sendMessage(senderId, STATIC.monbeef); return; }
  if (intent === 'contact') { await sendMessage(senderId, STATIC.contact); return; }
  if (intent === 'thanks') { await sendMessage(senderId, STATIC.thanks); return; }

  if (intent === 'tracking') {
    const bzdMatch = messageText.match(/BZD-[\d-]+/i);
    if (bzdMatch) {
      const req = await getRequestByTracking(bzdMatch[0].toUpperCase());
      if (req) {
        const statusText = { new: '🆕 Шинэ', in_progress: '⏳ Шийдэгдэж байна', resolved: '✅ Шийдэгдсэн', rejected: '❌ Татгалзсан' };
        await sendMessage(senderId, `🔖 ${req.tracking_id}\n\n📍 ${req.khoroo}-р хороо\n🏷️ ${req.category}\n🔄 ${statusText[req.status] || req.status}\n📅 ${new Date(req.created_at).toLocaleDateString('mn-MN')}`);
      } else {
        await sendMessage(senderId, `${bzdMatch[0]} дугаартай хүсэлт олдсонгүй 🙏`);
      }
    } else {
      const requests = await getRequestsBySender(senderId);
      if (requests.length === 0) {
        await sendMessage(senderId, 'Та одоогоор санал илгээгээгүй байна 🙏');
      } else {
        const statusText = { new: '🆕', in_progress: '⏳', resolved: '✅', rejected: '❌' };
        const list = requests.map((r, i) =>
          `${i + 1}️⃣ ${r.tracking_id}\n📍 ${r.khoroo}-р хороо\n${statusText[r.status] || '🔄'} ${r.status}`
        ).join('\n\n');
        await sendMessage(senderId, `📋 Таны сүүлийн хүсэлтүүд:\n\n${list}`);
      }
    }
    return;
  }

  if (intent === 'khoroo_report') {
    const khorooMatch = messageText.match(/(\d+)/);
    if (!khorooMatch) {
      await sendMessage(senderId, 'Аль хорооны мэдээг авмаар байна вэ? (жишээ: "5-р хороонд юу хийсэн?")');
      return;
    }
    const requests = await getKhorooReport(parseInt(khorooMatch[1]));
    const summary = await generateKhorooSummary(parseInt(khorooMatch[1]), requests);
    await sendMessage(senderId, summary);
    return;
  }

  if (intent === 'complaint') {
    const aiResult = await callClaude(messageText);
    if (aiResult.urgency === 'critical') {
      await notifyTelegram(`🚨 <b>ЯАРАЛТАЙ САНАЛ!</b>\n💬 ${messageText}\n📍 Хороо: ${aiResult.khoroo || 'тодорхойгүй'}`);
    }
    if (aiResult.khoroo) {
      const saved = await saveRequest({
        source: 'facebook', sender_id: senderId, message: messageText,
        khoroo: aiResult.khoroo, age_group: aiResult.age_group,
        category: aiResult.category, ai_summary: aiResult.summary, ai_reply: aiResult.reply,
      });
      await setState(senderId, 'waiting_contact', { tracking_id: saved?.tracking_id });
      await sendMessage(senderId,
        `${aiResult.reply}\n\n🔖 Дугаар: ${saved?.tracking_id}\n📍 ${aiResult.khoroo}-р хороо\n\nШийдвэрлэгдэхэд энэ чатаар мэдэгдэнэ 📨\n\nУтас эсвэл email үлдээх үү? (заавал биш)`,
        [{ content_type: 'text', title: 'Алгасах →', payload: 'SKIP_CONTACT' }]
      );
      await notifyTelegram(`🔔 <b>Шинэ санал!</b>\n📍 ${aiResult.khoroo}-р хороо\n🏷️ ${aiResult.category}\n💬 ${messageText}\n🔖 ${saved?.tracking_id}`);
    } else {
      await setState(senderId, 'waiting_khoroo', {
        message: messageText, category: aiResult.category,
        age_group: aiResult.age_group, summary: aiResult.summary, reply: aiResult.reply,
      });
      await sendMessage(senderId, `Ойлголоо! Бүртгэхэд та хэддүгээр хороонд байдаг вэ? 🙏`,
        [
          { content_type: 'text', title: '1–5-р хороо', payload: 'KHOROO_1_5' },
          { content_type: 'text', title: '6–10-р хороо', payload: 'KHOROO_6_10' },
          { content_type: 'text', title: '11–15-р хороо', payload: 'KHOROO_11_15' },
          { content_type: 'text', title: '16–20-р хороо', payload: 'KHOROO_16_20' },
          { content_type: 'text', title: '21–30-р хороо', payload: 'KHOROO_21_30' },
        ]
      );
    }
    return;
  }

  await sendMessage(senderId, STATIC.unknown);
}

// ============================================
// ҮНДСЭН HANDLER
// ============================================
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (body.object !== 'page') return res.status(404).send('Not Found');

    res.status(200).json({ status: 'ok' });

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const messageText = event.message?.text || event.postback?.payload;
        if (!messageText || !senderId) continue;

        if (messageText === 'GET_STARTED') {
          await sendMessage(senderId, STATIC.greeting, [
            { content_type: 'text', title: '📝 Санал илгээх', payload: 'COMPLAINT' },
            { content_type: 'text', title: '📍 Хороогийн мэдээ', payload: 'KHOROO' },
            { content_type: 'text', title: '👤 Намтар', payload: 'BIO' },
          ]);
          continue;
        }

        if (messageText === 'BIO') { await sendMessage(senderId, STATIC.bio); continue; }
        if (messageText === 'CONTACT') { await sendMessage(senderId, STATIC.contact); continue; }

        if (messageText.startsWith('KHOROO_')) {
          const state = await getState(senderId);
          if (state?.state === 'waiting_khoroo') {
            const ranges = { KHOROO_1_5: 3, KHOROO_6_10: 8, KHOROO_11_15: 13, KHOROO_16_20: 18, KHOROO_21_30: 25 };
            await processMessage(senderId, String(ranges[messageText] || 1));
          }
          continue;
        }

        if (messageText.length > 500) {
          await sendMessage(senderId, 'Таны мессеж хэт урт байна. 500 тэмдэгтээс богиносгоно уу 🙏');
          continue;
        }

        if (!checkRateLimit(senderId)) {
          await sendMessage(senderId, 'Та маш олон мессеж илгээлээ. 1 цагийн дараа дахин оролдоно уу 🙏');
          continue;
        }

        try {
          await processMessage(senderId, messageText);
        } catch (error) {
          console.error('Error:', error);
          await sendMessage(senderId, 'Уучлаарай, техникийн алдаа гарлаа. Дахин оролдоно уу 🙏');
          await notifyTelegram(`❌ <b>Алдаа!</b>\n${error.message}\nSender: ${senderId}`);
        }
      }
    }
    return;
  }

  return res.status(405).send('Method Not Allowed');
}
