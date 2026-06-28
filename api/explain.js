// Serverless Proxy AI Explainer Function
// Uses Groq's high-speed Llama endpoint (or fallback mock) to summarize repository health.

const MAX_README_CHARS = 4200;

const getGithubToken = () => {
  const tokens = [
    process.env.GITHUB_TOKEN_PRIMARY,
    process.env.GITHUB_TOKEN_SECONDARY,
  ].filter(token => token && !token.includes('your_'));
  return tokens[0] || '';
};

const normalizeReadme = (readme = '') => {
  const lines = String(readme).replace(/\r\n/g, '\n').split('\n');
  const kept = [];
  let inCodeFence = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (kept.length && kept[kept.length - 1] !== '') {
        kept.push('');
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    if (/^(!\[[^\]]*\]\([^)]*\)|\[[^\]]*\]\([^)]*\))$/.test(trimmed)) {
      continue;
    }

    if (/^\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)$/.test(trimmed)) {
      continue;
    }

    if (/^<img\b/i.test(trimmed)) {
      continue;
    }

    kept.push(trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed);
    if (kept.join('\n').length >= MAX_README_CHARS) break;
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_README_CHARS);
};

const extractReadmeSignals = (readme = '') => {
  const headings = [];
  const bullets = [];
  for (const rawLine of String(readme).split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (/^#{1,3}\s+/.test(trimmed)) {
      headings.push(trimmed.replace(/^#{1,3}\s+/, ''));
      continue;
    }
    if (/^[-*+]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*+]\s+/, ''));
    }
  }

  return {
    headings: headings.slice(0, 6),
    bullets: bullets.slice(0, 8),
  };
};

const normalizeWhitespace = (text = '') => String(text).replace(/\s+/g, ' ').trim();

const makeSemanticProfile = ({ repo, desc, lang, readme, stars, commits, velocity }) => {
  const nameOnly = repo.split('/').pop() || repo;
  const cleanDesc = normalizeWhitespace(desc);
  const signals = extractReadmeSignals(readme);
  const topicText = `${cleanDesc} ${signals.headings.join(' ')} ${signals.bullets.join(' ')} ${lang || ''}`.toLowerCase();

  const profile = (() => {
    if (/copilot|assistant|agent|workflow helper|chat|sidebar|panel/.test(topicText)) {
      return {
        role: 'an assistant or workflow layer',
        audience: 'product teams and developer-tool builders',
        benefit: 'embed an assistant inside the product without leaving the workflow',
        closingFrames: [
          'In practice, it keeps help embedded in the product.',
          'The experience stays in one place while the user gets guidance.',
          'It turns the interface into a helper instead of a detour.',
        ],
      };
    }
    if (/rag|vector|embedding|semantic search|search|retriev|knowledge|llamaindex|haystack/.test(topicText)) {
      return {
        role: 'a retrieval and grounding layer',
        audience: 'teams building search, Q&A, or knowledge-retrieval systems',
        benefit: 'ground answers in the most relevant context',
        closingFrames: [
          'In practice, it pulls the best source material forward before the model answers.',
          'The system works by finding context first, then grounding the reply in it.',
          'It acts like a retrieval layer that narrows the answer space before generation.',
        ],
      };
    }
    if (/framework|sdk|starter|template|boilerplate|library|plugin|adapter|scaffold/.test(topicText)) {
      return {
        role: 'a reusable foundation',
        audience: 'developers who need a working base instead of starting from zero',
        benefit: 'start from a working base instead of rebuilding the same scaffolding',
        closingFrames: [
          'In practice, it gives teams a scaffold they can adapt quickly.',
          'The value is in starting from a working base and swapping in their own pieces.',
          'It shortens the path from template to shipped feature.',
        ],
      };
    }
    if (/tutorial|course|guide|learn|learning|example|docs|documentation|workshop|lab|playground/.test(topicText)) {
      return {
        role: 'a learning resource or reference implementation',
        audience: 'people trying to understand the pattern or teach it to others',
        benefit: 'understand the pattern faster by seeing it broken into parts',
        closingFrames: [
          'In practice, it breaks the pattern into something easier to learn.',
          'The examples show how the pieces fit before you try the real thing.',
          'It works like a guided reference you can adapt into your own project.',
        ],
      };
    }
    if (/logging|telemetry|observability|metrics|trace|monitor|health/.test(topicText)) {
      return {
        role: 'an operational visibility tool',
        audience: 'teams that need to understand how a system behaves in practice',
        benefit: 'see how the system behaves and catch issues sooner',
        closingFrames: [
          'In practice, it turns raw signals into something operators can act on.',
          'The point is to collect, compare, and respond before problems spread.',
          'It helps teams notice drift before it becomes an outage.',
        ],
      };
    }
    if (/mobile|frontend|ui|react|angular|vue|design system|component/.test(topicText)) {
      return {
        role: 'a UI or product layer',
        audience: 'teams shipping user-facing interfaces',
        benefit: 'ship a polished interaction path',
        closingFrames: [
          'In practice, it turns state and components into a usable screen flow.',
          'The main job is to make the interaction feel coherent and usable.',
          'It helps the product feel like one smooth experience instead of disconnected parts.',
        ],
      };
    }

    return {
      role: `${(lang || 'software').toLowerCase()} tooling`,
      audience: `developers working with ${lang || 'the selected stack'}`,
      benefit: 'turn the repository into a repeatable workflow rather than a one-off script',
      closingFrames: [
        'In practice, it turns the repository into a repeatable workflow.',
        'The useful part is that teams can reuse the pattern instead of rethinking it each time.',
        'It makes the work feel like a process rather than a one-off script.',
      ],
    };
  })();

  return {
    nameOnly,
    description: cleanDesc,
    signals,
    profile,
    stats: {
      stars: Number(stars || 0),
      commits: Number(commits || 0),
      velocity: Number(velocity || 0),
    },
  };
};

