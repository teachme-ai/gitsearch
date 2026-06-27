// Serverless Proxy Repository Enrichment Function
// Pools all 5 metadata queries into a single server-side task to save user bandwidth.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { repo } = req.query;
  if (!repo) {
    return res.status(400).json({ error: 'Missing repository parameter "repo"' });
  }

  // Token Rotation logic (Primary / Secondary pool)
  const tokens = [
    process.env.GITHUB_TOKEN_PRIMARY,
    process.env.GITHUB_TOKEN_SECONDARY
  ].filter(Boolean);

  if (tokens.length === 0) {
    return res.status(500).json({ error: 'No GitHub API tokens configured in production environment variables.' });
  }

  const selectedToken = tokens[Math.floor(Math.random() * tokens.length)];

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitDeck-Telemetry-Observatory-Proxy',
    'Authorization': `token ${selectedToken}`
  };

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const [commitsRes, closedRes, openRes, langsRes, contribsRes, userRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/commits?since=${fourteenDaysAgo.toISOString()}&per_page=100`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${repo}/issues?state=closed&since=${thirtyDaysAgo.toISOString()}&per_page=100`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${repo}/issues?state=open&since=${thirtyDaysAgo.toISOString()}&per_page=100`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${repo}/languages`, { headers }).catch(() => null),
      fetch(`https://api.github.com/repos/${repo}/contributors?per_page=5&anon=false`, { headers }).catch(() => null),
      fetch(`https://api.github.com/users/${repo.split('/')[0]}`, { headers }).catch(() => null),
    ]);

    let commits = 0;
    if (commitsRes?.ok) {
      const d = await commitsRes.json();
      commits = Array.isArray(d) ? d.length : 0;
    }

    const closedData = closedRes?.ok ? await closedRes.json() : [];
    const openData = openRes?.ok ? await openRes.json() : [];
    const closed = Array.isArray(closedData) ? closedData.length : 0;
    const open = Array.isArray(openData) ? openData.length : 0;
    let resolution = 0.5;
    if (closed + open > 0) resolution = closed / (closed + open);

    let languageBytes = {};
    if (langsRes?.ok) {
      const d = await langsRes.json();
      if (d && typeof d === 'object') languageBytes = d;
    }

    let contributors = [];
    if (contribsRes?.ok) {
      const d = await contribsRes.json();
      if (Array.isArray(d)) {
        contributors = d.slice(0, 3).map(c => ({
          login: c.login,
          avatar_url: c.avatar_url,
          contributions: c.contributions,
          html_url: c.html_url
        }));
      }
    }

    let ownerPublicRepos = 0;
    let ownerFollowers = 0;
    if (userRes?.ok) {
      const u = await userRes.json();
      ownerPublicRepos = u.public_repos || 0;
      ownerFollowers = u.followers || 0;
    }

    return res.status(200).json({
      commits,
      resolution,
      languageBytes,
      contributors,
      ownerPublicRepos,
      ownerFollowers
    });
  } catch (error) {
    return res.status(500).json({ error: `Server-side enrichment failed: ${error.message}` });
  }
}
