import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function inferProjectFocus(repo, description) {
  const repoLower = repo.toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  // Known corporate/enterprise namespaces
  const corporateNamespaces = [
    'microsoft/', 'google/', 'meta-llama/', 'openai/', 'unslothai/', 
    'langgenius/', 'dify/', 'cohere-ai/', 'aws/', 'amazon/', 'volcengine/', 
    'baidu/', 'netflix/', 'uber/', 'airbnb/', 'facebook/', 'glean/', 'hashicorp/'
  ];
  
  // Check if owner is a corporate entity
  const isCorporateOwner = corporateNamespaces.some(ns => repoLower.startsWith(ns));
  
  // Keyword indicators
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

function migrate() {
  const srcPath = path.resolve(__dirname, '../../ai-atlas/src/repos.json');
  const targetDir = path.resolve(__dirname, '../src/data');
  const targetPath = path.join(targetDir, 'galaxy-db.json');

  if (!fs.existsSync(srcPath)) {
    console.error(`Source repos.json not found at ${srcPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(srcPath, 'utf8');
  const repos = JSON.parse(rawData);

  console.log(`Migrating ${repos.length} repositories and inferring focus...`);

  const migrated = repos.map(item => {
    // Generate a placeholder description if missing
    let description = '';
    if (item.call_to_action.toLowerCase().includes('understand')) {
      const match = item.call_to_action.match(/"([^"]+)"/);
      if (match) description = match[1];
    }
    if (!description) {
      description = item.call_to_action;
    }

    const focus = inferProjectFocus(item.repo, description);
    
    return {
      ...item,
      description,
      focus
    };
  });

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(migrated, null, 2), 'utf8');
  console.log(`Successfully migrated ${migrated.length} entries to ${targetPath}`);

  // Print statistics
  const stats = { Enterprise: 0, Community: 0, Individual: 0 };
  migrated.forEach(item => {
    stats[item.focus] = (stats[item.focus] || 0) + 1;
  });
  console.log('Focus Distribution:', stats);
}

migrate();
