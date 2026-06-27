// Serverless Proxy Search Function
// Handles rate-limit token rotation and queries GitHub Search API securely.

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { q, sort, order, per_page } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  // Token Rotation logic (Primary / Secondary pool)
  const tokens = [
    process.env.GITHUB_TOKEN_PRIMARY,
    process.env.GITHUB_TOKEN_SECONDARY
  ].filter(Boolean);

  if (tokens.length === 0) {
    return res.status(500).json({ error: 'No GitHub API tokens configured in production environment variables.' });
  }

  // Pick a token randomly or based on minute rotation
  const selectedToken = tokens[Math.floor(Math.random() * tokens.length)];

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitDeck-Telemetry-Observatory-Proxy',
    'Authorization': `token ${selectedToken}`
  };

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort || 'stars'}&order=${order || 'desc'}&per_page=${per_page || '30'}`;

  try {
    const apiRes = await fetch(url, { headers });
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `GitHub Search API returned status ${apiRes.status}` });
    }
    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: `Failed to fetch search results: ${error.message}` });
  }
}
