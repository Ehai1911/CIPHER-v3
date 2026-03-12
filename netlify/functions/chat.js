const https = require('https');

exports.handler = async (event) => {
  // Только POST запросы
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message } = JSON.parse(event.body);
    
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Message required' }) };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const requestData = JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Ты NOVA - ассистент для платформы CIPHER v3 анализа конкурентов. 
          Отвечай по-русски, кратко (1-2 абзаца), на основе этой информации:
          
          - TAM: общий размер рынка, $128B для CRM с ростом 13-30% в год
          - CAC: стоимость привлечения клиента, $200-$8K в зависимости от GTM
          - LTV: lifetime value, $5K-$48K за счет долгого использования
          - CAGR: среднегодовой рост 13-30%, лучше PLG компании
          - Payback: 6-8 месяцев - когда инвестиции окупаются
          - GTM: PLG (бесплатно + upgrade), контент, партнерства
          - Стратегия: Q1 локализация, Q2 расширение, Q3 монетизация, Q4 масштабирование
          - Инвестиции: $112K на год 1 -> $1.5M ARR (ROI 1250%)
          - Главные конкуренты: Salesforce, HubSpot, Pipedrive, amoCRM, Zoho`
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return new Promise((resolve) => {
      const req = https.request('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData),
          'Authorization': `Bearer ${apiKey}`
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]) {
              const answer = parsed.choices[0].message.content;
              resolve({
                statusCode: 200,
                body: JSON.stringify({ answer })
              });
            } else {
              resolve({
                statusCode: 500,
                body: JSON.stringify({ error: 'Invalid response from OpenAI' })
              });
            }
          } catch (e) {
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'Failed to parse response' })
            });
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: error.message })
        });
      });

      req.write(requestData);
      req.end();
    });

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