const buildSemanticSummary = (context) => {
  const { nameOnly, description, profile } = makeSemanticProfile(context);
  const hashSeed = Array.from(String(context.repo || nameOnly)).reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 0);
  const pickFrame = (frames) => frames[hashSeed % frames.length];
  const opening = description || `${nameOnly} is ${profile.role}`;

  return [
    `${nameOnly} is ${opening}.`,
    `It serves ${profile.audience} and helps them ${profile.benefit}.`,
    pickFrame(profile.closingFrames),
  ].join(' ');
};

const BAD_PHRASES = [
  /if you look at the README and examples/i,
  /useful test is whether/i,
  /skimming it/i,
  /think of it as/i,
  /README and examples/i,
  /main loop in one sentence/i,
];

const sanitizeAnalystSummary = (summary, fallbackSummary) => {
  const text = normalizeWhitespace(summary);
  if (!text) return fallbackSummary;
  if (BAD_PHRASES.some(pattern => pattern.test(text))) return fallbackSummary;

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => normalizeWhitespace(sentence))
    .filter(Boolean);

  const seen = new Set();
  const cleaned = [];
  for (const sentence of sentences) {
    if (BAD_PHRASES.some(pattern => pattern.test(sentence))) continue;
    const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(sentence);
    if (cleaned.length >= 3) break;
  }

  return cleaned.length >= 2 ? cleaned.join(' ') : fallbackSummary;
};

const fetchRepoReadme = async (repo, headers) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.content) return null;

    const content = data.content.replace(/\n/g, '');
    return Buffer.from(content, 'base64').toString('utf8');
  } catch {
    return null;
  }
};

