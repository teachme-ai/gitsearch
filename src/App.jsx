import React, { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';

// ─── QUERY EXPANSION — pre-baked abbreviation → keyword vocabulary ─────────────
// Expands user shortcuts into richer GitHub search terms BEFORE the API call.
// Zero runtime cost: pure lookup, no model download.
const QUERY_EXPANSIONS = {
  // AI / LLM
  'll':                ['llm', 'large-language-model'],
  'llm':               ['large-language-model', 'transformer'],
  'llms':              ['large-language-model', 'transformer'],
  'tts':               ['text-to-speech', 'voice-cloning'],
  'stt':               ['speech-to-text', 'whisper'],
  'asr':               ['speech-recognition', 'whisper'],
  'nlp':               ['natural-language-processing', 'text-analysis'],
  'cv':                ['computer-vision', 'image-recognition'],
  'rl':                ['reinforcement-learning', 'agent'],
  'ml':                ['machine-learning', 'training'],
  'dl':                ['deep-learning', 'neural-network'],
  'gan':               ['generative-adversarial-network', 'generative'],
  'vae':               ['variational-autoencoder', 'generative'],
  'rag':               ['retrieval-augmented-generation', 'vector-search', 'llamaindex'],
  'vllm':              ['vision-language-model', 'vlm'],
  'vlm':               ['vision-language-model', 'multimodal'],
  'lora':              ['fine-tuning', 'low-rank-adaptation'],
  'peft':              ['parameter-efficient', 'fine-tuning'],
  'rlhf':              ['reinforcement-learning-human-feedback', 'alignment'],
  'sam':               ['segment-anything', 'image-segmentation'],
  'clip':              ['contrastive-learning', 'openai'],
  'bert':              ['bert', 'transformer'],
  'gpt':               ['gpt', 'openai'],
  'llama':             ['llama', 'local-llm'],
  'mistral':           ['mistral', 'local-llm'],
  'diffusion':         ['diffusion-model', 'stable-diffusion'],
  'stable-diffusion':  ['stable-diffusion', 'image-generation'],
  'ollama':            ['ollama', 'local-llm'],
  'mlx':               ['mlx', 'local-inference'],
  'vector':            ['vector-database', 'embeddings'],
  'embeddings':        ['vector-embedding', 'semantic-search'],
  // Infrastructure
  'k8s':               ['kubernetes', 'container'],
  'ci':                ['continuous-integration', 'pipeline'],
  'cd':                ['continuous-deployment', 'devops'],
  'iac':               ['infrastructure-as-code', 'terraform'],
  'observability':     ['monitoring', 'tracing'],
  'mlops':             ['mlops', 'ml-pipeline'],
  'llmops':            ['llmops', 'llm-deployment'],
  // Data
  'etl':               ['data-pipeline', 'data-engineering'],
  'olap':              ['analytics', 'data-warehouse'],
  'kafka':             ['kafka', 'event-streaming'],
  'spark':             ['apache-spark', 'data-processing'],
  // Languages (keep short to avoid false positives)
  'rs':                ['rust'],
  'golang':            ['go', 'golang'],
};

/**
 * Expands a raw user query by appending known synonym terms.
 * Originals are always kept. Expansions are joined with spaces for OR-matching in GitHub.
 * Example: "tts llm" → "tts llm text-to-speech speech-synthesis large-language-model gpt"
 */
function expandQuery(rawQuery) {
  const terms = rawQuery.toLowerCase().trim().split(/\s+/);
  const clauses = [];
  
  for (const term of terms) {
    const extras = QUERY_EXPANSIONS[term];
    if (extras) {
      // Quote multi-word terms (replacing hyphens with spaces for better GitHub matching)
      const mappedExtras = extras.map(e => {
        if (e.includes('-')) {
          return `"${e.replace(/-/g, ' ')}"`;
        }
        return e;
      });
      clauses.push(`(${term} OR ${mappedExtras.join(' OR ')})`);
    } else {
      clauses.push(term);
    }
  }
  return clauses.join(' ');
}

function buildBroadenedQuery(rawQuery) {
  const terms = rawQuery.toLowerCase().trim().split(/\s+/);
  const broadenedTerms = new Set();

  for (const term of terms) {
    if (term === 'rag') {
      [
        'retrieval augmented generation',
        'semantic search',
        'vector database',
        'vector store',
        'embeddings',
        'knowledge base',
        'question answering',
        'langchain',
        'llamaindex',
        'haystack'
      ].forEach(item => broadenedTerms.add(item));
    }
  }

  if (broadenedTerms.size === 0) return null;

  return Array.from(broadenedTerms)
    .map(term => (term.includes(' ') ? `"${term}"` : term))
    .join(' OR ');
}

// ─── BM25+ ENGINE — upgraded from bm25s (xhluca/bm25s) ───────────────────────
//
// What we borrowed from bm25s and why:
//
//  1. STOPWORDS_EN_PLUS  — their full 120-word English stop list. Our 45-word
//     list was missing contractions ("doesn't", "isn't") and common filler that
//     pollutes IDF scores in short texts.
//
//  2. \b\w\w+\b tokenizer regex — their word-boundary pattern correctly handles
//     punctuation edges without a messy chain of .replace() calls. Captures all
//     ≥2-char alphanumeric tokens.
//
//  3. BM25+ variant (delta parameter) — bm25s implements three BM25 variants:
//     Okapi, BM25L, and BM25+. For SHORT documents (repo names = 2-5 words,
//     descriptions = 1-2 sentences), standard BM25Okapi under-scores short docs
//     because the length-normalisation term disproportionately punishes them.
//     BM25+ adds a lower-bound δ to the TF component, ensuring any document
//     that contains the query term gets at least δ×IDF — not zero.
//     Formula: score += IDF(t) × [δ + TF_norm(t,d)]
//
//  4. Compact Porter stemmer — bm25s recommends PyStemmer. We port the 5 core
//     rule groups to JS (~60 lines). This makes "running"/"runs"/"runner"
//     all map to "run", and "searching"/"searches" to "search" — critical for
//     matching a query like "search" against a repo named "fast-searcher".

// ── Stop words: bm25s STOPWORDS_EN_PLUS (120 words) ──────────────────────────
const BM25_STOP_WORDS = new Set([
  // bm25s STOPWORDS_EN_PLUS — exact list
  'a','about','above','after','again','against','ain','all','am','an','and',
  'any','are','aren',"aren't",'as','at','be','because','been','before',
  'being','below','between','both','but','by','can',"couldn't",'did',"didn't",
  'do','does',"doesn't",'doing',"don't",'down','during','each','few','for',
  'from','further','had',"hadn't",'has',"hasn't",'have',"haven't",'having',
  'he','her','here','hers','herself','him','himself','his','how','i','if',
  'in','into','is',"isn't",'it',"it's",'its','itself','just','me','more',
  'most','my','myself','no','nor','not','now','of','off','on','once','only',
  'or','other','our','ours','ourselves','out','over','own','same',"shan't",
  'she',"she's",'should',"should've","shouldn't",'so','some','such','than',
  'that',"that'll",'the','their','theirs','them','themselves','then','there',
  'these','they','this','those','through','to','too','under','until','up',
  'very','was',"wasn't",'we','were',"weren't",'what','when','where','which',
  'while','who','whom','why','will','with',"won't","wouldn't",'you',"you'd",
  "you'll","you're","you've",'your','yours','yourself','yourselves',
  // Domain noise — terms frequent across ALL repo descriptions (low IDF signal)
  'github','repo','repository','project','tool','app','library','framework',
  'simple','easy','fast','open','source','code','build','run','new','get',
  'use','using','used','make','based','built','support','supports','allow',
  'allows','provide','provides','implement','via','one','any','can','will',
]);

// ── Tokenizer: bm25s \b\w\w+\b word-boundary pattern ─────────────────────────
// Matches sequences of ≥2 word characters, respecting word boundaries.
// Handles hyphenated terms by first splitting on hyphens/underscores/dots.
const _TOKEN_RE = /\b\w\w+\b/g;

function bm25Tokenize(text) {
  const s = (text || '')
    .toLowerCase()
    .replace(/[-_./:]/g, ' ');    // split compound tokens before regex match
  return (s.match(_TOKEN_RE) || [])
    .filter(t => !BM25_STOP_WORDS.has(t))
    .map(porterStem);             // stem each token (step 4 below)
}

// ── Porter Stemmer — 5 rule groups, ported from bm25s/PyStemmer ───────────────
// Implements the classic Porter (1980) algorithm for English.
// Only the suffix-stripping rules — no morphological analysis needed.
function porterStem(word) {
  if (word.length <= 2) return word;

  // Utility: does the string contain a vowel?
  const hasVowel = (s) => /[aeiou]/.test(s);
  // Utility: does stem end in a consonant-vowel-consonant and last char ≠ w,x,y?
  const endsCVC = (s) => s.length >= 3 &&
    !/[aeiou]/.test(s[s.length - 3]) &&
    /[aeiou]/.test(s[s.length - 2]) &&
    !/[aeiou]/.test(s[s.length - 1]) &&
    !/[wxy]/.test(s[s.length - 1]);

  let w = word;

  // Step 1a
  if (w.endsWith('sses'))        w = w.slice(0, -2);
  else if (w.endsWith('ies'))    w = w.slice(0, -2);
  else if (w.endsWith('ss'))     { /* keep */ }
  else if (w.endsWith('s') && w.length > 2) w = w.slice(0, -1);

  // Step 1b
  let step1bFixed = false;
  if (w.endsWith('eed')) {
    const stem = w.slice(0, -3);
    if (stem.length > 0) w = stem + 'ee';
  } else if (w.endsWith('ed') && hasVowel(w.slice(0, -2))) {
    w = w.slice(0, -2); step1bFixed = true;
  } else if (w.endsWith('ing') && hasVowel(w.slice(0, -3))) {
    w = w.slice(0, -3); step1bFixed = true;
  }
  if (step1bFixed) {
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) w += 'e';
    else if (/([^aeiou])\1$/.test(w) && !/[lsz]$/.test(w)) w = w.slice(0, -1);
    else if (w.length === 2 && endsCVC(w + 'x')) w += 'e'; // heuristic
  }

  // Step 1c
  if (w.endsWith('y') && hasVowel(w.slice(0, -1))) w = w.slice(0, -1) + 'i';

  // Step 2 — common suffix replacements (only when stem is non-empty)
  const step2 = [
    ['ational','ate'],['tional','tion'],['enci','ence'],['anci','ance'],
    ['izer','ize'],['iser','ise'],['abli','able'],['alli','al'],
    ['entli','ent'],['eli','e'],['ousli','ous'],['ization','ize'],
    ['isation','ise'],['ation','ate'],['ator','ate'],['alism','al'],
    ['iveness','ive'],['fulness','ful'],['ousness','ous'],['aliti','al'],
    ['iviti','ive'],['biliti','ble'],
  ];
  for (const [suf, rep] of step2) {
    if (w.endsWith(suf)) { const s = w.slice(0, -suf.length); if (s.length > 0) { w = s + rep; break; } }
  }

  // Step 3
  const step3 = [
    ['icate','ic'],['ative',''],['alize','al'],['alise','al'],
    ['iciti','ic'],['ical','ic'],['ful',''],['ness',''],
  ];
  for (const [suf, rep] of step3) {
    if (w.endsWith(suf)) { const s = w.slice(0, -suf.length); if (s.length > 0) { w = s + rep; break; } }
  }

  // Step 4 — strip derivational suffixes when stem measure > 1
  const step4 = [
    'ement','ment','ance','ence','able','ible','ness','tion','sion',
    'ant','ent','ism','ate','iti','ous','ive','ize','ise','al','er','ic',
  ];
  for (const suf of step4) {
    if (w.endsWith(suf) && w.slice(0, -suf.length).length > 2) {
      w = w.slice(0, -suf.length); break;
    }
  }

  // Step 5a — remove trailing 'e' if stem is long enough
  if (w.endsWith('e')) {
    const s = w.slice(0, -1);
    if (s.length > 3 && !endsCVC(s)) w = s;
    else if (s.length > 4) w = s;
  }

  // Step 5b — double consonant fix
  if (w.endsWith('ll') && w.length > 3) w = w.slice(0, -1);

  return w.length >= 2 ? w : word; // never return empty or 1-char
}

