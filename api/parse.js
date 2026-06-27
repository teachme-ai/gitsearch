// Serverless Proxy NLP Sentence Parser Function
// Extracts technology keywords from full conversational sentences using Groq.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing sentence parameter "q"' });
  }

  const apiKey = process.env.GROQ_API_KEY;

  // Fallback stop-word parser if no API Key is configured
  if (!apiKey || apiKey.includes('your_')) {
    const stopWords = new Set([
      'i', 'want', 'to', 'learn', 'how', 'wanna', 'understand', 'use', 'can', 'more',
      'about', 'the', 'a', 'an', 'in', 'on', 'with', 'for', 'of', 'and', 'or', 'is', 'are'
    ]);
    const words = q.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
      .split(/\s+/)
      .filter(w => w && !stopWords.has(w));
    
    const parsed = words.slice(0, 3).join(' ');
    return res.status(200).json({ keywords: parsed || q });
  }

  const systemPrompt = "You are a senior search analyst. Extract the 2 or 3 most relevant tech keywords or nouns from the user's sentence to search on GitHub. Output ONLY the space-separated keywords. No explanations, no intro, no punctuation.";
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract keywords from: "${q}"` }
        ],
        temperature: 0.1,
        max_tokens: 30
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const keywords = data.choices?.[0]?.message?.content?.trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
      .toLowerCase() || q;

    return res.status(200).json({ keywords });
  } catch (error) {
    return res.status(500).json({ error: `NLP parsing failed: ${error.message}` });
  }
}
