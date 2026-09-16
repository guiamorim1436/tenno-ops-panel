import type { VercelRequest, VercelResponse } from '@vercel/node';

// Credenciais Evolution API
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://207.58.153.194:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'AZMy3DiXwaFMYdncdG76czamDRSyFkZA';
const EVOLUTION_API_INSTANCE = process.env.EVOLUTION_API_INSTANCE || 'Guilherme';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Envie POST.' });
  }

  try {
    const { remote_jid, message_text } = req.body || {};

    if (!remote_jid || !message_text) {
      return res.status(400).json({ error: 'remote_jid e message_text são obrigatórios' });
    }

    const sendUrl = `${EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${EVOLUTION_API_INSTANCE}`;

    const evoResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: remote_jid,
        text: message_text
      })
    });

    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error('Erro ao enviar mensagem via Evolution API:', evoResponse.status, errorText);
      return res.status(502).json({
        success: false,
        error: `Evolution API retornou status ${evoResponse.status}: ${errorText}`
      });
    }

    const data = await evoResponse.json();

    return res.status(200).json({
      success: true,
      message: 'Mensagem enviada com sucesso ao grupo do WhatsApp!',
      evolution_response: data
    });

  } catch (error: any) {
    console.error('Erro em evolution-send-message:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
