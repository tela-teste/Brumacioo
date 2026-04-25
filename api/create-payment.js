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
    const amount = body?.amount;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Gerar um CPF genérico válido apenas para preencher caso a API exija
    // Algumas APIs aceitam 00000000000, outras exigem um válido ou não exigem nada.
    const mockCustomer = {
      name: 'Cliente Online',
      email: 'cliente@omegapay.com.br',
      document: '00000000000'
    };

    // =========================================================
    // CHAMADA PARA A API DO OMEGAPAY
    // Obs: Adicionei "/payments" no final da URL que você enviou, pois a maioria 
    // das APIs exige um caminho específico. Caso a documentação deles diga 
    // algo como "/transaction" ou "/pix", basta alterar abaixo.
    // =========================================================
    const paymentRes = await fetch('https://app.omegapayments.com.br/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Autenticação Basic com base64 do clientId:clientSecret
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: JSON.stringify({
        amount: amount,
        payment_method: 'pix',
        description: 'Assinatura Brumaccio',
        customer: mockCustomer
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
