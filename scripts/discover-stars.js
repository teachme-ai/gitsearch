import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core configuration for GitHub Observatory quadrants
const TOPICS = [
  'ai-agents',
  'rag',
  'local-llm',
  'mlx',
  'fine-tuning',
  'llmops',
  'ai-coding'
];

// Load local .env if exists
const loadEnv = () => {
  const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.slice(0, firstEqual).trim();
            const val = trimmed.slice(firstEqual + 1).trim();
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
};
loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // Optional: higher rate limits

// Weighted scoring equation constants
const W_STAR_VELOCITY = 5.0;
const W_COMMIT_FREQUENCY = 2.0;
const W_RESOLUTION_RATIO = 3.0;

function mapTopicToTheme(topic) {
  const map = {
    'ai-agents': 'Agents',
    'rag': 'RAG and knowledge systems',
    'local-llm': 'Local and open AI',
    'mlx': 'Local and open AI',
    'fine-tuning': 'Local and open AI',
    'llmops': 'Applied AI products',
    'ai-coding': 'AI coding'
  };
  return map[topic] || 'AI engineering foundations';
}

function mapTopicToStage(topic) {
  const map = {
    'ai-agents': 'Explore',
    'rag': 'Build',
    'local-llm': 'Build',
    'mlx': 'Explore',
    'fine-tuning': 'Build',
    'llmops': 'Build',
    'ai-coding': 'Explore'
  };
  return map[topic] || 'Learn';
}

function inferProjectFocus(repo, description) {
  const repoLower = repo.toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  const corporateNamespaces = [
    'microsoft/', 'google/', 'meta-llama/', 'openai/', 'unslothai/', 
    'langgenius/', 'dify/', 'cohere-ai/', 'aws/', 'amazon/', 'volcengine/', 
    'baidu/', 'netflix/', 'uber/', 'airbnb/', 'facebook/', 'glean/', 'hashicorp/'
  ];
  
  const isCorporateOwner = corporateNamespaces.some(ns => repoLower.startsWith(ns));
  
  const enterpriseKeywords = [
    'enterprise', 'production-grade', 'security', 'deploy', 'business', 
    'orchestrate', 'scale', 'commercial', 'monitoring', 'audit', 'governance',
    'infrastructure', 'kubernetes', 'docker', 'mlops', 'llmops'
  ];
  
  const communityKeywords = [
    'awesome', 'collection', 'guide', 'learning', 'tutorials', 'handbook', 
    'course', 'curated', 'community', 'collaborative', 'wiki', 'list',
    'roadmap', 'pathway', 'curriculum', 'education'
  ];

  if (isCorporateOwner || enterpriseKeywords.some(kw => descLower.includes(kw))) {
    return 'Enterprise';
  }
  
  if (communityKeywords.some(kw => descLower.includes(kw)) || repoLower.includes('awesome')) {
    return 'Community';
  }
  
  return 'Individual';
}

function generateCTA(repoName, description, theme) {
  const cleanDesc = description ? description.replace(/["']/g, '') : '';
  const phrase = cleanDesc ? ` Study this to understand: "${cleanDesc.slice(0, 70)}..."` : '';
  
  const map = {
    'Agents': `Explore as a candidate for local multi-agent orchestration and autonomy loops.${phrase}`,
    'RAG and knowledge systems': `Use as a design pattern for sovereign semantic search and private vector contexts.${phrase}`,
    'Local and open AI': `Benchmark performance locally on consumer hardware to establish private data boundary controls.${phrase}`,
    'AI coding': `Integrate into IDE configurations and sandboxes to speed up offline engineering cycles.${phrase}`,
    'Applied AI products': `Analyze as a product design reference for deploying LLM pipelines in production.${phrase}`
  };
  return map[theme] || `Assess capability and use as a reference tool for sovereign AI engineering workshops.${phrase}`;
}

async function getCommitFrequency(repo, headers) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const dateStr = fourteenDaysAgo.toISOString();
  
  const url = `https://api.github.com/repos/${repo}/commits?since=${dateStr}&per_page=100`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch (err) {
    return 0;
  }
}

async function getResolutionRatio(repo, headers) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString();
  
  const closedUrl = `https://api.github.com/repos/${repo}/issues?state=closed&since=${dateStr}&per_page=100`;
  const openUrl = `https://api.github.com/repos/${repo}/issues?state=open&since=${dateStr}&per_page=100`;
  
  try {
    const [closedRes, openRes] = await Promise.all([
      fetch(closedUrl, { headers }),
      fetch(openUrl, { headers })
    ]);
    
    let closedCount = 0;
    let openCount = 0;
    
    if (closedRes.ok) {
      const closedData = await closedRes.json();
      if (Array.isArray(closedData)) closedCount = closedData.length;
    }
    if (openRes.ok) {
      const openData = await openRes.json();
      if (Array.isArray(openData)) openCount = openData.length;
    }
    
    const total = closedCount + openCount;
    if (total === 0) return 1.0;
    return closedCount / total;
  } catch (err) {
    return 0.5;
  }
}

