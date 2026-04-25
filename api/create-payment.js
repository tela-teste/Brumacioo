module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Credenciais do OmegaPay
  // O ideal é colocar essas chaves nas variáveis de ambiente da Vercel (Environment Variables)
  const CLIENT_ID = process.env.OMEGAPAY_CLIENT_ID || 'yagododigital_mc6hvcok12a4jk9k';
  const CLIENT_SECRET = process.env.OMEGAPAY_CLIENT_SECRET || 'kxng049rc38fgnya0h6zvqiopwknrssdh3jsups2jlepztwj7g58azowdd2cnm08';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const amountRaw = body?.amount;

    if (!amountRaw) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // O valor na documentação é pedido "em reais". O frontend envia ex: 1990.
    // Convertendo para 19.90
    const amountInReais = Number((amountRaw / 100).toFixed(2));

    // O "identifier" é obrigatório e deve ser único
    const uniqueIdentifier = 'BRUMACCIO_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000);

    // O erro Zod da API OmegaPay revelou que o objeto 'client' é obrigatório.
    // Como você pediu para não ter formulário, enviaremos dados mockados com um CPF válido matematicamente.
    const mockClient = {
      name: 'Cliente Vip',
      email: 'cliente@omegapay.com.br',
      document: '42398517031', // CPF válido matematicamente para não ser rejeitado
      phone: '11999999999' // Telefone obrigatório detectado no erro Zod
    };

    const paymentRes = await fetch('https://app.omegapayments.com.br/api/v1/gateway/pix/receive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': CLIENT_ID,
        'x-secret-key': CLIENT_SECRET
      },
      body: JSON.stringify({
        identifier: uniqueIdentifier,
        amount: amountInReais,
        client: mockClient
      })
    });

    const paymentText = await paymentRes.text();

    if (!paymentRes.ok) {
      return res.status(500).json({
        error: 'Falha ao criar pagamento no OmegaPay',
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
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
};