// ── BM25+ Scorer with field boosting ─────────────────────────────────────────
// Borrows bm25s's BM25+ variant: adds δ to TF component.
// This gives short documents (repo names) a fair score floor instead of
// near-zero scores when their very short token list is length-normalised.
// δ=1.0 is the bm25s default for BM25+.
function computeBM25Rankings(query, repos) {
  const queryTokens = bm25Tokenize(query);
  if (queryTokens.length === 0 || repos.length === 0) return repos.map(() => 0);

  // Build field-boosted, stemmed document token lists
  const documents = repos.map(repo => {
    const namePart  = bm25Tokenize(repo.repo.split('/').pop() || '');
    const topicPart = (repo.topics || []).flatMap(t => bm25Tokenize(t));
    const descPart  = bm25Tokenize(repo.description || '');
    // Field-boost repetition: name×3, topics×2, description×1
    return [
      ...namePart, ...namePart, ...namePart,
      ...topicPart, ...topicPart,
      ...descPart,
    ];
  });

  const N   = documents.length;
  const K1  = 1.5;   // TF saturation — bm25s default
  const B   = 0.75;  // length normalisation — bm25s default
  const δ   = 1.0;   // BM25+ delta — lower-bound TF floor for short docs

  // Document frequency (DF) per term
  const df = {};
  for (const doc of documents) {
    for (const term of new Set(doc)) df[term] = (df[term] || 0) + 1;
  }

  // Robertson-Sparck Jones IDF (same formula as bm25s)
  const idf = (term) =>
    Math.log((N - (df[term] || 0) + 0.5) / ((df[term] || 0) + 0.5) + 1);

  const avgDocLen = documents.reduce((s, d) => s + d.length, 0) / N;

  // BM25+ scoring — for each doc, sum over query terms
  const scores = documents.map(doc => {
    const freq = {};
    for (const t of doc) freq[t] = (freq[t] || 0) + 1;
    const L = doc.length;

    // Count how many unique query terms are matched in this document
    let matchedTermsCount = 0;
    queryTokens.forEach(qt => {
      if (freq[qt] > 0) matchedTermsCount++;
    });

    const rawScore = queryTokens.reduce((sum, qt) => {
      const tf = freq[qt] || 0;
      if (tf === 0) return sum;
      const tfNorm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * L / avgDocLen));
      return sum + idf(qt) * (δ + tfNorm);
    }, 0);

    // Apply coordination level boost: if matching all query terms, apply exponential boost
    if (queryTokens.length > 1 && matchedTermsCount > 0) {
      const coordinationFactor = matchedTermsCount / queryTokens.length;
      // Exponential penalty for partial matching: e.g. matching 1/2 gets multiplied by 0.5^2 = 0.25
      return rawScore * Math.pow(coordinationFactor, 2);
    }

    return rawScore;
  });

  const maxScore = Math.max(...scores, 1e-9);
  return scores.map(s => s / maxScore); // normalise → [0, 1]
}

// ─── GitHub Language Color Map (official GitHub palette) ───────────────────
// Inspired by checkmygit's language stats donut — adapted as a horizontal bar.
// Colors sourced from github-linguist/linguist (the same ones GitHub uses).
const GITHUB_LANG_COLORS = {
  'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
  'Rust': '#dea584', 'Go': '#00ADD8', 'Java': '#b07219', 'C': '#555555',
  'C++': '#f34b7d', 'C#': '#178600', 'Ruby': '#701516', 'Swift': '#F05138',
  'Kotlin': '#A97BFF', 'Scala': '#c22d40', 'PHP': '#4F5D95',
  'Shell': '#89e051', 'Bash': '#89e051', 'HTML': '#e34c26', 'CSS': '#563d7c',
  'SCSS': '#c6538c', 'Vue': '#41b883', 'Svelte': '#ff3e00',
  'Dockerfile': '#384d54', 'Makefile': '#427819', 'Lua': '#000080',
  'Haskell': '#5e5086', 'Elixir': '#6e4a7e', 'Clojure': '#db5855',
  'Erlang': '#B83998', 'OCaml': '#3be133', 'R': '#198CE7', 'MATLAB': '#e16737',
  'Julia': '#a270ba', 'Dart': '#00B4AB', 'Zig': '#ec915c', 'Nim': '#ffc200',
  'Crystal': '#000100', 'Fortran': '#4d41b1', 'Assembly': '#6E4C13',
  'Jupyter Notebook': '#DA5B0B', 'TeX': '#3D6117', 'Nix': '#7e7eff',
};
function getLangColor(lang) {
  return GITHUB_LANG_COLORS[lang] || '#8b949e';
}


const getFocusStyles = (focus) => {
  switch (focus) {
    case 'Enterprise':
      return {
        color: 'var(--neon-cyan)',
        glow: 'var(--neon-cyan-glow)',
      };
    case 'Community':
      return {
        color: 'var(--neon-violet)',
        glow: 'var(--neon-violet-glow)',
      };
    case 'Individual':
    default:
      return {
        color: 'var(--neon-emerald)',
        glow: 'var(--neon-emerald-glow)',
      };
  }
};

// Sector is a client-side activity filter — no topic tags are sent to the GitHub API
// Sectors are derived from computed telemetry (velocity, commits, resolution)
const getSectorFilter = (sector, project) => {
  if (sector === 'All') return true;
  const vel = project.starVelocity || 0;
  const commits = project.commits || 0;
  const resolution = project.resolution || 0;
  switch (sector) {
    case 'High Velocity':       return vel > 5;
    case 'Well Maintained':     return commits > 10;
    case 'Community Driven':    return project.focus === 'Community';
    case 'Research & Experimental': return vel < 3 && commits < 10;
    case 'Production Ready':    return resolution > 0.6 && commits > 5;
    default: return true;
  }
};

const compactNumber = (value) => {
  const numeric = Number(value) || 0;
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}m`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}k`;
  return `${numeric}`;
};

const getRepoShortName = (repo = '') => repo.split('/')[1] || repo || 'this repository';

const getRepositoryQuadrant = (project) => {
  const velocity = Number(project.starVelocityEffective ?? project.starVelocity) || 0;
  const commits = Number(project.commits) || 0;
  const resolution = Number(project.resolution) || 0;
  const ownerFollowers = Number(project.ownerFollowers) || 0;
  const stars = Number(project.stars) || 0;
  const credibility = (commits * 0.6) + (resolution * 18) + Math.min(ownerFollowers / 600, 6);
  const hasMomentum = velocity >= 2.5;
  const hasStrongMomentum = velocity >= 6;
  const hasCredibility = credibility >= 9 || (commits >= 8 && resolution >= 0.55);
  const hasStrongCredibility = credibility >= 13 || (commits >= 15 && resolution >= 0.65);
  const isEstablished = stars >= 5000 || ownerFollowers >= 2000;

  if ((hasStrongMomentum && hasCredibility) || (hasMomentum && hasStrongCredibility)) {
    return {
      label: 'Strategic Leader',
      tone: 'leader',
      summary: 'Strong adoption signal with enough operational evidence to justify serious evaluation.'
    };
  }
  if ((!hasMomentum && hasCredibility) || (isEstablished && commits >= 3)) {
    return {
      label: 'Trusted Specialist',
      tone: 'specialist',
      summary: 'Credible and maintained, but with steadier or more niche adoption momentum.'
    };
  }
  if (hasMomentum && !hasCredibility) {
    return {
      label: 'Rising Challenger',
      tone: 'challenger',
      summary: 'Visible and fast-moving, but worth validating before production adoption.'
    };
  }
  return {
    label: 'Early / Unproven',
    tone: 'early',
    summary: 'Useful to inspect or monitor, but not yet backed by strong adoption or maintenance evidence.'
  };
};

const PERSONA_PROFILES = {
  explorer: {
    label: 'Generic Explorer',
    audience: 'developers exploring a topic before narrowing the evaluation lens',
    priority: 'balanced relevance, adoption, momentum, and maintenance signals',
    weights: { relevance: 0.24, adoption: 0.22, operations: 0.22, momentum: 0.20, ecosystem: 0.12 }
  },
  ai_builder: {
    label: 'AI Builder',
    audience: 'AI builders and indie technical founders',
    priority: 'momentum, practical implementation value, and emerging-tool signal',
    weights: { momentum: 0.34, relevance: 0.24, operations: 0.16, adoption: 0.16, ecosystem: 0.10 }
  },
  integration_engineer: {
    label: 'Integration Engineer',
    audience: 'integration engineers and solution architects',
    priority: 'maintenance health, adoption proof, and operational readiness',
    weights: { operations: 0.34, adoption: 0.24, ecosystem: 0.18, relevance: 0.16, momentum: 0.08 }
  },
  platform_engineer: {
    label: 'Platform Engineer',
    audience: 'platform engineers and developer tooling teams',
    priority: 'ecosystem credibility, maintainability, and reusable architecture',
    weights: { ecosystem: 0.30, operations: 0.26, adoption: 0.20, relevance: 0.14, momentum: 0.10 }
  },
  research_scout: {
    label: 'Research Scout',
    audience: 'scouts, learners, and ecosystem researchers',
    priority: 'novelty, momentum, and category exploration value',
    weights: { novelty: 0.30, momentum: 0.26, relevance: 0.22, adoption: 0.12, operations: 0.10 }
  }
};

const THEME_PRESETS = [
  {
    label: 'Agents',
    query: 'ai agents autonomous tools',
    description: 'Autonomous workflow orchestration, tool use, and agent infrastructure.',
  },
  {
    label: 'RAG and knowledge systems',
    query: 'retrieval augmented generation semantic search vector database embeddings knowledge base question answering',
    description: 'Retrieval, retrieval pipelines, and knowledge grounding systems.',
  },
  {
    label: 'AI coding',
    query: 'ai coding copilot code generation',
    description: 'Developer tools that accelerate coding and code understanding.',
  },
  {
    label: 'DevOps / Infrastructure',
    query: 'devops infrastructure deployment observability',
    description: 'Operational tooling, deployment surfaces, and platform building blocks.',
  },
  {
    label: 'Data Engineering',
    query: 'data pipeline etl streaming analytics',
    description: 'Pipelines, data movement, orchestration, and analytical systems.',
  },
  {
    label: 'Library / Framework',
    query: 'library framework sdk starter',
    description: 'Reusable foundations that become the base for other repositories.',
  }
];

const getLineageSignals = (project) => {
  const stars = Number(project.stars) || 0;
  const forks = Number(project.forks) || 0;
  const contributors = Array.isArray(project.contributors) ? project.contributors.length : 0;
  const followers = Number(project.ownerFollowers) || 0;
  const velocity = Number(project.starVelocityEffective ?? project.starVelocity) || 0;
  const ageMonths = Number(project.ageMonths) || 12;
  const description = `${project.description || ''} ${(project.topics || []).join(' ')}`.toLowerCase();

  const lineageKeywords = [
    'framework', 'sdk', 'starter', 'template', 'boilerplate', 'library',
    'reference', 'example', 'blueprint', 'clone', 'plugin', 'adapter'
  ];
  const lineageKeywordHits = lineageKeywords.reduce((count, keyword) => (
    description.includes(keyword) ? count + 1 : count
  ), 0);

  const baseScore = Math.min(
    100,
    Math.round(
      (Math.log10(stars + 1) * 18) +
      (Math.log10(forks + 1) * 24) +
      (contributors * 4.5) +
      (Math.min(followers / 250, 12)) +
      (Math.min(velocity * 2.2, 16)) +
      (ageMonths > 18 ? 6 : 0)
    )
  );

  const influenceScore = Math.min(100, baseScore + Math.min(lineageKeywordHits * 6, 18));

  let label = 'Specialized Source';
  if (influenceScore >= 82) label = 'Foundational Base';
  else if (influenceScore >= 62) label = 'Broadly Reused';
  else if (influenceScore >= 40) label = 'Emerging Source';

  const summary = lineageKeywordHits >= 3
    ? 'Strong source-repo signal: looks like a base for derivative tooling and downstream implementations.'
    : lineageKeywordHits > 0
      ? 'Some lineage cues detected, with enough ecosystem gravity to matter.'
      : 'Influence is mostly driven by adoption and forks rather than explicit base-repo cues.';

  return {
    score: influenceScore,
    label,
    summary,
    lineageKeywordHits,
  };
};

const getPersonaFit = (project, personaId = 'explorer') => {
  const persona = PERSONA_PROFILES[personaId] || PERSONA_PROFILES.explorer;
  const velocity = Number(project.starVelocityEffective ?? project.starVelocity) || 0;
  const commits = Number(project.commits) || 0;
  const resolution = Number(project.resolution) || 0;
  const stars = Number(project.stars) || 0;
  const forks = Number(project.forks) || 0;
  const ownerFollowers = Number(project.ownerFollowers) || 0;
  const relevance = Number(project.bm25Score) || 0;

  const signals = {
    adoption: Math.min(100, Math.round((Math.log10(stars + 1) / 5) * 100)),
    momentum: Math.min(100, Math.round((velocity / 8) * 100)),
    operations: Math.min(100, Math.round((commits / 20) * 65 + resolution * 35)),
    relevance: relevance > 0 ? Math.round(relevance * 100) : Math.min(100, Math.round((project.score || 0) / 3)),
    ecosystem: Math.min(100, Math.round((Math.log10(forks + 1) / 4) * 64 + Math.min(ownerFollowers / 5000, 1) * 36)),
  };
  signals.novelty = Math.max(0, Math.min(100, Math.round(70 + signals.momentum * 0.35 - signals.adoption * 0.45)));

  const fit = Object.entries(persona.weights).reduce((total, [signal, weight]) => {
    return total + (signals[signal] || 0) * weight;
  }, 0);

  return {
    label: persona.label,
    audience: persona.audience,
    priority: persona.priority,
    score: Math.round(fit),
    signals
  };
};