async function discoverRisingStars() {
  console.log('\x1b[36mInitializing GitHub Galaxy Observatory Scanner...\x1b[0m');
  console.log('Scanning quadrants for new rising stars...\n');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const dateStr = sixMonthsAgo.toISOString().split('T')[0];

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Galaxy-Observatory'
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log('Authenticated request token active.');
  }

  const dbPath = path.resolve(__dirname, '../src/data/galaxy-db.json');
  let starsList = [];
  if (fs.existsSync(dbPath)) {
    try {
      starsList = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
      console.error('Failed to read galaxy-db.json:', err.message);
    }
  }

  const candidates = [];

  for (const topic of TOPICS) {
    const query = `topic:${topic} created:>${dateStr} stars:>200`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`;

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`Rate limit reached for topic "${topic}".`);
          break;
        }
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];
      
      for (const item of items) {
        const createdDate = new Date(item.created_at);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - createdDate) / (1000 * 60 * 60 * 24)) || 1;
        const starVelocity = item.stargazers_count / diffDays;

        candidates.push({
          repo: item.full_name,
          link: item.html_url,
          stars: item.stargazers_count,
          description: item.description || '',
          topic: topic,
          starVelocity: starVelocity,
          created_at: item.created_at
        });
      }
    } catch (err) {
      console.error(`Error querying topic "${topic}":`, err.message);
    }
  }

  // Blacklist low-relevance or spam terms to keep the galaxy clean and aligned with AI Sovereign objectives
  const RADAR_BLACKLIST = [
    'defi', 'crypto', 'nft', 'game', 'casino', 'hardness', 'telegram-bot', 'discord-bot', 'mini-gpt', 'carpath', 'solana', 'ethereum', 'bitcoin'
  ];

  const uniqueCandidates = [];
  const seen = new Set();
  for (const c of candidates) {
    const lowerName = c.repo.toLowerCase();
    const lowerDesc = (c.description || '').toLowerCase();
    const isBlacklisted = RADAR_BLACKLIST.some(term => lowerName.includes(term) || lowerDesc.includes(term));
    
    if (!isBlacklisted && !seen.has(c.repo)) {
      seen.add(c.repo);
      uniqueCandidates.push(c);
    }
  }

  const newCandidates = uniqueCandidates.filter(c => {
    return !starsList.some(existing => existing.repo.toLowerCase() === c.repo.toLowerCase());
  });

  console.log(`Evaluating ${newCandidates.length} potential new stars...`);

  const evaluated = [];
  for (const c of newCandidates) {
    console.log(`  Scanning coordinates: ${c.repo}`);
    const commits = await getCommitFrequency(c.repo, headers);
    const resolution = await getResolutionRatio(c.repo, headers);
    
    const score = (W_STAR_VELOCITY * c.starVelocity) + (W_COMMIT_FREQUENCY * commits) + (W_RESOLUTION_RATIO * resolution);
    
    evaluated.push({
      ...c,
      commits,
      resolution,
      score
    });

    await new Promise(r => setTimeout(r, 200));
  }

  evaluated.sort((a, b) => b.score - a.score);

  const topSelections = evaluated.slice(0, 3);

  if (topSelections.length > 0) {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    topSelections.forEach(item => {
      const theme = mapTopicToTheme(item.topic);
      const stage = mapTopicToStage(item.topic);
      const relevance = ['local-llm', 'mlx', 'fine-tuning', 'ai-agents'].includes(item.topic) ? 'High' : 'Medium';
      const focus = inferProjectFocus(item.repo, item.description);
      const cta = generateCTA(item.repo, item.description, theme);

      const newEntry = {
        first_seen: todayStr,
        repo: item.repo,
        link: item.link,
        theme: theme,
        stage: stage,
        sovereign_ai_relevance: relevance,
        description: item.description,
        focus: focus,
        call_to_action: cta
      };

      starsList.push(newEntry);
      console.log(`  + Anchored Star: ${item.repo} [Focus: ${focus}]`);
    });

    try {
      fs.writeFileSync(dbPath, JSON.stringify(starsList, null, 2), 'utf8');
      console.log('\n\x1b[32mObservatory galaxy-db.json updated.\x1b[0m');
    } catch (err) {
      console.error('Failed to write back database:', err.message);
    }
  } else {
    console.log('\nNo new stars discovered in this sweep.');
  }
}

discoverRisingStars();
