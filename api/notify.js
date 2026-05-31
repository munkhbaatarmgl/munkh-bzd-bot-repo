// ============================================
// МӨНХБААТАР.МН — Status Update Notification
// Supabase webhook → Иргэнд Facebook мэдэгдэл
// ============================================

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function sendMessage(recipientId, text) {
  await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { old_record, record } = req.body;

  // Зөвхөн status "resolved" болсон үед
  if (old_record?.status !== 'resolved' && record?.status === 'resolved') {
    if (record.sender_id) {
      const categoryNames = {
        infrastructure: 'Дэд бүтэц',
        safety: 'Аюулгүй байдал',
        sanitation: 'Ариун цэвэр',
        environment: 'Байгаль орчин',
        social_services: 'Нийгмийн үйлчилгээ',
        other: 'Бусад',
      };

      const note = record.resolved_note ? `\n\n📝 ${record.resolved_note}` : '';

      await sendMessage(
        record.sender_id,
        `✅ Таны хүсэлт шийдэгдлээ!\n\n🔖 ${record.tracking_id}\n📍 ${record.khoroo}-р хороо — ${categoryNames[record.category] || record.category}${note}\n\nМөнхбаатарын багаас баярлалаа 🙏\nЦаашид ч санал хүсэлтээ илгээгээрэй!`
      );
    }
  }

  return res.status(200).json({ ok: true });
}