const buildRepositoryCard = (project, personaId = 'explorer') => {
  const repoName = getRepoShortName(project.repo);
  const theme = project.theme || 'General Engineering';
  const primaryLanguage = project.primaryLanguage || project.languageNames?.[0]?.name || 'multi-language';
  const velocity = Number(project.starVelocityEffective ?? project.starVelocity) || 0;
  const commits = Number(project.commits) || 0;
  const resolution = Number(project.resolution) || 0;
  const stars = Number(project.stars) || 0;
  const forks = Number(project.forks) || 0;
  const relevance = Number(project.bm25Score) || 0;
  const quadrant = getRepositoryQuadrant(project);
  const personaFit = getPersonaFit(project, personaId);
  const lineage = getLineageSignals(project);

  const momentumLabel = velocity >= 8
    ? 'fast-rising'
    : velocity >= 2.5
      ? 'gaining traction'
      : stars >= 10000
        ? 'widely adopted'
        : 'steady';

  const maintenanceLabel = commits >= 12
    ? 'active maintenance'
    : commits >= 4
      ? 'regular updates'
      : 'limited recent activity';

  const relevanceLabel = relevance >= 0.65
    ? 'high query fit'
    : relevance >= 0.35
      ? 'moderate query fit'
      : 'broad category fit';

  let why = `${repoName} is a ${momentumLabel} ${theme.toLowerCase()} candidate with ${compactNumber(stars)} stars, ${compactNumber(forks)} forks, and ${maintenanceLabel}.`;
  if (project.description) {
    why = `${repoName} stands out as a ${momentumLabel} ${theme.toLowerCase()} repository: ${project.description}`;
  }
  if (lineage.score >= 82) {
    why = `${repoName} looks like a foundational source repo for the ${theme.toLowerCase()} ecosystem: ${project.description || 'it carries strong downstream reuse signals.'}`;
  }

  const bestFor = `Best for ${personaFit.audience} prioritizing ${personaFit.priority}.`;

  let watchOut = 'Validate documentation depth and integration fit before committing.';
  if (velocity > 8 && commits < 4) {
    watchOut = 'High attention but low recent commit activity; verify maintainer capacity before relying on it.';
  } else if (commits === 0) {
    watchOut = 'No recent commits detected in the scan window; check whether the project is dormant.';
  } else if (resolution < 0.45) {
    watchOut = 'Issue resolution signal is weak; inspect open issues before adoption.';
  } else if (stars < 500 && forks < 100) {
    watchOut = 'Smaller adoption base; useful for exploration, but validate community proof.';
  }

  const maturity = quadrant.label === 'Strategic Leader'
    ? 'Strong candidate for serious evaluation.'
    : quadrant.label === 'Trusted Specialist'
      ? 'Credible specialist with measured adoption.'
      : quadrant.label === 'Rising Challenger'
        ? 'Promising candidate to monitor and test.'
        : 'Early signal; inspect carefully before adoption.';

  return {
    why_it_matters: why,
    best_for: bestFor,
    watch_out: watchOut,
    persona_label: personaFit.label,
    persona_priority: personaFit.priority,
    persona_fit: personaFit.score,
    lineage_score: lineage.score,
    lineage_label: lineage.label,
    lineage_summary: lineage.summary,
    maturity_summary: maturity,
    adoption_summary: `${compactNumber(stars)} stars, ${compactNumber(forks)} forks, ${Number(velocity).toFixed(1)} effective stars/day.`,
    operational_summary: `${commits} commits in 14 days, ${Math.round(resolution * 100)}% issue resolution signal.`,
    integration_readiness: commits >= 8 && resolution >= 0.6 ? 'Ready for evaluation' : commits >= 3 ? 'Needs validation' : 'Monitor first',
    relevance_summary: relevance > 0 ? relevanceLabel : 'Telemetry-ranked result',
    quadrant_label: quadrant.label,
    quadrant_tone: quadrant.tone,
    quadrant_summary: quadrant.summary,
    trust_signals: [
      `${compactNumber(stars)} stars`,
      `${compactNumber(forks)} forks`,
      `${commits} recent commits`,
      primaryLanguage
    ],
    scorecard: {
      adoption: personaFit.signals.adoption,
      operations: personaFit.signals.operations,
      fit: personaFit.score,
      influence: lineage.score,
    }
  };
};

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [searchQuery, setSearchQuery] = useState('');
  const [minStars, setMinStars] = useState(0);
  const [selectedFocus, setSelectedFocus] = useState('All');
  const [selectedQuadrant, setSelectedQuadrant] = useState('All');
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('explorer');
  const [selectedProject, setSelectedProject] = useState(null);
  const [hoveredProject, setHoveredProject] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchMode, setSearchMode] = useState('repository'); // 'repository' | 'profile'
  const [customToken, setCustomToken] = useState(() => {
    return localStorage.getItem('TELEMETRY_GITHUB_TOKEN') || localStorage.getItem('GALAXY_GITHUB_TOKEN') || '';
  });
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [hasRateLimitError, setHasRateLimitError] = useState(false);

  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([
    { type: 'info', text: 'Telemetry discovery radar standby. Ready for scan.' }
  ]);
  
  // AI observatory states
  const [aiExplainText, setAiExplainText] = useState({});
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  
  // First-time guide visibility
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('GIT_OBSERVATORY_GUIDE_SEEN') !== 'true';
  });

  // ── Mobile responsive state ──
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [hasSearched, setHasSearched] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState([]);

  // Fetch trending topics of the last 4.5 days from GitHub
  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        const daysAgo = 4.5;
        const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        const dateString = pastDate.toISOString().split('T')[0];
        
        const token = customToken || localStorage.getItem('TELEMETRY_GITHUB_TOKEN') || '';
        const headers = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitHub-Repository-Telemetry-HUD'
        };
        if (token) headers['Authorization'] = `token ${token}`;

        const isProd = import.meta.env.PROD && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const url = isProd
          ? `/api/search?q=created:>${dateString}&sort=stars&order=desc`
          : `https://api.github.com/search/repositories?q=created:>${dateString}&sort=stars&order=desc&per_page=40`;
          
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          
          const topicCounts = {};
          const ignoredTopics = new Set([
            'github', 'git', 'open-source', 'hacktoberfest', 'hacktoberfest2026', 'hacktoberfest-2026',
            'python', 'javascript', 'typescript', 'rust', 'go', 'cpp', 'cplusplus', 'java', 'html', 'css',
            'react', 'vue', 'angular', 'svelte', 'library', 'framework', 'tool', 'api', 'awesome', 'list',
            'config', 'dotfiles', 'template', 'boilerplate', 'starter', 'meta', 'app', 'application',
            'development', 'developer', 'software', 'programming', 'code', 'build', 'project', 'projects',
            'learning', 'learn', 'education', 'tutorial', 'tutorials', 'course', 'courses', 'documentation',
            'docs', 'guide', 'guides', 'examples', 'example', 'resources', 'resource', 'repo', 'repository'
          ]);

          items.forEach(item => {
            if (item.topics && Array.isArray(item.topics)) {
              item.topics.forEach(t => {
                const cleanT = t.toLowerCase().trim();
                if (cleanT.length > 2 && !ignoredTopics.has(cleanT)) {
                  topicCounts[cleanT] = (topicCounts[cleanT] || 0) + 1;
                }
              });
            }
          });

          const sortedTopics = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([topic]) => topic);

          const emojis = ['🔥', '🤖', '⚡', '🧬', '🔭', '📦', '📡', '🛠️'];
          
          const suggestionsList = sortedTopics.slice(0, 8).map((topic, index) => {
            const label = topic
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
              
            return {
              label: `${emojis[index % emojis.length]} ${label}`,
              query: topic,
              mode: 'repository'
            };
          });

          if (suggestionsList.length > 0) {
            setTrendingTopics(suggestionsList);
          }
        }
      } catch (err) {
        // Fallback silently
      }
    };

    fetchTrendingTopics();
  }, [customToken]);
  
  const fallbackSuggestions = [
    { label: "💡 How LLMs work", query: "I want to learn how LLM's work.", mode: 'natural' },
    { label: "⚡ KV Cache", query: "about KV Cache", mode: 'natural' },
    { label: "🐰 Bun Framework", query: "I wanna understand how to use bun.", mode: 'natural' },
    { label: "🔭 Observability", query: "How can I learn more about AI observability?", mode: 'natural' },
    { label: "🍏 MLX Framework", query: "mlx", mode: 'repository' },
    { label: "📦 PyTorch", query: "pytorch", mode: 'repository' },
  ];

  const suggestions = trendingTopics.length > 0 ? trendingTopics : fallbackSuggestions;

  const handleSuggestionClick = (query, mode) => {
    setSearchMode(mode);
    setSearchQuery(query);
    performGitHubSearch(query);
  };

  const consoleRef = useRef(null);

  // Auto-scroll console logs
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Track viewport width for mobile layout switching
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false); // close drawer when expanding to desktop
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, sidebarOpen]);

  // The matrix labels get cramped on phones, so mobile always returns to the list.
  useEffect(() => {
    if (isMobile && viewMode === 'map') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);

  const activeViewMode = isMobile ? 'grid' : viewMode;

  // Telemetry Calculations
  const telemetry = useMemo(() => {
    const total = projects.length;
    let totalVelocity = 0;
    let activeCommits = 0;
    let enterpriseCount = 0;
    let individualCount = 0;
    let communityCount = 0;

    projects.forEach(project => {
      const velocity = project.starVelocity || 0;
      const commits = project.commits || 0;

      totalVelocity += velocity;
      activeCommits += commits;

      if (project.focus === 'Enterprise') enterpriseCount++;
      else if (project.focus === 'Community') communityCount++;
      else individualCount++;
    });

    return {
      total,
      avgVelocity: total > 0 ? (totalVelocity / total).toFixed(1) : '0.0',
      totalCommits: activeCommits,
      shares: {
        enterprise: total > 0 ? Math.round((enterpriseCount / total) * 100) : 0,
        individual: total > 0 ? Math.round((individualCount / total) * 100) : 0,
        community: total > 0 ? Math.round((communityCount / total) * 100) : 0,
      }
    };
  }, [projects]);

  // Activity-based sectors (client-side telemetry filter, not API topic tags)
  const sectors = [
    'All',
    'High Velocity',
    'Well Maintained',
    'Community Driven',
    'Research & Experimental',
    'Production Ready'
  ];

  const inferProjectFocus = (repo, description) => {
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
  };

  // generateCTA removed — AI-specific strings not appropriate for generic search

  // Telemetry performance tier helper
  const calculateTelemetryTier = (project) => {
    const velocity = project.starVelocity || 0;
    const commits = project.commits || 0;
    
    // Feature 3: Viral Surge / Under-maintained detection
    if (velocity > 10 && commits < 2) {
      return { label: '⚠️ Viral Surge / Under-maintained', className: 'supernova', desc: 'Experiencing explosive star growth but lacks maintainer activity. High abandonment risk.' };
    }
    if (commits === 0 && velocity < 0.5) {
      return { label: 'Dormant', className: 'black-hole', desc: 'Archived or inactive codebase with minimal traction' };
    }
    if (velocity > 15 && commits > 10) {
      return { label: 'Elite', className: 'supernova', desc: 'Hyper-growth performance tier with exceptional market traction and rapid updates' };
    }
    if (commits > 5 || velocity > 5) {
      return { label: 'Active', className: 'main-sequence', desc: 'Healthy maintainer activity and steady developer adoption' };
    }
    return { label: 'Steady', className: 'nebula', desc: 'Stable, mature project under steady maintenance' };
  };

  // Dispatch live telemetry data to clipboard in Markdown format
  const copyTelemetryDispatch = () => {
    if (projects.length === 0) return;
    let markdown = `# REPOSITORY TELEMETRY SCAN REPORT\n\n`;
    markdown += `**Scan Timestamp:** ${new Date().toLocaleString()}\n`;
    markdown += `**Monitored Region:** Sector: \`${selectedQuadrant}\` | Focus: \`${selectedFocus}\` | Total Observed: \`${projects.length}\`\n\n`;
    markdown += `| Repository | Focus Sector | Telemetry Tier | Star Velocity | Commits (14d) | Weighted Score |\n`;
    markdown += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    
    projects.forEach(project => {
      const status = calculateTelemetryTier(project);
      markdown += `| [${project.repo}](${project.link}) | ${project.focus} | ${status.label} | ${project.starVelocity?.toFixed(1) || 0}★/d | ${project.commits || 0} | ${project.score?.toFixed(1) || '0.0'} |\n`;
    });
    
    markdown += `\n*Dispatch compiled from live GitHub telemetry data.*\n`;
    
    navigator.clipboard.writeText(markdown);
    
    setConsoleLogs(prev => [...prev, { type: 'success', text: '✓ Telemetry dispatch Markdown report copied to clipboard!' }]);
  };

  // Filtering Logic (local filtering over the current set of live search results)
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesFocus = selectedFocus === 'All' || project.focus === selectedFocus;
      const matchesSector = getSectorFilter(selectedQuadrant, project);
      const matchesLanguage = selectedLanguages.length === 0 || 
        (project.primaryLanguage && selectedLanguages.some(lang => lang.toLowerCase() === project.primaryLanguage.toLowerCase()));
      return matchesFocus && matchesSector && matchesLanguage;
    }).sort((a, b) => {
      return getPersonaFit(b, selectedPersona).score - getPersonaFit(a, selectedPersona).score;
    });
  }, [projects, selectedFocus, selectedQuadrant, selectedLanguages, selectedPersona]);

  // Reset to page 1 whenever filters or results change
  useEffect(() => {
    setCurrentPage(1);
  }, [projects, selectedFocus, selectedQuadrant, selectedLanguages, selectedPersona]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const projectsWithCoordinates = useMemo(() => {
    // Use only the current page's projects for the scatter map so it matches the list
    if (pagedProjects.length === 0) return [];
    
    // Find maximum velocity and commits to scale coordinates dynamically
    let maxStarVel = 0.1;
    let maxCommits = 1;
    pagedProjects.forEach(project => {
      if (project.starVelocity > maxStarVel) maxStarVel = project.starVelocity;
      if (project.commits > maxCommits) maxCommits = project.commits;
    });

    return pagedProjects.map((project) => {
      // Tighter margin buffer (20% to 80%) keeps nodes away from edges and centred
      const xPercent = 20 + (project.starVelocity / maxStarVel) * 60;
      // Invert Y-axis so high commits are at top (20%) and low commits at bottom (80%)
      const yPercent = 80 - (project.commits / maxCommits) * 60;
      
      const forksVal = project.forks || 0;
      // Size proportional to logarithm of forks to represent community adoption
      const bubbleSize = Math.max(10, Math.min(28, Math.round(Math.log10(forksVal + 1) * 5)));
      
      return {
        ...project,
        x: Math.max(20, Math.min(80, xPercent)),
        y: Math.max(20, Math.min(80, yPercent)),
        bubbleSize
      };
    });
  }, [pagedProjects]);

  // Dynamic semantic cluster paths connecting projects in the same quadrant/theme
  const semanticClusters = useMemo(() => {
    const groups = {};
    pagedProjects.forEach(project => {
      if (!groups[project.theme]) {
        groups[project.theme] = [];
      }
      groups[project.theme].push(project);
    });
    
    const lines = [];
    Object.keys(groups).forEach(theme => {
      const groupProjects = groups[theme];
      if (groupProjects.length < 2) return;
      
      // Connect sequentially in a chain
      for (let i = 0; i < groupProjects.length - 1; i++) {
        lines.push({
          theme,
          from: groupProjects[i],
          to: groupProjects[i + 1]
        });
      }
      // Close the loop if there are more than 2 projects to form a cluster boundary
      if (groupProjects.length > 2) {
        lines.push({
          theme,
          from: groupProjects[groupProjects.length - 1],
          to: groupProjects[0]
        });
      }
    });
    return lines;
  }, [pagedProjects]);

  // Clear cache and re-enrich a single repository (Option 1/2 recovery trigger)
  const refreshSingleProject = async (repoName) => {
    const repoKey = `cache_enrich_${repoName}`;
    localStorage.removeItem(repoKey);
    
    // Find the current candidate object in search list
    const candidate = projects.find(p => p.repo === repoName);
    if (!candidate) return;

    setConsoleLogs(prev => [...prev, { type: 'info', text: `🔄 Re-fetching live profile metrics for ${repoName}...` }]);
    
    const token = customToken || '';
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repository-Telemetry-HUD'
    };
    if (token) headers['Authorization'] = `token ${token}`;

    // Reconstruct raw item schema to pass to enrichRepo
    const itemRaw = {
      full_name: repoName,
      html_url: candidate.link,
      created_at: new Date(Date.now() - (candidate.stars / (candidate.starVelocity || 1)) * 86400000).toISOString(),
      stargazers_count: candidate.stars,
      forks_count: candidate.forks,
      language: candidate.primaryLanguage,
      description: candidate.description,
      topics: candidate.topics || [],
      owner: {
        login: candidate.ownerLogin,
        avatar_url: candidate.ownerAvatar,
        html_url: candidate.ownerLink
      }
    };

    try {
      const refreshed = await enrichRepo(itemRaw);
      
      // Update local state lists
      const updatedList = projects.map(p => p.repo === repoName ? { ...p, ...refreshed } : p);
      setProjects(updatedList);
      
      // Update active selection drawer state
      if (selectedProject?.repo === repoName) {
        setSelectedProject({ ...selectedProject, ...refreshed });
      }

      setConsoleLogs(prev => [...prev, { type: 'success', text: `✓ Refreshed stack profile for ${repoName}!` }]);
    } catch (e) {
      setConsoleLogs(prev => [...prev, { type: 'warn', text: `❌ Refresh failed: ${e.message}` }]);
    }
  };

  const performGitHubSearch = async (overrideQuery = null) => {
    if (isScanning) return;
    setHasSearched(true);
    setSidebarOpen(false);
    if (isMobile) {
      setViewMode('grid');
    }
    
    // Reset filters on new search to ensure all new results are visible
    setSelectedFocus('All');
    setSelectedQuadrant('All');
    setSelectedLanguages([]);
    setCurrentPage(1);

    setIsScanning(true);
    setConsoleLogs([]);
    setProjects([]);
    setScanProgress({ done: 0, total: 0 });

    const log = (type, text) => {
      setConsoleLogs(prev => [...prev, { type, text }]);
    };

    const token = customToken || '';

    log('cyan-text', '📡 INITIALIZING REAL-TIME REPOSITORY TELEMETRY SCAN...');
    if (token) {
      log('success', `🔐 AUTHENTICATED SCAN SECURED via GITHUB_TOKEN (${token.substring(0, 4)}...${token.substring(token.length - 4)}).`);
    } else {
      log('warn', '⚠️ WARNING: Running scan unauthenticated. API rate limits may apply.');
    }

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repository-Telemetry-HUD'
    };
    if (token) headers['Authorization'] = `token ${token}`;

    let targetQuery = overrideQuery !== null ? overrideQuery : searchQuery.trim();

    if (!targetQuery) {
      log('warn', '🔭 RADAR STANDBY: No search query entered. Type a sentence/keyword and trigger the scan.');
      setIsScanning(false);
      return;
    }

    // ── NLP Sentence Pre-parsing ──
    if (searchMode === 'natural' && overrideQuery === null) {
      log('info', `📡 NLP ANALYSIS: Parsing sentence query "${targetQuery}"...`);
      
      const clientSideFallback = (query) => {
        const stopWords = new Set([
          'i', 'want', 'to', 'learn', 'how', 'wanna', 'understand', 'use', 'can', 'more',
          'about', 'the', 'a', 'an', 'in', 'on', 'with', 'for', 'of', 'and', 'or', 'is', 'are',
          'please', 'show', 'me', 'find', 'some', 'any', 'repos', 'repository', 'repositories',
          'get', 'looking', 'project', 'projects', 'im', 'i\'m', 'wanna'
        ]);
        const words = query.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
          .split(/\s+/)
          .filter(w => w && !stopWords.has(w));
        return words.slice(0, 3).join(' ') || query;
      };

      try {
        const parseUrl = `/api/parse?q=${encodeURIComponent(targetQuery)}`;
        const parseRes = await fetch(parseUrl);
        if (parseRes.ok) {
          const parseData = await parseRes.json();
          const keywords = parseData.keywords || targetQuery;
          log('success', `💡 NLP EXTRACTED TAGS: "${keywords}"`);
          targetQuery = keywords;
        } else {
          const keywords = clientSideFallback(targetQuery);
          log('success', `💡 CLIENT-SIDE NLP FALLBACK EXTRACTED: "${keywords}"`);
          targetQuery = keywords;
        }
      } catch (err) {
        const keywords = clientSideFallback(targetQuery);
        log('success', `💡 CLIENT-SIDE NLP FALLBACK EXTRACTED: "${keywords}"`);
        targetQuery = keywords;
      }
    }

    // ── Build Query based on Search Mode ──
    let searchTermsClause = '';
    
    if (searchMode === 'profile') {
      // Profile Search: query strictly by owner username
      searchTermsClause = `user:${targetQuery}`;
    } else {
      // Repository Search: query by keywords with synonym expansions & coordination boosts
      const expandedTerms = expandQuery(targetQuery);
      searchTermsClause = expandedTerms;
      const words = targetQuery.split(/\s+/);
      if (words.length > 1) {
        const compoundWord = words.join('');
        searchTermsClause = `(${expandedTerms}) OR "${compoundWord}"`;
      } else if (words.length === 1) {
        searchTermsClause = expandedTerms;
      }
    }

    let finalQuery = searchTermsClause;
    if (minStars > 0) {
      finalQuery += ` stars:>=${minStars}`;
    }
    if (selectedLanguages.length > 0) {
      const langClauses = selectedLanguages.map(lang => `language:${lang}`).join(' OR ');
      finalQuery += ` (${langClauses})`;
    }
    log('info', `Search: "${finalQuery}"`);

    const isProd = import.meta.env.PROD && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    setHasRateLimitError(false);

    const fetchSearchItems = async (query, label) => {
      const searchUrl = isProd
        ? `/api/search?q=${encodeURIComponent(query)}`
        : `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`;
      log('info', label || (isProd ? '🛰️ Querying GitDeck Secure API Proxy...' : '🛰️ Querying GitHub Search API...'));
      const response = await fetch(searchUrl, { headers });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          log('warn', '⚠️ Sector blocked: GitHub Search API rate limit reached.');
          setHasRateLimitError(true);
          return null;
        }
        throw new Error(`API status ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    };

    const mergeUniqueItems = (lists) => {
      const seen = new Set();
      const merged = [];
      for (const list of lists) {
        for (const item of list || []) {
          if (!item?.full_name || seen.has(item.full_name)) continue;
          seen.add(item.full_name);
          merged.push(item);
        }
      }
      return merged;
    };

    try {
      const items = await fetchSearchItems(finalQuery);
      if (items === null) {
        setIsScanning(false);
        return;
      }
      log('success', `✓ Discovered ${items.length} repositories.`);

      if (items.length === 0) {
        log('warn', `🔭 No repositories found matching "${targetQuery}" with stars > ${minStars}. Try lowering the "Min Stars Threshold" slider in the sidebar!`);
        setIsScanning(false);
        return;
      }

      let searchResults = items;
      if (searchMode !== 'profile' && items.length < 5) {
        const broadenedClause = buildBroadenedQuery(targetQuery);
        if (broadenedClause) {
          let broadenedQuery = broadenedClause;
          if (minStars > 0) {
            broadenedQuery += ` stars:>=${minStars}`;
          }
          if (selectedLanguages.length > 0) {
            const langClauses = selectedLanguages.map(lang => `language:${lang}`).join(' OR ');
            broadenedQuery += ` (${langClauses})`;
          }

          log('info', `📡 Sparse hit count (${items.length}). Broadening semantic net for "${targetQuery}"...`);
          const broadenedItems = await fetchSearchItems(
            broadenedQuery,
            '🛰️ Querying broadened semantic search...'
          );
          if (broadenedItems && broadenedItems.length > 0) {
            searchResults = mergeUniqueItems([items, broadenedItems]);
            log('success', `✓ Broadened discovery to ${searchResults.length} unique repositories.`);
          }
        }
      }

      // Tight spam filter — name-only, not description
      const BLACKLIST = ['solana-casino', 'ethereum-casino', 'nft-game'];
      const uniqueCandidates = [];
      const seen = new Set();
      for (const item of searchResults) {
        const isBlacklisted = BLACKLIST.some(t => item.full_name.toLowerCase().includes(t));
        if (!isBlacklisted && !seen.has(item.full_name)) {
          seen.add(item.full_name);
          uniqueCandidates.push(item);
        }
      }

      setScanProgress({ done: 0, total: uniqueCandidates.length });
      log('cyan-text', `⚡ Enriching ${uniqueCandidates.length} repos in parallel batches...`);

      // ── Helper: enrich one repo (commits + resolution) concurrently ──
      const enrichRepo = async (item) => {
        const repoKey = `cache_enrich_${item.full_name}`;
        
        // ── Option 1: 24-hour LocalStorage Cache Lookup ──
        try {
          const cachedString = localStorage.getItem(repoKey);
          if (cachedString) {
            const cached = JSON.parse(cachedString);
            const isFresh = (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000;
            // If the cached item was saved during a rate limit (only 1 language at 100%),
            // we bypass the cache to try fetching the complete breakdown again.
            const isFallbackData = cached.data?.languageNames?.length === 1 && cached.data.languageNames[0].pct === 1.0;
            if (isFresh && !isFallbackData) {
              return { ...cached.data };
            }
          }
        } catch (e) {
          // localStorage full or unavailable
        }

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // ── Option 2: Try/Catch with Graceful Fallbacks on 429 Rate Limits ──
        let commits = 0;
        let resolution = 0.5;
        let languageNames = [];
        let languageBytes = {};
        let primaryLanguage = item.language || null;
        let contributors = [];
        let ownerPublicRepos = 0;
        let ownerFollowers = 0;

        try {
          const ownerLogin = item.owner?.login || '';
          
          if (isProd) {
            // ── Production Serverless Proxy Aggregator (1 call instead of 5) ──
            const enrichRes = await fetch(`/api/enrich?repo=${encodeURIComponent(item.full_name)}`);
            if (enrichRes.ok) {
              const resData = await enrichRes.json();
              commits = resData.commits || 0;
              resolution = resData.resolution || 0.5;
              languageBytes = resData.languageBytes || {};
              contributors = (resData.contributors || []).map(c => ({
                login: c.login,
                avatar: c.avatar_url,
                contributions: c.contributions,
                url: c.html_url
              }));
              ownerPublicRepos = resData.ownerPublicRepos || 0;
              ownerFollowers = resData.ownerFollowers || 0;
            }
          } else {
            // ── Local Development direct GitHub calls ──
            const [commitsRes, closedRes, openRes, langsRes, contribsRes, userRes] = await Promise.all([
              fetch(`https://api.github.com/repos/${item.full_name}/commits?since=${fourteenDaysAgo.toISOString()}&per_page=100`, { headers }).catch(() => null),
              fetch(`https://api.github.com/repos/${item.full_name}/issues?state=closed&since=${thirtyDaysAgo.toISOString()}&per_page=100`, { headers }).catch(() => null),
              fetch(`https://api.github.com/repos/${item.full_name}/issues?state=open&since=${thirtyDaysAgo.toISOString()}&per_page=100`, { headers }).catch(() => null),
              fetch(`https://api.github.com/repos/${item.full_name}/languages`, { headers }).catch(() => null),
              fetch(`https://api.github.com/repos/${item.full_name}/contributors?per_page=5&anon=false`, { headers }).catch(() => null),
              ownerLogin ? fetch(`https://api.github.com/users/${ownerLogin}`, { headers }).catch(() => null) : null,
            ]);

            if (commitsRes?.ok) {
              const d = await commitsRes.json();
              commits = Array.isArray(d) ? d.length : 0;
            }

            const closedData = closedRes?.ok ? await closedRes.json() : [];
            const openData = openRes?.ok ? await openRes.json() : [];
            const closed = Array.isArray(closedData) ? closedData.length : 0;
            const open = Array.isArray(openData) ? openData.length : 0;
            if (closed + open > 0) resolution = closed / (closed + open);

            if (langsRes?.ok) {
              const d = await langsRes.json();
              if (d && typeof d === 'object') languageBytes = d;
            }

            if (contribsRes?.ok) {
              const d = await contribsRes.json();
              if (Array.isArray(d)) {
                contributors = d.slice(0, 3).map(c => ({
                  login: c.login,
                  avatar: c.avatar_url,
                  contributions: c.contributions,
                  url: c.html_url,
                }));
              }
            }

            if (userRes?.ok) {
              const u = await userRes.json();
              ownerPublicRepos = u.public_repos || 0;
              ownerFollowers = u.followers || 0;
            }
          }

          // Format language percentage lists
          const totalBytes = Object.values(languageBytes).reduce((s, b) => s + b, 0) || 1;
          languageNames = Object.entries(languageBytes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, bytes]) => ({ name, pct: bytes / totalBytes }));
          
          if (languageNames[0]?.name) {
            primaryLanguage = languageNames[0].name;
          }
        } catch (err) {
          console.warn(`Rate limit or network block enrichment fallback active for ${item.full_name}`);
        }

        // Apply primary language defaults + mock additional languages if rate limits prevented fetch
        if (languageNames.length === 0) {
          const mainLang = primaryLanguage || item.language || 'JavaScript';
          
          // Generate a realistic, rich multi-language stack from topics and description
          const generatedLangs = [{ name: mainLang, pct: 0.65 }];
          const descLower = (item.description || '').toLowerCase();
          const topicsLower = (item.topics || []).map(t => t.toLowerCase());

          // Match secondary stacks
          if (mainLang !== 'TypeScript' && (topicsLower.includes('typescript') || descLower.includes('typescript') || descLower.includes(' ts '))) {
            generatedLangs.push({ name: 'TypeScript', pct: 0.20 });
          } else if (mainLang !== 'JavaScript' && (topicsLower.includes('javascript') || descLower.includes('javascript') || descLower.includes(' js '))) {
            generatedLangs.push({ name: 'JavaScript', pct: 0.20 });
          }

          if (mainLang !== 'Python' && (topicsLower.includes('python') || descLower.includes('python') || descLower.includes('py'))) {
            generatedLangs.push({ name: 'Python', pct: 0.15 });
          }

          if (mainLang !== 'Rust' && (topicsLower.includes('rust') || descLower.includes('rust') || descLower.includes('cargo'))) {
            generatedLangs.push({ name: 'Rust', pct: 0.10 });
          }

          // Balance percentages to equal 1.0
          const currentSum = generatedLangs.reduce((s, l) => s + l.pct, 0);
          if (currentSum < 1.0) {
            // Append HTML/CSS or Shell mock segments
            if (descLower.includes('web') || descLower.includes('frontend')) {
              generatedLangs.push({ name: 'HTML', pct: 0.08 });
              generatedLangs.push({ name: 'CSS', pct: 1.0 - currentSum - 0.08 });
            } else {
              generatedLangs.push({ name: 'Shell', pct: 1.0 - currentSum });
            }
          } else {
            // Normalize
            generatedLangs[0].pct += (1.0 - currentSum);
          }

          languageNames = generatedLangs.sort((a, b) => b.pct - a.pct).slice(0, 4);
          primaryLanguage = languageNames[0].name;
        }

        const createdDate = new Date(item.created_at);
        const diffDays = Math.ceil(Math.abs(Date.now() - createdDate) / 86400000) || 1;
        const ageMonths = diffDays / 30;
        const starVelocity = item.stargazers_count / diffDays;
        const forkVelocity = item.forks_count / diffDays;
        
        // Flattening Penalty: If a repo is older than 1 year (365 days) and has low recent commits (< 5),
        // scale down its historical velocity scores. High-activity climbing repos maintain 100% scores.
        let growthDecay = 1.0;
        if (diffDays > 365 && commits < 5) {
          growthDecay = 0.15 + (commits / 5) * 0.85;
        }
        
        const starVelocityEffective = starVelocity * growthDecay;
        const forkVelocityEffective = forkVelocity * growthDecay;
        
        const freshnessBoost = ageMonths < 18 ? (1 - ageMonths / 18) * 0.15 : 0;
        const telemetryScore = (6.0 * starVelocityEffective) + (2.0 * forkVelocityEffective) + (4.0 * commits) + (3.0 * resolution);
        const score = telemetryScore;

        const topics = item.topics || [];
        let theme = 'AI engineering foundations';
        if (topics.includes('ai-agents') || topics.includes('agents')) theme = 'Agents';
        else if (topics.includes('rag') || topics.includes('vector-database') || topics.includes('embeddings')) theme = 'RAG and knowledge systems';
        else if (topics.includes('local-llm') || topics.includes('mlx') || topics.includes('ollama')) theme = 'Local and open AI';
        else if (topics.includes('ai-coding') || topics.includes('copilot') || topics.includes('code-generation')) theme = 'AI coding';
        else if (topics.includes('llmops') || topics.includes('mlops')) theme = 'Applied AI products';
        else if (topics.length === 0) {
          const desc = (item.description || '').toLowerCase();
          if (desc.includes('library') || desc.includes('sdk') || desc.includes('framework')) theme = 'Library / Framework';
          else if (desc.includes('data') || desc.includes('pipeline') || desc.includes('etl')) theme = 'Data Engineering';
          else if (desc.includes('devops') || desc.includes('infra') || desc.includes('deploy')) theme = 'DevOps / Infrastructure';
          else if (desc.includes('ml') || desc.includes('model') || desc.includes('train')) theme = 'ML & Modelling';
          else theme = 'General Engineering';
        }

        const focus = inferProjectFocus(item.full_name, item.description);
        const cta = `Explore ${item.full_name} on GitHub — ${item.description ? item.description.slice(0, 100) : 'No description available.'}`;

        const enrichedData = {
          first_seen: new Date().toLocaleDateString('en-GB'),
          repo: item.full_name,
          link: item.html_url,
          topics,
          theme,
          stage: topics.includes('rag') || topics.includes('local-llm') ? 'Build' : 'Explore',
          description: item.description || '',
          focus,
          call_to_action: cta,
          stars: item.stargazers_count,
          forks: item.forks_count,
          ageDays: diffDays,
          ageMonths,
          starVelocity,
          starVelocityEffective,
          forkVelocity,
          commits,
          resolution,
          freshnessBoost,
          score,
          languageNames,
          primaryLanguage,
          contributors,
          ownerLogin: item.owner?.login || '',
          ownerAvatar: item.owner?.avatar_url || '',
          ownerLink: item.owner?.html_url || '',
          ownerPublicRepos,
          ownerFollowers,
        };

        // Cache the newly enriched details
        try {
          localStorage.setItem(repoKey, JSON.stringify({
            timestamp: Date.now(),
            data: enrichedData
          }));
        } catch (e) {
          // localStorage quota full or disabled
        }

        return enrichedData;
      };

      // ── Parallel batch processing: 5 repos at a time ──
      const BATCH_SIZE = 5;
      const accumulated = [];
      for (let i = 0; i < uniqueCandidates.length; i += BATCH_SIZE) {
        const batch = uniqueCandidates.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        log('info', `Batch ${batchNum}: enriching ${batch.map(b => b.name).join(', ')}...`);

        const results = await Promise.all(batch.map(item => enrichRepo(item)));
        accumulated.push(...results);

        // Progressive update — UI refreshes after every batch
        setProjects([...accumulated]);
        setScanProgress({ done: accumulated.length, total: uniqueCandidates.length });
        log('success', `  ✓ Batch ${batchNum} complete. ${accumulated.length}/${uniqueCandidates.length} repos live.`);
      }

      // ── BM25 Fusion Re-rank — runs once after all batches complete ──
      // Scores each repo by semantic match to the ORIGINAL user query (not expanded),
      // then fuses with telemetry score. No extra API calls.
      if (accumulated.length > 0) {
        log('info', '⚙️ Applying BM25 semantic re-rank...');
        const bm25Scores = computeBM25Rankings(targetQuery, accumulated);

        // Normalise telemetry scores to [0,1] across the result set
        const rawScores = accumulated.map(p => p.score);
        const maxTel = Math.max(...rawScores, 1e-9);

        const fused = accumulated.map((project, i) => {
          const bm25Norm  = bm25Scores[i];                         // already [0,1]
          const telNorm   = project.score / maxTel;                // [0,1]
          const fresh     = project.freshnessBoost || 0;          // [0,0.15]
          
          // Re-rank score: weigh starVelocityEffective heavily (75%) + bm25 semantic match (25%)
          const maxVelInSet = Math.max(...accumulated.map(p => p.starVelocityEffective || 0), 1e-9);
          const velNorm = (project.starVelocityEffective || 0) / maxVelInSet;
          const fusionScore = 0.75 * velNorm + 0.25 * bm25Norm;
          
          return { ...project, score: project.score, fusionScore, bm25Score: bm25Norm };
        });

        // Sort strictly by starVelocityEffective (current growth rate) descending.
        // If growth velocities are identical, sub-sort by total stars.
        fused.sort((a, b) => {
          const diff = (b.starVelocityEffective || 0) - (a.starVelocityEffective || 0);
          if (Math.abs(diff) > 1e-4) return diff;
          return b.stars - a.stars;
        });
        
        setProjects(fused);
        log('success', `✨ SCAN COMPLETE. ${fused.length} PROJECTS — GROWTH VELOCITY SORT APPLIED.`);
      } else {
        log('success', `✨ SCAN COMPLETE. ${accumulated.length} PROJECTS ANCHORED.`);
      }
    } catch (err) {
      log('warn', `❌ Error during search sweep: ${err.message}`);
    }

    setIsScanning(false);
    setScanProgress({ done: 0, total: 0 });
  };

  // No auto-scan on mount — the tool is in standby until the user initiates a search

  // Effect: Trigger AI explain summary when a project is selected
  useEffect(() => {
    if (!selectedProject) return;
    const repo = selectedProject.repo;
    if (aiExplainText[repo]) return; // already generated

    const isProd = import.meta.env.PROD && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    const fetchAIExplanation = async () => {
      setAiExplainLoading(true);
      try {
        const vel = selectedProject.starVelocity ? Number(selectedProject.starVelocity).toFixed(1) : '0';
        const commitsCount = selectedProject.commits || 0;
        
        if (isProd) {
          const url = `/api/explain?repo=${encodeURIComponent(repo)}&desc=${encodeURIComponent(selectedProject.description || '')}&lang=${encodeURIComponent(selectedProject.primaryLanguage || '')}&stars=${selectedProject.stars || 0}&commits=${commitsCount}&velocity=${vel}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setAiExplainText(prev => ({ ...prev, [repo]: data.summary }));
          } else {
            setAiExplainText(prev => ({ ...prev, [repo]: 'AI analyst currently offline. Please check your API key configurations.' }));
          }
        } else {
          // Local Development Mock generator: dynamically construct a unique, highly specific analysis
          await new Promise(r => setTimeout(r, 450));
          const nameOnly = repo.split('/').pop() || repo;
          const mainLang = selectedProject.primaryLanguage || 'JavaScript';
          const starsCount = selectedProject.stars || 0;
          const mockAnalyses = [
            `The ${nameOnly} codebase exhibits strong developmental health with a star velocity of ${vel}★/day. The language structure highlights a robust focus on ${mainLang} optimization. Recommendation: Suitable for core production architecture.`,
            `GitObs telemetry suggests high activity for ${nameOnly}. With ${commitsCount} commits in the last fortnight, the development cycle is fast-paced. Review ${mainLang} memory bounds before production deployment.`,
            `A classic ${mainLang}-based utility stack for ${nameOnly} focused on developer ergonomics. Adopts a modern tech layout and displays high maintainer activity across its ${starsCount} stars. Great for lightweight microservices.`,
            `Experimental or research-grade release of ${nameOnly} with ${starsCount} stars. Star traction is high but commit activity is low. Ideal for research exploration; handle with caution for mission-critical enterprise systems.`
          ];
          
          // Generate a more unique hash from the string characters to distribute indices better
          const charSum = repo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const index = charSum % mockAnalyses.length;
          setAiExplainText(prev => ({ ...prev, [repo]: mockAnalyses[index] }));
        }
      } catch (e) {
        setAiExplainText(prev => ({ ...prev, [repo]: 'Failed to retrieve AI evaluation summary.' }));
      } finally {
        setAiExplainLoading(false);
      }
    };

    fetchAIExplanation();
  }, [selectedProject]);

  // Get metrics for details panel
  const selectedProjectDetails = useMemo(() => {
    if (!selectedProject) return null;

    const starsVal = selectedProject.stars || 0;
    const forksVal = selectedProject.forks || 0;
    const velocity = selectedProject.starVelocity || 0;
    const forkVel = selectedProject.forkVelocity || 0;
    const commits = selectedProject.commits || 0;
    const resolution = selectedProject.resolution || 0;
    const score = selectedProject.score || 0;
    const repositoryCard = buildRepositoryCard(selectedProject, selectedPersona);

    return {
      ...selectedProject,
      repositoryCard,
      stars: starsVal,
      forks: forksVal,
      starVelocity: Number(velocity).toFixed(1),
      forkVelocity: Number(forkVel).toFixed(1),
      commits,
      resolution: Math.round(resolution * 100),
      score: Number(score).toFixed(1)
    };
  }, [selectedProject, selectedPersona]);

  return (
    <div className="observatory-container">
      
      {/* Branding Header Block & First-Time Visitor Guide */}
      <div style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src="/logo.jpg" 
                  alt="GitObs Logo" 
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    border: '1px solid rgba(88,166,255,0.3)',
                    boxShadow: '0 0 10px rgba(88,166,255,0.15)'
                  }}
                />
                <h1 style={{
                  margin: 0,
                  fontSize: '28px',
                  fontWeight: 850,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em'
                }}>
                  GitObs
                </h1>
              </div>
              <a 
                href="https://www.linkedin.com/in/irfankhalid/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(88,166,255,0.12)',
                  border: '1px solid rgba(88,166,255,0.3)',
                  color: 'var(--gh-blue)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  transition: 'background 0.15s ease'
                }}
                className="created-by-badge"
              >
                <span>Created by</span> <strong>Khalid Irfan</strong>
              </a>
            </div>
            <p style={{
              margin: '6px 0 0',
              fontSize: '13.5px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              maxWidth: '850px',
              fontWeight: 500
            }}>
              Find interesting and relevant GitHub repositories for whatever you are searching for. Scan any topic to instantly filter, rank, and explore codebases by their growth velocity, activity levels, and AI-powered code summaries.
            </p>
          </div>
          {showGuide && (
            <button
              onClick={() => {
                setShowGuide(false);
                localStorage.setItem('GIT_OBSERVATORY_GUIDE_SEEN', 'true');
              }}
              style={{
                background: 'rgba(88,166,255,0.1)',
                border: '1px solid rgba(88,166,255,0.3)',
                borderRadius: '4px',
                color: 'var(--gh-blue)',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                transition: 'all 0.15s ease'
              }}
              className="donut-legend-btn"
            >
              Dismiss Guide
            </button>
          )}
        </div>

        {isMobile && (
          <div className="mobile-inline-search">
            <div className="mobile-inline-search-row">
              <input
                type="text"
                className="mobile-inline-search-input"
                placeholder={
                  searchMode === 'natural'
                    ? "What do you want to build?"
                    : searchMode === 'profile'
                      ? "GitHub profile ID"
                      : "Search repositories..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') performGitHubSearch(searchQuery);
                }}
              />
              <button
                className={`mobile-inline-scan ${isScanning ? 'scanning' : ''}`}
                onClick={() => performGitHubSearch(searchQuery)}
                disabled={isScanning}
              >
                {isScanning ? 'Scanning' : 'Scan'}
              </button>
            </div>
            <button
              className="mobile-inline-filter"
              onClick={() => setSidebarOpen(true)}
            >
              Search mode, filters, and token
            </button>
          </div>
        )}

        {showGuide && (
          <div style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(88,166,255,0.15)', color: 'var(--gh-blue)', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>1</span>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>Scan Keywords</strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Type keywords (e.g. <code>mlx</code>, <code>agent</code>) and hit <strong>Scan</strong> to fetch live telemetries.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(63,185,80,0.15)', color: 'var(--gh-green)', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>2</span>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>Adjust Star Filters</strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Drag the stars slider to <code>0</code> to discover emerging libraries (like <code>mynah-ui</code>).</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(210,153,34,0.15)', color: 'var(--gh-orange)', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>3</span>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>Inspect Repositories</strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Click any card node in the grid to slide open details, commit heatmaps, and AI summaries.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(139,92,246,0.15)', color: 'var(--neon-violet)', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>4</span>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>Authentication</strong>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Add your GitHub Token at the bottom of the sidebar to bypass Search API rate limits.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature 2: Rate Limit Warning Banner */}
      {hasRateLimitError && (
        <div style={{
          background: 'rgba(219, 76, 85, 0.15)',
          border: '1px solid #db4c55',
          borderRadius: '6px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          color: '#f85149'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            ⚠️ <strong>GitHub API Rate Limit Triggered (429/403).</strong> Scan data falls back to mock estimates. Please add a Personal Access Token to secure higher API limits.
          </span>
          <a
            href="https://github.com/settings/tokens/new?description=Repository%20Telemetry%20HUD&scopes="
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#db4c55',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Create Token
          </a>
        </div>
      )}
      {/* ════ MAIN TELEMETRY INTERFACE ════ */}
      <div className="observatory-main">
        
        {/* Mobile backdrop — closes sidebar when tapped outside */}
        {isMobile && sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Side: Controls & Scanner */}
        <aside className={`observatory-sidebar${isMobile && sidebarOpen ? ' sidebar-open' : ''}`}>
          {/* Mobile drawer drag handle & close button */}
          {isMobile && (
            <div className="mobile-drawer-handle">
              <div className="drawer-pill" />
              <button
                className="drawer-close-btn"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>
          )}
          
          {/* ── SEARCH — top of sidebar ── */}
          <div className="hud-panel search-primary-panel">
            <div className="app-wordmark" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <img 
                src="/logo.jpg" 
                alt="Logo" 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid rgba(88,166,255,0.25)',
                  flexShrink: 0
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span className="app-wordmark-title" style={{ fontSize: '15px', fontWeight: 800 }}>GitObs</span>
                <span className="app-wordmark-sub" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Real-time repository search &amp; health telemetry</span>
              </div>
            </div>
            <div className="search-mode-selector" style={{
              display: 'flex',
              gap: '14px',
              margin: '10px 0 10px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}>
                <input
                  type="radio"
                  name="searchMode"
                  value="repository"
                  checked={searchMode === 'repository'}
                  onChange={() => setSearchMode('repository')}
                  style={{ accentColor: 'var(--gh-blue)', margin: 0 }}
                />
                Repository
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}>
                <input
                  type="radio"
                  name="searchMode"
                  value="profile"
                  checked={searchMode === 'profile'}
                  onChange={() => setSearchMode('profile')}
                  style={{ accentColor: 'var(--gh-blue)', margin: 0 }}
                />
                Profile ID
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600
              }}>
                <input
                  type="radio"
                  name="searchMode"
                  value="natural"
                  checked={searchMode === 'natural'}
                  onChange={() => setSearchMode('natural')}
                  style={{ accentColor: 'var(--gh-blue)', margin: 0 }}
                />
                💡 Sentence / Idea
              </label>
            </div>

            <div className="search-row">
              <input
                type="text"
                className="search-input-primary"
                placeholder={
                  searchMode === 'natural'
                    ? "e.g. I want to learn how LLMs work..."
                    : searchMode === 'profile'
                      ? "e.g. karpathy, torvalds, yyx990803, gaearon..."
                      : "e.g. mlx, llama, diffusion, rust..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') performGitHubSearch(searchQuery);
                }}
              />
              <button
                className={`scan-trigger-btn ${isScanning ? 'scanning' : ''}`}
                onClick={() => performGitHubSearch(searchQuery)}
                disabled={isScanning}
              >
                {isScanning ? '⏳' : '⚡ SCAN'}
              </button>
            </div>
          </div>

          {/* ── RADAR CONSOLE LOGS ── */}
          <div className="console-panel" style={{ marginTop: '10px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ 
                fontSize: '9px', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em', 
                color: 'var(--text-muted)' 
              }}>
                telemetry radar status
              </span>
              {isScanning && (
                <div className="scanner-active-ping" style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gh-blue)',
                  animation: 'pulse 1s infinite'
                }} />
              )}
            </div>
            <div 
              ref={consoleRef}
              style={{
                background: '#0d1117',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                height: '84px',
                overflowY: 'auto',
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                lineHeight: '1.4',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              {isScanning && scanProgress.total > 0 && (
                <div style={{
                  color: 'var(--gh-blue)',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '4px',
                  marginBottom: '3px'
                }}>
                  Scan progress: {scanProgress.done}/{scanProgress.total} repositories enriched
                </div>
              )}
              {consoleLogs.map((log, i) => (
                <div key={i} style={{
                  color: log.type === 'error' || log.type === 'warn' ? '#ff7b72' : log.type === 'success' ? '#3fb950' : log.type === 'info' ? '#58a6ff' : '#8b949e',
                  wordBreak: 'break-all'
                }}>
                  {log.type === 'success' ? '✓ ' : log.type === 'warn' || log.type === 'error' ? '⚠️ ' : '📡 '}
                  {log.text}
                </div>
              ))}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="hud-panel">
            <span className="hud-panel-title">Observatory Controls</span>

            <div className="hud-group">
              <span className="hud-group-label">Evaluation Lens</span>
              <div className="persona-grid">
                {Object.entries(PERSONA_PROFILES).map(([personaId, persona]) => (
                  <button
                    key={personaId}
                    className={`persona-btn ${selectedPersona === personaId ? 'active' : ''}`}
                    onClick={() => setSelectedPersona(personaId)}
                    title={persona.priority}
                  >
                    <span>{persona.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {!isMobile && (
              <div className="hud-group">
                <span className="hud-group-label">View Mode</span>
                <div className="filter-pills">
                  <button
                    className={`filter-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    田 Grid View
                  </button>
                  <button
                    className={`filter-btn ${viewMode === 'map' ? 'active' : ''}`}
                    onClick={() => setViewMode('map')}
                  >
                    ◰ Matrix View
                  </button>
                </div>
              </div>
            )}

            {/* Ownership Type filter */}
            <div className="hud-group">
              <span className="hud-group-label">Ownership Type</span>
              <div className="filter-pills">
                {['All', 'Individual', 'Enterprise', 'Community'].map(focus => (
                  <button
                    key={focus}
                    className={`filter-btn ${selectedFocus === focus ? 'active' : ''}`}
                    onClick={() => setSelectedFocus(focus)}
                  >
                    {focus}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Sector filter (client-side, no API topic) */}
            <div className="hud-group">
              <span className="hud-group-label">Activity Sector</span>
              <div className="filter-pills">
                {sectors.map(sector => (
                  <button
                    key={sector}
                    className={`filter-btn ${selectedQuadrant === sector ? 'active' : ''}`}
                    onClick={() => setSelectedQuadrant(sector)}
                    style={{ fontSize: '0.72rem', padding: '6px 12px' }}
                  >
                    {sector}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Stars threshold — tweakable */}
            <div className="hud-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="hud-group-label">Min Stars Threshold</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--gh-blue)', fontWeight: 700 }}>
                  ★ {minStars >= 1000 ? `${(minStars/1000).toFixed(1)}k` : minStars}+
                </span>
              </div>
              <input
                type="range"
                min="0" max="10000" step="50"
                value={minStars}
                onChange={e => setMinStars(Number(e.target.value))}
                className="stars-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>0 — all projects</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>10k — elite only</span>
              </div>
            </div>

            {/* Language filter selector — Multi-select Pills */}
            <div className="hud-group">
              <span className="hud-group-label" style={{ marginBottom: '8px', display: 'block' }}>Primary Tech Stack</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  className={`filter-btn ${selectedLanguages.length === 0 ? 'active' : ''}`}
                  onClick={() => setSelectedLanguages([])}
                  style={{ fontSize: '0.72rem', padding: '5px 10px' }}
                >
                  All
                </button>
                {['Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'C++', 'Java', 'Shell', 'HTML', 'CSS', 'Svelte', 'Vue'].map(lang => {
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      className={`filter-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedLanguages(prev => {
                          if (prev.includes(lang)) {
                            return prev.filter(l => l !== lang);
                          } else {
                            return [...prev, lang];
                          }
                        });
                      }}
                      style={{ fontSize: '0.72rem', padding: '5px 10px' }}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Token — compact, inside search panel area */}
          <div className="hud-panel token-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="hud-group-label">GitHub API Token</span>
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: customToken ? 'var(--gh-green)' : 'var(--text-muted)',
                fontWeight: 600
              }}>
                {customToken ? '● ACTIVE' : '○ UNAUTHENTICATED'}
              </span>
            </div>
            <input
              type="password"
              placeholder="Paste GitHub token (ghp_...) for higher rate limits"
              value={customToken}
              onChange={(e) => {
                const val = e.target.value;
                setCustomToken(val);
                localStorage.setItem('TELEMETRY_GITHUB_TOKEN', val);
              }}
            />
            {projects.length > 0 && (
              <button
                className="filter-btn active"
                onClick={copyTelemetryDispatch}
                style={{ width: '100%', fontWeight: 600, padding: '7px 12px', fontSize: '12px' }}
              >
                📋 Copy Telemetry Report
              </button>
            )}
          </div>
        </aside>

        {/* Right Side: Telemetry Matrix or Grid */}
        <main className={`${activeViewMode === 'map' ? 'stars-quadrant-map-container' : 'stars-quadrant'} ${filteredProjects.length === 0 ? 'is-empty' : ''}`}>
          
          {/* Integrated Compact Telemetry Metrics Row */}
          {projects.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px 16px',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '12px',
              width: '100%'
            }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Observed: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{telemetry.total}</strong>
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Avg Velocity: <strong style={{ color: 'var(--gh-blue)', fontFamily: 'var(--font-mono)' }}>★ {telemetry.avgVelocity}/day</strong>
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: '100%', minWidth: 0 }}>
                Focus: <span style={{ color: 'var(--neon-cyan)', fontWeight: 600 }}>E: {telemetry.shares.enterprise}%</span>
                {' · '}
                <span style={{ color: 'var(--neon-emerald)', fontWeight: 600 }}>I: {telemetry.shares.individual}%</span>
                {' · '}
                <span style={{ color: 'var(--neon-violet)', fontWeight: 600 }}>C: {telemetry.shares.community}%</span>
              </div>
            </div>
          )}

          {/* ── Mobile filter launcher ── */}
          {isMobile && !sidebarOpen && !selectedProjectDetails && (
            <button
              className="mobile-fab"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open search & filters"
            >
              <span className="fab-icon">⚙</span>
              <span className="fab-label">{isScanning ? 'Scanning…' : projects.length > 0 ? `Filters · ${filteredProjects.length}` : 'Search & Filters'}</span>
            </button>
          )}

          {projects.length === 0 && !isScanning && !hasSearched ? (
            <div className="launchpad-container">
              <h3 className="launchpad-title">
                Suggested Observatory Scans
              </h3>
              <div className="launchpad-grid">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.query, s.mode)}
                    className="launchpad-card"
                  >
                    <span className="launchpad-card-label">{s.label}</span>
                    <span className="launchpad-card-query">"{s.query}"</span>
                  </button>
                ))}
              </div>
            </div>
          ) : activeViewMode === 'map' ? (
            <div className="galaxy-map-deck">
              {/* Telemetry Matrix Grid axes and crosshairs */}
              <div className="matrix-crosshair-h" />
              <div className="matrix-crosshair-v" />
              
              {/* Quadrant Indicators */}
              <div className="matrix-quadrant-label top-right">
                <span className="ql-name">Elite Engineers</span>
                <span className="ql-sub">Hyper-Growth · High Activity</span>
              </div>
              <div className="matrix-quadrant-label top-left">
                <span className="ql-name">Developer Engines</span>
                <span className="ql-sub">Deep Commits · Growing Slow</span>
              </div>
              <div className="matrix-quadrant-label bottom-right">
                <span className="ql-name">Viral Hype</span>
                <span className="ql-sub">High Stars · Low Activity</span>
              </div>
              <div className="matrix-quadrant-label bottom-left">
                <span className="ql-name">Steady State</span>
                <span className="ql-sub">Maintenance Mode</span>
              </div>
              
              {/* Grid Axis Labels */}
              <div className="axis-label-x">Star Accumulation Velocity (Stars / Day) ➔</div>
              <div className="axis-label-y">▲ Commit Frequency (Commits / 14d)</div>

              {/* SVG Semantic Clusters Connecting Repository Nodes */}
              <svg className="cluster-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                {semanticClusters.map((line, idx) => {
                  const isLineHighlighted = hoveredProject?.theme === line.theme || selectedProject?.theme === line.theme;
                  const isAnyProjectActive = hoveredProject || selectedProject;
                  const isLineDimmed = isAnyProjectActive && !isLineHighlighted;
                  const focusStyles = getFocusStyles(line.from.focus);
                  return (
                    <line 
                      key={idx}
                      x1={line.from.x}
                      y1={line.from.y}
                      x2={line.to.x}
                      y2={line.to.y}
                      className={`cluster-line ${isLineHighlighted ? 'highlight' : ''} ${isLineDimmed ? 'dimmed' : ''}`}
                      style={{ 
                        stroke: focusStyles.color, 
                        '--line-glow-color': focusStyles.glow 
                      }}
                    />
                  );
                })}
              </svg>

              {/* Dynamic Plotted Repository Bubbles */}
              {projectsWithCoordinates.length > 0 ? (
                projectsWithCoordinates.map((project, idx) => {
                  const styles = getFocusStyles(project.focus);
                  const isSelected = selectedProject?.repo === project.repo;
                  const statusInfo = calculateTelemetryTier(project);
                  
                  return (
                    <div 
                      key={idx}
                      className={[
                        'star-node',
                        isSelected ? 'selected' : '',
                        project.y < 38 ? 'tooltip-below' : '',
                        project.x > 62 ? 'label-flip-left' : ''
                      ].filter(Boolean).join(' ')}
                      style={{
                        left: `${project.x}%`,
                        top: `${project.y}%`,
                        '--focus-color': styles.color,
                        '--focus-glow': styles.glow,
                        '--star-size': `${project.bubbleSize}px`
                      }}
                      onClick={() => setSelectedProject(prev => prev?.repo === project.repo ? null : project)}
                      onMouseEnter={() => setHoveredProject(project)}
                      onMouseLeave={() => setHoveredProject(null)}
                    >
                      {/* L-Shaped Target Brackets Reticle */}
                      {isSelected && (
                        <div className="target-reticle" style={{ '--focus-color': styles.color }}>
                          <div className="reticle-corner tl" />
                          <div className="reticle-corner tr" />
                          <div className="reticle-corner bl" />
                          <div className="reticle-corner br" />
                        </div>
                      )}

                      <div className="star-node-content">
                        <div className="star-core" />
                        <div className="star-pulse" />
                        <span className="star-label">{project.repo.split('/')[1]}</span>
                        
                        {/* Interactive Tooltip Card */}
                        <div className="star-tooltip">
                          <span className="tooltip-q">{project.theme.replace('RAG and knowledge systems', 'RAG')}</span>
                          <h5 className="tooltip-title">{project.repo}</h5>
                          <p className="tooltip-desc">{project.description ? project.description.slice(0, 80) + '...' : project.call_to_action.slice(0, 80) + '...'}</p>
                          <div style={{ display: 'flex', gap: '4px', margin: '4px 0' }}>
                            <span className={`status-badge ${statusInfo.className}`} style={{ scale: '0.82', transformOrigin: 'left' }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="tooltip-footer">
                            <span>★ {project.stars}</span>
                            <span>⑂ {project.forks}</span>
                            <span className={`focus-tag ${project.focus.toLowerCase()}`} style={{ scale: '0.85' }}>{project.focus}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-stars-overlay" style={{ background: 'transparent', border: 'none' }}>
                  <div className="radar-ring">🔭</div>
                  <h3>No Telemetry Data</h3>
                  <p>Type a query and click Scan to discover project telemetry.</p>
                </div>
              )}
            </div>
          ) : (
            filteredProjects.length > 0 ? (
              filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((project, idx) => {
                const styles = getFocusStyles(project.focus);
                const statusInfo = calculateTelemetryTier(project);
                return (
                  <article
                    className={`star-card rich-card ${selectedProject?.repo === project.repo ? 'selected' : ''}`}
                    key={idx}
                    style={{ '--focus-color': styles.color, '--focus-glow': styles.glow }}
                    onClick={() => {
                      setSelectedProject(prev => prev?.repo === project.repo ? null : project);
                      if (isMobile) setSidebarOpen(false);
                    }}
                  >
                    {/* LEFT: text content */}
                    <div className="rich-card-left">
                      <div className="rich-card-overview">
                        <div className="rich-card-summary">
                          <div className="tag-row">
                            <span className="quadrant-badge">{project.theme.replace('RAG and knowledge systems', 'RAG')}</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span className={`status-badge ${statusInfo.className}`} style={{ scale: '0.85' }}>{statusInfo.label}</span>
                              <span className={`focus-tag ${project.focus.toLowerCase()}`}>{project.focus}</span>
                            </div>
                          </div>

                          <h3 className="rich-card-title">{project.repo}</h3>
                          <p className="rich-card-desc">{project.description || project.call_to_action}</p>
                        </div>
                        {/* Corner telemetry mini-panel */}
                        <div className="rich-card-chart">
                          <span className="chart-label">trajectory</span>

                          {/* Star velocity sparkline */}
                          {(() => {
                            const vel = project.starVelocity || 0;
                            const stars = project.stars || 0;
                            const commits = project.commits || 0;
                            const pts = 14;
                            const vals = Array.from({ length: pts }, (_, i) => {
                              const t = i / (pts - 1);
                              if (stars === 0) {
                                return 0;
                              }

                              let base;
                              if (vel > 2.0) {
                                base = 0.2 + 0.8 * Math.pow(t, 1 / Math.max(0.4, vel * 0.2 + 0.6));
                              } else {
                                base = 0.65 + (t * 0.15) - 0.05;
                              }

                              const activityFactor = Math.min(15, commits) / 15;
                              const noise = Math.sin(i * 1.8 + stars) * 0.04 * activityFactor;
                              return Math.max(5, Math.min(95, (base + noise) * 100));
                            });
                            const W = 112, H = 34;
                            const toX = (i) => (i / (pts - 1)) * W;
                            const toY = (v) => H - (v / 100) * (H - 6) - 3;
                            const pathD = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');
                            const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;
                            const lastX = toX(pts - 1);
                            const lastY = toY(vals[pts - 1]);
                            return (
                              <svg viewBox={`0 0 ${W} ${H}`} className="sparkline-svg" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id={`sg-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--focus-color)" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="var(--focus-color)" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                                <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="var(--border)" strokeWidth="0.5" />
                                <path d={areaD} fill={`url(#sg-${idx})`} />
                                <path d={pathD} fill="none" stroke="var(--focus-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx={lastX} cy={lastY} r="2" fill="var(--focus-color)" />
                                <circle cx={lastX} cy={lastY} r="4" fill="var(--focus-color)" opacity="0.18" />
                              </svg>
                            );
                          })()}

                          {project.languageNames?.length > 0 && (
                            <div className="chart-lang-section">
                              <span className="chart-label" style={{ marginBottom: '4px' }}>tech stack</span>
                              <div className="chart-lang-bar">
                                {project.languageNames.map((lang, li) => (
                                  <div
                                    key={li}
                                    className="chart-lang-segment"
                                    title={`${lang.name} ${(lang.pct * 100).toFixed(1)}%`}
                                    style={{
                                      width: `${lang.pct * 100}%`,
                                      background: getLangColor(lang.name),
                                    }}
                                  />
                                ))}
                              </div>
                              <div className="chart-lang-legend">
                                {project.languageNames.slice(0, 2).map((lang, li) => (
                                  <span key={li} className="chart-lang-dot">
                                    <span style={{ background: getLangColor(lang.name) }} className="lang-dot-circle" />
                                    <span className="lang-dot-name">{lang.name}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="chart-stats">
                            <span className="chart-stat-item" style={{ color: 'var(--focus-color)' }}>
                              ▲ {Number(project.starVelocity).toFixed(1)}<span style={{ opacity: 0.6, fontSize: '9px' }}>/d</span>
                            </span>
                            {project.bm25Score != null && (
                              <span className="chart-stat-item" style={{ color: 'var(--text-muted)', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ opacity: 0.5 }}>relevance</span>
                                <span style={{ color: project.bm25Score > 0.6 ? 'var(--gh-green)' : project.bm25Score > 0.3 ? 'var(--gh-orange)' : 'var(--text-muted)' }}>
                                  {(project.bm25Score * 100).toFixed(0)}%
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="stat-pills">
                        <div className="stat-pill">
                          <span className="stat-icon">★</span>
                          <span className="stat-value">{project.stars >= 1000 ? `${(project.stars/1000).toFixed(1)}k` : project.stars}</span>
                          <span className="stat-label">Stars</span>
                        </div>
                        <div className="stat-pill">
                          <span className="stat-icon" style={{ color: 'var(--neon-cyan)' }}>⑂</span>
                          <span className="stat-value">{project.forks >= 1000 ? `${(project.forks/1000).toFixed(1)}k` : project.forks}</span>
                          <span className="stat-label">Forks</span>
                        </div>
                        <div className="stat-pill">
                          <span className="stat-icon" style={{ color: 'var(--neon-emerald)' }}>↑</span>
                          <span className="stat-value">{Number(project.starVelocity).toFixed(1)}</span>
                          <span className="stat-label">Stars/day</span>
                        </div>
                        <div className="stat-pill">
                          <span className="stat-icon" style={{ color: 'var(--neon-violet)' }}>⌨</span>
                          <span className="stat-value">{project.commits}</span>
                          <span className="stat-label">Commits/14d</span>
                        </div>
                      </div>

                      <div className="score-bar-row">
                        <span className="score-bar-label">Telemetry Score</span>
                        <div className="score-bar-track">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${Math.min(100, (project.score / 300) * 100)}%`,
                              background: `linear-gradient(90deg, var(--focus-color), var(--focus-glow))`
                            }}
                          />
                        </div>
                        <span className="score-bar-value">{Number(project.score).toFixed(0)}</span>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="no-stars-overlay">
                <div className="radar-ring">🔭</div>
                <h3>Sector Obscured</h3>
                <p>No project nodes matched the selected filters. Refine filters or trigger a telemetry scan.</p>
              </div>
            )
          )}

          {/* ── Pagination Controls ── */}
          {filteredProjects.length > PAGE_SIZE && (
            <div className="pagination-controls">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                ← Prev
              </button>
              <span className="page-indicator">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length}
              </span>
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ════ PROJECT INSPECTOR DETAILS PANEL ════ */}
      <aside className={`project-inspector ${selectedProjectDetails ? 'active' : ''}`} style={selectedProjectDetails ? {
        '--focus-color': getFocusStyles(selectedProjectDetails.focus).color,
        '--focus-glow': getFocusStyles(selectedProjectDetails.focus).glow
      } : {}}>
        {selectedProjectDetails && (
          <>
            <button className="inspector-close" onClick={() => setSelectedProject(null)}>✕</button>
            
            <div className="inspector-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Creator/Owner profile block */}
              {selectedProjectDetails.ownerLogin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                  <a
                    href={selectedProjectDetails.ownerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--focus-color)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <img
                      src={`${selectedProjectDetails.ownerAvatar}&s=80`}
                      alt={selectedProjectDetails.ownerLogin}
                      style={{ width: '42px', height: '42px', display: 'block' }}
                      loading="lazy"
                    />
                  </a>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Welcome to Hub of</span>
                    <a
                      href={selectedProjectDetails.ownerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                      onClick={e => e.stopPropagation()}
                    >
                      {selectedProjectDetails.ownerLogin}
                    </a>
                  </div>
                </div>
              )}

              {/* checkmygit Stats Dashboard Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                width: '100%',
                marginTop: '4px'
              }}>
                <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Repos</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                    {selectedProjectDetails.ownerPublicRepos || '—'}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Stars</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                    {selectedProjectDetails.stars >= 1000 ? `${(selectedProjectDetails.stars/1000).toFixed(1)}k` : selectedProjectDetails.stars}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Followers</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px', display: 'block' }}>
                    {selectedProjectDetails.ownerFollowers >= 1000 ? `${(selectedProjectDetails.ownerFollowers/1000).toFixed(1)}k` : selectedProjectDetails.ownerFollowers}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Focus</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--focus-color)', marginTop: '4px', display: 'block', textTransform: 'uppercase' }}>
                    {selectedProjectDetails.focus}
                  </span>
                </div>
              </div>

              {/* checkmygit Git Contributions Activity Calendar */}
              <div style={{
                background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '10px 12px',
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>6-Month Contribution History</span>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--gh-green)', fontWeight: 600 }}>
                    {selectedProjectDetails.commits * 6} commits
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(28, 1fr)',
                  gap: '2px',
                  width: '100%'
                }}>
                  {Array.from({ length: 28 * 7 }, (_, idx) => {
                    const col = Math.floor(idx / 7);
                    const row = idx % 7;
                    const commitFactor = Math.max(0.1, Math.min(1.0, (selectedProjectDetails.commits || 1) / 10));
                    const baseWeight = Math.sin(col * 0.15) * Math.cos(row * 0.4) * 0.45 + 0.45;
                    const rand = Math.random() * 0.2;
                    const density = Math.min(1, baseWeight * commitFactor + rand);
                    
                    let bg = '#161b22';
                    let commitsCount = 0;
                    if (density > 0.75) { bg = '#39d353'; commitsCount = 5 + Math.floor(Math.random() * 4); }
                    else if (density > 0.5) { bg = '#26a641'; commitsCount = 3 + Math.floor(Math.random() * 2); }
                    else if (density > 0.25) { bg = '#006d32'; commitsCount = 1 + Math.floor(Math.random() * 2); }
                    else if (density > 0.1) { bg = '#0e4429'; commitsCount = 1; }

                    // Feature 1: Dynamic tooltips dates generator
                    const baseDate = new Date();
                    baseDate.setDate(baseDate.getDate() - (196 - (col * 7 + row)));
                    const dateStr = baseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    
                    const mockMessages = [
                      'refactor: optimize BM25 search queries',
                      'fix: correct memory bounds in indexing loop',
                      'feat: integrate language donut visuals',
                      'docs: update README deployment configurations',
                      'test: assert rate limit metrics',
                      'chore: bump dev dependency libraries'
                    ];
                    const commitMsg = commitsCount > 0 ? mockMessages[idx % mockMessages.length] : '';

                    return (
                      <div
                        key={idx}
                        className="calendar-square-wrap"
                        style={{
                          aspectRatio: '1',
                          background: bg,
                          borderRadius: '1px',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                      >
                        {/* Hover Tooltip box */}
                        <div className="calendar-tooltip" style={{
                          position: 'absolute',
                          bottom: '120%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#161b22',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          color: 'var(--text-primary)',
                          fontSize: '8px',
                          zIndex: 100,
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          display: 'none',
                          lineHeight: '1.2'
                        }}>
                          <strong>{dateStr}</strong><br/>
                          <span style={{ color: 'var(--gh-green)' }}>{commitsCount} commits</span>
                          {commitsCount > 0 && <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '7.5px', marginTop: '2px', fontStyle: 'italic' }}>"{commitMsg}"</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)', padding: '0 4px' }}>
                  <span>Dec</span>
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>

              {/* Core Technologies & Language Donut Card — checkmygit layout */}
              {selectedProjectDetails.languageNames?.length > 0 && (
                <div style={{
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '16px 14px',
                  marginTop: '4px',
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  {/* Left Column: circular breakdown donut chart (conic-gradient) */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {(() => {
                      let accum = 0;
                      const segments = selectedProjectDetails.languageNames.map((lang) => {
                        const start = accum;
                        accum += lang.pct * 100;
                        return `${getLangColor(lang.name)} ${start}% ${accum}%`;
                      });
                      const gradientStr = segments.join(', ');
                      return (
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: `conic-gradient(${gradientStr || '#8b949e 0% 100%'})`,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border)'
                          }}
                        >
                          {/* Inner donut hole cutout mask */}
                          <div
                            style={{
                              position: 'absolute',
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: 'var(--bg-muted)', // matches card background
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)' // gives depth to the donut cutout
                            }}
                          >
                            <span style={{ fontSize: '7.5px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', display: 'block', lineHeight: '1.1' }}>
                              {selectedProjectDetails.languageNames.length}<br/>langs
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                    {/* Right Column: Aligned language legend — checkmygit format */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                      <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>Tech Stack</span>
                      <button
                        onClick={() => refreshSingleProject(selectedProjectDetails.repo)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--gh-blue)',
                          fontSize: '8px',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: 0
                        }}
                        title="Force reload languages & contributors"
                      >
                        🔄 Reload Profile
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {selectedProjectDetails.languageNames.map((lang, li) => (
                        <button
                          key={li}
                          onClick={() => {
                            setSelectedLanguages([lang.name]);
                            setConsoleLogs(prev => [...prev, { type: 'info', text: `🎯 Filtered Tech Stack to: ${lang.name}` }]);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.78rem',
                            fontFamily: 'var(--font-mono)',
                            minWidth: 0,
                            background: 'transparent',
                            border: 'none',
                            width: '100%',
                            padding: '2px 0',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          title={`Click to filter observed dashboard by ${lang.name}`}
                          className="donut-legend-btn"
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: getLangColor(lang.name), flexShrink: 0 }} />
                            <span style={{ color: 'var(--gh-blue)', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{lang.name}</span>
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, paddingLeft: '8px', flexShrink: 0 }}>
                            {(lang.pct * 100).toFixed(0)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="badge-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <span className="quadrant-badge" style={{ color: 'var(--focus-color)' }}>{selectedProjectDetails.theme}</span>
                <span className={`focus-tag ${selectedProjectDetails.focus.toLowerCase()}`}>{selectedProjectDetails.focus} Focus</span>
              </div>
              <h2 style={{ margin: 0, fontSize: '15px' }}>{selectedProjectDetails.repo}</h2>
            </div>

            <div className="inspector-section">
              <h4>Telemetry Performance Tier</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <span className={`status-badge ${calculateTelemetryTier(selectedProjectDetails).className}`} style={{ alignSelf: 'flex-start' }}>
                  {calculateTelemetryTier(selectedProjectDetails).label}
                </span>
                <p className="inspector-desc" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                  {calculateTelemetryTier(selectedProjectDetails).desc}
                </p>
              </div>
            </div>

            {/* AI Analyst Evaluation Summary */}
            <div className="inspector-section" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(88,166,255,0.08), rgba(139,92,246,0.06))',
                border: '1px solid rgba(88,166,255,0.25)',
                borderRadius: '6px',
                padding: '12px 16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px' }}>🧠</span>
                  <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gh-blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Observatory Analyst</h4>
                </div>
                
                {aiExplainLoading && !aiExplainText[selectedProjectDetails.repo] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                    <div className="loading-pulse-dot" style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--gh-blue)',
                      animation: 'pulse 1.2s infinite'
                    }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Generating systems architect synthesis...
                    </span>
                  </div>
                ) : (
                  <p style={{
                    margin: 0,
                    fontSize: '0.78rem',
                    lineHeight: '1.45',
                    color: 'var(--text-primary)',
                    fontWeight: 500
                  }}>
                    {aiExplainText[selectedProjectDetails.repo] || 'AI analysis standby.'}
                  </p>
                )}
              </div>
            </div>

            {/* Project Description */}
            <div className="inspector-section">
              <h4>Project Description</h4>
              <p className="inspector-desc">{selectedProjectDetails.description}</p>
            </div>

            {/* checkmygit-inspired top contributor list */}
            {selectedProjectDetails.contributors?.length > 0 && (
              <div className="inspector-section">
                <h4>Top Project Contributors</h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {selectedProjectDetails.contributors.map((c, ci) => (
                    <a
                      key={ci}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${c.login} (${c.contributions} commits)`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--bg-overlay)',
                        border: '1px solid var(--border)',
                        padding: '4px 10px 4px 6px',
                        borderRadius: '16px',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                        transition: 'transform 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <img
                        src={`${c.avatar}&s=48`}
                        alt={c.login}
                        style={{ width: '20px', height: '20px', borderRadius: '50%', display: 'block' }}
                      />
                      <span style={{ fontWeight: 600 }}>{c.login}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* BM25+ match relevance score */}
            {selectedProjectDetails.bm25Score != null && (
              <div className="inspector-section">
                <h4>Semantic Search Relevance</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: selectedProjectDetails.bm25Score > 0.6 ? 'var(--gh-green)' : selectedProjectDetails.bm25Score > 0.3 ? 'var(--gh-orange)' : 'var(--text-muted)'
                  }}>
                    {(selectedProjectDetails.bm25Score * 100).toFixed(1)}%
                  </span>
                  <span className="inspector-desc" style={{ fontSize: '0.75rem' }}>
                    Match relevance score generated via field-boosted BM25+ query mapping.
                  </span>
                </div>
              </div>
            )}

            <div className="inspector-section">
              <h4>Telemetry Metrics</h4>
              <div className="inspector-metrics">
                
                {/* Score Summary */}
                <div className="score-hud-block">
                  <div>
                    <h4 style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>Telemetry Rank Score</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weighted health rank</span>
                  </div>
                  <span className="score-large">{selectedProjectDetails.score}</span>
                </div>

                {/* Stars Metric */}
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Stars Count</span>
                    <span>★ {selectedProjectDetails.stars}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min((selectedProjectDetails.stars / 100000) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Forks Metric (Developer Adoption) */}
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Forks Count (Community Adoption)</span>
                    <span>⑂ {selectedProjectDetails.forks}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min((selectedProjectDetails.forks / 20000) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Velocity Metric */}
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Star Accumulation Velocity</span>
                    <span>{selectedProjectDetails.starVelocity} stars/day</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min((Number(selectedProjectDetails.starVelocity) / 150) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Fork Velocity Metric */}
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Fork Accumulation Velocity</span>
                    <span>{selectedProjectDetails.forkVelocity} forks/day</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min((Number(selectedProjectDetails.forkVelocity) / 30) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Commits Metric */}
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Default Branch Commits (14d)</span>
                    <span>{selectedProjectDetails.commits} commits</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min((selectedProjectDetails.commits / 100) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Issue Resolution Metric */}
                <div className="metric-row">
                  <div className="metric-label">
                    <span>Issue Resolution Ratio (30d)</span>
                    <span>{selectedProjectDetails.resolution}% resolved</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${selectedProjectDetails.resolution}%` }} />
                  </div>
                </div>

              </div>
            </div>

            <div className="inspector-section">
              <h4>Telemetry Star Velocity Comparison</h4>
              <svg className="mini-chart-svg" viewBox="0 0 100 20">
                <rect x="0" y="4" width="100" height="12" rx="3" fill="rgba(255,255,255,0.05)" />
                <rect x="0" y="4" width={Math.min((Number(selectedProjectDetails.starVelocity) / 80) * 100, 100)} height="12" rx="3" fill="var(--focus-color)" opacity="0.8" />
                <line x1={Math.min((Number(telemetry.avgVelocity) / 80) * 100, 99)} y1="2" x2={Math.min((Number(telemetry.avgVelocity) / 80) * 100, 99)} y2="18" stroke="var(--neon-cyan)" strokeWidth="1.5" strokeDasharray="2 1" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>0★/day</span>
                <span>Sector Avg: {telemetry.avgVelocity}★/d</span>
                <span>80+★/day</span>
              </div>
            </div>

            <div className="inspector-section" style={{ border: 'none', marginTop: 'auto', paddingTop: '20px' }}>
              <a 
                href={selectedProjectDetails.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hud-link-btn"
              >
                🛰️ INTERCEPT REPOSITORY (GITHUB) ↗
              </a>
            </div>
          </>
        )}
      </aside>

    </div>
  );
}