const buildMockSummary = ({ repo, desc, lang, stars, commits, velocity, readme }) => {
  const context = { repo, desc, lang, stars, commits, velocity, readme };
  return buildSemanticSummary(context);
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { repo, desc, lang, stars, commits, velocity } = req.query;
  if (!repo) {
    return res.status(400).json({ error: 'Missing repository parameter "repo"' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const githubToken = getGithubToken();
  const startedAt = Date.now();
  const githubHeaders = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitDeck-Telemetry-Observatory-Proxy',
  };
  if (githubToken) {
    githubHeaders.Authorization = `token ${githubToken}`;
  }

  console.info('[GitObs][explain] start', {
    repo,
    hasGroqKey: Boolean(apiKey && !apiKey.includes('your_')),
    hasGithubToken: Boolean(githubToken),
  });

  const readme = normalizeReadme(await fetchRepoReadme(repo, githubHeaders));
  const readmeSignals = extractReadmeSignals(readme);
  console.info('[GitObs][explain] readme_context', {
    repo,
    readmeChars: readme.length,
    headings: readmeSignals.headings.length,
    bullets: readmeSignals.bullets.length,
  });

  // Fallback: If no Groq key is configured, return a grounded summary built from README + telemetry.
  if (!apiKey || apiKey.includes('your_')) {
    await new Promise(r => setTimeout(r, 250));
    console.info('[GitObs][explain] fallback_summary', {
      repo,
      durationMs: Date.now() - startedAt,
      mode: 'mock',
    });
    return res.status(200).json({
      summary: buildMockSummary({
        repo,
        desc,
        lang,
        stars,
        commits,
        velocity,
        readme,
      }),
      diagnostic: {
        mode: 'offline',
        reason: 'missing_groq_key',
      },
      evidence: {
        readmeHeadings: readmeSignals.headings,
        readmeBullets: readmeSignals.bullets,
      }
    });
  }

  // System instructions for Groq.
  const systemPrompt = [
    'You are a senior open-source analyst explaining what a repository does in plain language.',
    'Use the README and repository metadata to infer the actual product or developer workflow, not just popularity.',
    'Write exactly 3 short sentences.',
    'Sentence 1: what the project is.',
    'Sentence 2: who it is for and what problem it solves.',
    'Sentence 3: the core loop or operational pattern.',
    'Do not mention README, examples, skimming, or how you read the repository.',
    'Do not use "think of it as" or other filler analogies.',
    'Do not repeat the same idea across sentences.',
    'Do not restate stars or commits unless they materially change the interpretation.',
    'Do not use markdown or bullet points.',
    'Keep it under 85 words.'
  ].join(' ');

  const userPrompt = [
    `Repository: "${repo}"`,
    `Description: "${desc || 'No description'}"`,
    `Main Language: "${lang || 'Unknown'}"`,
    `Commits (14d): ${commits || 0}`,
    `Stars: ${stars || 0}`,
    `Velocity: ${velocity || 0} stars/day`,
    readme ? `README excerpt:\n${readme}` : 'README excerpt: unavailable',
    readmeSignals.headings.length > 0 ? `README headings: ${readmeSignals.headings.join(' | ')}` : 'README headings: unavailable',
    readmeSignals.bullets.length > 0 ? `README bullets: ${readmeSignals.bullets.join(' | ')}` : 'README bullets: unavailable',
  ].join('\n');

  try {
    console.info('[GitObs][explain] groq_request', {
      repo,
      model: 'llama3-8b-8192',
      readmeChars: readme.length,
    });
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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.25,
        max_tokens: 180
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawSummary = data.choices?.[0]?.message?.content?.trim() || 'Unable to generate analysis.';
    const summary = sanitizeAnalystSummary(
      rawSummary,
      buildSemanticSummary({ repo, desc, lang, stars, commits, velocity, readme })
    );
    console.info('[GitObs][explain] groq_success', {
      repo,
      durationMs: Date.now() - startedAt,
    });
    return res.status(200).json({
      summary,
      evidence: {
        readmeHeadings: readmeSignals.headings,
        readmeBullets: readmeSignals.bullets,
      }
    });
  } catch (error) {
    console.warn('[GitObs][explain] fallback_error', {
      repo,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
    return res.status(200).json({
      summary: buildMockSummary({
        repo,
        desc,
        lang,
        stars,
        commits,
        velocity,
        readme,
      }),
      diagnostic: {
        mode: 'fallback',
        reason: error.message,
      },
      error: `AI analysis fallback: ${error.message}`
    });
  }
}
