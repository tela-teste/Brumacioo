module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLIENT_ID = process.env.LIVEPIX_CLIENT_ID || 'bab59bda-5a11-40d7-a3a0-8d62aeadbd7c';
  const CLIENT_SECRET = process.env.LIVEPIX_CLIENT_SECRET || 'repaOnu2ffG5xAOkQNb3CP0ryz63c84siE/GR/4bmkvGUVj1tMOLPpYwqnKJtMWZaH45Ye1EydJ5MtlKJ4qgfKFA1q5BRzzmD/FHpsQ0lXxEh6PyvUPnpCoY9UAxXixVVDJZIdJFfWiig1lyjkpeya51D0X2u/7cSxAQobERl7w';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const amount = body?.amount;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required', receivedBody: body });
    }

    // 1. Get OAuth Token
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'payments:write'
    });

    const tokenRes = await fetch('https://oauth.livepix.gg/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });

    const tokenText = await tokenRes.text();

    if (!tokenRes.ok) {
      return res.status(500).json({
        error: 'Falha na autenticacao Livepix',
        status: tokenRes.status,
        response: tokenText
      });
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      return res.status(500).json({ error: 'Token response nao e JSON', response: tokenText });
    }

    // 2. Create Payment
    const origin = req.headers.origin || req.headers.referer || 'https://amber-zdv1.vercel.app';
    const paymentRes = await fetch('https://api.livepix.gg/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + tokenData.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'BRL',
        redirectUrl: origin
      })
    });

    const paymentText = await paymentRes.text();

    if (!paymentRes.ok) {
      return res.status(500).json({
        error: 'Falha ao criar pagamento',
        status: paymentRes.status,
        response: paymentText
      });
    }

    let paymentData;
    try {
      paymentData = JSON.parse(paymentText);
    } catch (e) {
      return res.status(500).json({ error: 'Payment response nao e JSON', response: paymentText });
    }

    return res.status(200).json(paymentData);

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', message: error.message, stack: error.stack });
  }
};
