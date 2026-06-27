# Git Observatory Product PRD

Version: 1.0
Status: Proposed
Surface: Web first, API-first backend, MCP-enabled later
Deployment Target: Google Cloud, primarily Cloud Run serverless

## 1. One-Page Product Definition

### Product Name
Git Observatory

### Product Category
Repository discovery, evaluation, and recommendation platform for open-source software, starting with GitHub.

### Problem
Developers, integrators, AI builders, and technical evaluators can usually find many GitHub repositories for a topic, but they cannot quickly determine which repositories are worth serious attention. GitHub search is broad and filterable, but it does not turn search results into an informed decision. Users are left "throwing a stone in the dark" and manually comparing stars, docs, activity, maintainers, and stack quality.

### Product Thesis
GitHub shows what exists. Git Observatory explains what is worth your attention right now, for your specific use case.

### Core Value Proposition
Git Observatory combines GitHub metadata, telemetry, semantic relevance, and AI-generated repository briefs to produce recommendation-grade repository intelligence. It helps users decide:

- what a repository is
- why it matters
- who it is best for
- how active and credible it is
- what risks to watch before adopting it

### Signature Product Feature
The signature visual of the product should be the `Observatory Quadrant`: a category-specific repository matrix that makes market position legible at a glance. This should become a core identity element of the product, especially for AI, developer tooling, and integration ecosystems.

### Primary User Outcome
Turn an ambiguous GitHub exploration task into a ranked shortlist with clear reasons.

### Target User Outcome
In less than 5 minutes, a user should be able to go from vague intent to:

- a shortlist of 3 to 10 relevant repositories
- a structured brief for each candidate
- a comparison between alternatives
- a justified decision to learn, integrate, monitor, or reject

### Why This Product Can Win
Existing tools are strong in one of these areas, but not all at once:

- GitHub Search is strong at broad discovery, but weak at recommendation and explanation. Source: [GitHub Docs](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)
- OSS Insight is strong at analytics depth and trend intelligence, but is more analytics-first than decision-first. Source: [OSS Insight](https://ossinsight.io/)
- Libraries.io is strong at dependency and ecosystem relationships, but is package-centric and not designed as a repository recommendation layer. Source: [Libraries.io](https://libraries.io/about)
- Sourcegraph is strong at code understanding and codebase context, but is strongest after a user already knows which repository or codebase matters. Source: [Sourcegraph](https://sourcegraph.com/)

Git Observatory can occupy the decision layer between search and code understanding.

### Competitive Landscape And Product Boundaries
Git Observatory should not try to beat every adjacent product at its strongest job. It should win by combining enough discovery, telemetry, and explanation to help a user decide what to evaluate first.

#### GitHub Search
GitHub Search is the baseline discovery tool.

Strength:
- exhaustive repository discovery
- mature filters
- native GitHub context
- best place for known queries and exact constraints

Weakness:
- does not explain which result matters most for a specific user
- ranks by repository facts more than adoption fit
- requires manual inspection across many tabs

Product Response:
- keep GitHub as the source of truth
- use search as input, not as the product experience
- add recommendation-first ranking, repository briefs, and decision rationale

We should not compete with GitHub on exhaustive search coverage. We should compete on `why this repo matters for me right now`.

#### OSS Insight
OSS Insight is the strongest analytics reference point.

Strength:
- deep open-source analytics
- event-scale trend intelligence
- stars, commits, pull requests, issues, contributors, and historical activity views
- high credibility as a GitHub ecosystem analytics surface

Weakness:
- analytics-first rather than persona-aware decision-first
- better at showing what is happening than explaining what a specific evaluator should do next
- less focused on shortlist, compare, and adoption workflow

Product Response:
- use analytics depth as inspiration for telemetry quality
- prioritize recommendation explanations over raw charts
- convert telemetry into `best_for`, `watch_out`, maturity, and adoption-fit judgments

We should not try to out-analytics OSS Insight in phase one. We should turn sufficient analytics into better repository decisions.

#### Libraries.io
Libraries.io is strongest around package and dependency intelligence.

Strength:
- package-centric ecosystem mapping
- dependency relationships
- release and version monitoring
- useful for dependency due diligence

Weakness:
- less suited to broad GitHub repository evaluation
- package metadata does not always capture repository usefulness, maintainer credibility, or adoption fit
- not primarily a recommendation layer for choosing which repo to evaluate first

Product Response:
- borrow release hygiene, dependency awareness, and ecosystem relationship patterns
- avoid becoming a package index
- add repository-level evaluation across packages, tools, apps, frameworks, SDKs, examples, and agent infrastructure

We should use dependency signals where useful, but the core artifact remains the `Repository Card`, not a package page.

#### Sourcegraph
Sourcegraph is strongest once the user already knows which codebase matters.

Strength:
- deep code search
- code understanding
- repository and codebase navigation
- useful context layer for humans and agents
- strong fit after repo selection

Weakness:
- not primarily a repository discovery and prioritization surface
- does not replace the need to decide which repositories deserve inspection first

Product Response:
- position Git Observatory upstream from Sourcegraph
- help users identify and justify the repositories worth deeper code understanding
- later integrate or export repository shortlists into code-intelligence workflows

We should not compete with Sourcegraph on deep code intelligence. We should become the recommendation layer before code inspection.

### Competitive Feature Implications
Features to implement because of this landscape:
- recommendation-first result cards
- persona-aware ranking
- structured repository briefs
- compare workflow
- Observatory Quadrant
- trend and movement signals
- watchlists and alerts
- repository scorecards
- curated collections and shortlists
- machine-readable repository intelligence for agents

Features to avoid as first-wave priorities:
- exhaustive GitHub search replacement
- full open-source event analytics warehouse
- package registry clone
- deep code search engine
- notebook or artifact hosting surface

### Non-Goals
- Not a generic code host
- Not a full replacement for GitHub
- Not a code intelligence engine like Sourcegraph
- Not a package manager index like Libraries.io
- Not a social feed for developers

## 2. Ideal Customer Profile and Positioning

### Primary ICP
Technical evaluators who repeatedly need to decide which open-source repository to inspect, adopt, integrate, learn from, or monitor.

### Core Personas

#### Persona A: AI Builder / Indie Technical Founder
Needs:
- find rising AI repos before they become obvious
- discover practical frameworks, SDKs, and example apps
- separate hype from usable tooling

Pain:
- trending lists are noisy
- stars alone are misleading
- hard to tell if a repo is alive, practical, or abandoned

Budget Signal:
- willing to pay individually for time savings, monitoring, and shortlist quality

#### Persona B: Integration Engineer / Solutions Architect
Needs:
- identify credible repos to integrate or evaluate
- understand maintenance health and adoption risk
- compare alternatives quickly

Pain:
- manual due diligence is repetitive
- GitHub descriptions do not answer operational fit
- evaluation work is duplicated across teams

Budget Signal:
- strong B2B willingness to pay

#### Persona C: Platform Engineer / Devtools PM
Needs:
- map the ecosystem around an internal need
- identify reference implementations and adjacent tools
- watch emerging repos in a category

Pain:
- hard to track category shifts
- internal recommendations are hard to standardize

Budget Signal:
- good fit for team plan or API access

#### Persona D: AI Agent / Automated Research Workflow
Needs:
- structured, deterministic repository recommendations
- machine-readable repo briefs
- persona-aware ranking and risk signals

Pain:
- raw GitHub APIs return facts, not judgment
- agents waste tokens reconstructing repository context repeatedly

Budget Signal:
- best monetized later through API and enterprise integrations rather than first-wave consumer pricing

### Positioning Statement
For technical teams and builders evaluating open-source software, Git Observatory is a repository intelligence platform that turns GitHub search into decision-ready recommendations. Unlike GitHub search, trend dashboards, or raw package indexes, Git Observatory ranks repositories by relevance, momentum, maintainability, and fit, then explains why each repository matters.

### Category Positioning
Primary category:
Repository intelligence and recommendation

Secondary category:
Open-source evaluation workflow

Tertiary category:
Agent-ready GitHub discovery infrastructure

## 3. Product Strategy

### Wedge
Start with AI and developer-tooling repositories, because the current taxonomy and scoring already fit that world:

- Agents
- RAG and knowledge systems
- Local and open AI
- AI coding
- Applied AI products

### Strategic Expansion Path
1. AI and developer tooling
2. Infrastructure and data engineering
3. Security and enterprise integrations
4. General OSS discovery

### Core Product Bet
The winning behavior is not "search all repositories." It is "make better adoption and evaluation decisions."

## 4. User Jobs To Be Done

### Functional Jobs
- Find relevant repositories for a use case
- Understand what makes each repository notable
- Assess maintenance and growth quality
- Compare alternatives
- Save and monitor selected repositories
- Export findings into docs, Slack, or downstream systems

### Emotional Jobs
- Reduce ambiguity
- Reduce fear of missing better options
- Increase confidence in adoption decisions
- Avoid wasting time on noisy or abandoned projects

### Social Jobs
- Defend recommendations to teammates or leadership
- Share a shortlist with rationale
- Standardize open-source evaluation inside a team

## 5. Product Requirements

### Core Requirements

#### R1. Search By Intent
The product must accept:
- keyword queries
- natural-language queries
- persona-aware search requests

Examples:
- "TypeScript agent framework with strong docs and active maintainers"
- "RAG libraries suitable for production use"
- "Learning repos for LLM orchestration"

#### R2. Ranking Engine
The product must rank repositories using:
- semantic relevance
- star velocity
- fork velocity
- recent commit activity
- issue or maintenance health
- freshness
- owner and ecosystem credibility
- persona fit

#### R3. Structured Repository Brief
Each repository must have a machine-readable and UI-readable brief with:
- what it is
- why it matters
- best for
- strengths
- risks
- maturity
- maintenance status
- stack summary

#### R4. Compare Alternatives
Users must be able to compare 2 to 5 repositories on:
- fit by persona
- growth
- maintenance
- stack
- risk
- adoption suitability

#### R5. Save, Watch, and Share
Users must be able to:
- save repositories to collections
- create watchlists
- receive updates
- export briefs and comparisons

#### R6. Agent-Ready API
All core repository intelligence should be exposed as structured API responses from the start, even before full MCP rollout.

### Nice-To-Have Requirements
- Team notes and evaluation status
- Slack delivery
- Notion export
- Similar repository suggestions
- Ecosystem maps
- Saved prompt templates by persona

## 6. UX Requirements

### Desktop UX
Desktop should behave like a research workstation.

Requirements:
- list-first exploration
- fast filter refinement
- expandable repository brief
- side-by-side compare
- saved shortlist workflow
- a strong interactive quadrant view for category-level exploration

Result card should show:
- theme
- repository name
- one-line "why it matters"
- one-line "best for"
- 2 to 4 key metrics
- 1 risk or status badge

Detail panel should show:
- repository brief
- adoption fit
- strengths and watch-outs
- stack and maintainer summary
- recent activity and trend data

Desktop should support two complementary modes:
- `List View` for decision-ready repository cards
- `Quadrant View` for ecosystem scanning, category comparison, and presentation-grade exploration

### Mobile UX
Mobile should behave like a shortlist and triage surface.

Requirements:
- grid list only
- highly compressed cards
- no decorative charts
- one strong recommendation line per repo
- one tap to expand the full brief

Mobile should not use the full interactive quadrant as the primary browsing surface. Instead, mobile should expose quadrant insight in lighter forms:
- a small quadrant badge on each repo
- a quadrant label in the detail view
- optional static category mini-map in a dedicated detail section

Mobile result card should show:
- theme
- repo name
- why it matters
- 2 key metrics
- 1 caution or quality badge

### Information Hierarchy
The product should present:
1. Why it matters
2. What it is
3. Who it is for
4. Whether it is healthy
5. Supporting telemetry

The current app largely presents telemetry before interpretation. The roadmap should reverse that.

## 7. Quadrant System As A Product Feature

### Strategic Role
The quadrant should become one of the most recognizable parts of the product. It is not just decoration. It should help answer:

- which repositories are market leaders
- which repositories are fast-rising challengers
- which repositories are credible but niche
- which repositories are visible but risky

### Important Product Note
Do not brand this as "Gartner Quadrant" or imply association with Gartner.

Recommended product names:
- `Observatory Quadrant`
- `Repo Positioning Matrix`
- `Repository Landscape`
- `Category Intelligence Map`

The product can be described internally as inspired by strategic quadrant models, but the public naming should be original.

### Recommended Axes
Use axes that are legible to technical evaluators, not abstract management jargon.

Recommended default axes:
- X-axis: `Adoption Momentum`
- Y-axis: `Operational Credibility`

#### Adoption Momentum
Composed from:
- star velocity
- fork velocity
- semantic relevance in the current category
- contributor growth
- recency of pushes

#### Operational Credibility
Composed from:
- recent commit consistency
- issue resolution ratio
- maintainer continuity
- documentation quality score
- release hygiene
- organizational credibility

### Recommended Quadrants

#### Top Right: Strategic Leaders
Meaning:
- strong adoption momentum
- strong operational credibility

Interpretation:
- most likely candidates for adoption, integration, or serious evaluation

#### Top Left: Trusted Specialists
Meaning:
- lower momentum but strong credibility

Interpretation:
- reliable, often mature, technically credible tools that may be niche or under-promoted

#### Bottom Right: Rising Challengers
Meaning:
- high momentum but weaker operational credibility

Interpretation:
- exciting projects worth watching or learning from, but not always ready for production use

#### Bottom Left: Early Or Unproven
Meaning:
- low momentum and lower operational credibility

Interpretation:
- experimental, dormant, or emerging projects with uncertain adoption fit

### Visual Design Requirements

#### Desktop
The quadrant should feel like a premium analysis surface.

Requirements:
- full-width interactive matrix
- clear axis labels with tooltips
- quadrant labels with short explanations
- bubble size representing ecosystem weight
- bubble color representing theme or recommendation status
- motion trail or delta marker showing movement over time
- hover card with `why it matters`, `best for`, and `watch out`
- click from quadrant node into repository brief

#### Mobile
The full quadrant should not be the main discovery pattern.

Use instead:
- quadrant badge per card
- "position" row in detail drawer
- optional compact non-interactive matrix snapshot on detail page

### Advanced Quadrant Features

#### Movement Over Time
Each repository can have:
- current x/y position
- prior x/y position
- movement delta

This enables:
- rising this week
- slipping in credibility
- becoming more production-ready

#### Persona-Specific Quadrants
In later phases, allow the same repo set to reposition by persona.

Example:
- a repo may appear as a `Rising Challenger` for enterprise integrators
- but as a `Strategic Leader` for indie builders or learners

#### Theme-Specific Quadrants
Each theme should have its own repository landscape:
- Agents quadrant
- RAG quadrant
- AI coding quadrant
- LLMOps quadrant

This is more useful than one global matrix.

### Quadrant Scoring Implementation

#### Adoption Momentum Score
Suggested weighted formula:
- 35% star velocity
- 20% fork velocity
- 15% contributor growth
- 15% semantic relevance
- 15% freshness

#### Operational Credibility Score
Suggested weighted formula:
- 30% commit consistency
- 20% issue resolution ratio
- 15% release cadence
- 15% documentation quality
- 10% maintainer diversity
- 10% owner credibility

Both axes should normalize to 0-100.

### Product Use Cases For The Quadrant
- ecosystem scans by category
- shortlist presentations to stakeholders
- visual comparison of competing repos
- weekly "movers" digest
- investor, researcher, and devtools category analysis

### Monetization Relevance
The quadrant can become part of the paid differentiation:
- advanced filters on the matrix
- movement history
- team-shared saved matrix views
- exported quadrant reports
- persona-specific quadrant overlays

### API Implications
The backend should expose quadrant-ready coordinates, not force the frontend to derive them.

Each repository result should be able to include:
- `quadrant_x`
- `quadrant_y`
- `quadrant_label`
- `quadrant_movement`
- `quadrant_reason`

## 8. Current Product Gap Analysis

### What Already Exists In The Current Core
- Theme classification in [src/App.jsx](/Users/irfan/projects/pub/github-observatory/src/App.jsx:1018)
- Focus inference in [src/App.jsx](/Users/irfan/projects/pub/github-observatory/src/App.jsx:1033)
- Composite telemetry score in [src/App.jsx](/Users/irfan/projects/pub/github-observatory/src/App.jsx:1014)
- AI summary generation in [src/App.jsx](/Users/irfan/projects/pub/github-observatory/src/App.jsx:1142) and [api/explain.js](/Users/irfan/projects/pub/github-observatory/api/explain.js:32)
- Result card presentation in [src/App.jsx](/Users/irfan/projects/pub/github-observatory/src/App.jsx:1929)

### What Is Missing
- No structured repository brief object
- No explicit "why it matters" field
- AI output is generic and optimized for production suitability rather than recommendation
- No compare flow
- No saved collections
- No organization or persona-aware ranking
- No reusable backend contract for other surfaces

## 9. Recommended Product Stack On Google Cloud

### Recommendation Summary
Do not rewrite everything at once. Preserve the current React core, but move the system toward a service-oriented, API-first architecture.

### Frontend
Recommended now:
- React
- Vite
- TypeScript migration
- TanStack Query for API state
- React Router or current routing pattern if single page remains acceptable

Reason:
- Lowest migration risk from the current codebase
- Fastest path to production
- Clear separation between web UI and backend services

Recommended later:
- optional Next.js surface for SEO, content, marketing, and shareable deep-link reports

### Backend API
Recommended:
- Node.js 20
- TypeScript
- Fastify
- Zod for request and response validation

Reason:
- Fast on Cloud Run
- Lightweight compared with NestJS
- Strong fit for structured JSON APIs
- Easy to reuse models for web, API, MCP, and future SDKs

### Data Layer
Recommended now:
- Cloud SQL for PostgreSQL
- pgvector extension

Reason:
- relational model fits repositories, briefs, users, watchlists, comparisons, and snapshots
- pgvector supports semantic retrieval for intent search and similar repos
- JSONB allows flexible brief and telemetry payload storage

Recommended later:
- BigQuery for warehouse-scale GitHub event analysis

Use BigQuery when:
- ingesting GH Archive or long-horizon trend data
- building ecosystem-wide historical reports
- supporting enterprise analytics or category intelligence

### Caching
Recommended:
- Memorystore Redis

Use for:
- search result caching
- repo brief caching
- GitHub API quota protection
- hot leaderboard storage

### Async and Scheduling
Recommended:
- Pub/Sub
- Cloud Scheduler
- Cloud Run Jobs

Use for:
- daily or hourly scans
- repository enrichment
- AI brief generation
- watchlist notifications
- backfills and periodic re-ranking

### AI Stack
Recommended:
- Vertex AI
- Gemini 2.5 Flash for structured repo briefs
- Gemini 2.5 Pro for deeper compare or premium reports

Reason:
- native GCP integration
- structured JSON support
- good latency and ops fit for Cloud Run

### Authentication
Recommended:
- Firebase Authentication

Reason:
- easy GCP-native auth
- email, Google sign-in, GitHub sign-in
- straightforward token verification from Cloud Run services

### Storage
Recommended:
- Google Cloud Storage

Use for:
- exported reports
- generated comparison PDFs
- cached social share images
- audit exports

### Secrets and Security
Recommended:
- Secret Manager
- IAM
- Cloud Armor at the edge

### Observability
Recommended:
- Cloud Logging
- Cloud Monitoring
- Cloud Trace
- Error Reporting
- optional Sentry for frontend and API correlation

### Delivery
Recommended:
- GitHub Actions
- Cloud Build if preferred
- Artifact Registry
- Cloud Run deployments via CI

## 10. Service Architecture

### Phase 1 Architecture
Start with a modular monolith plus workers.

Services:
- `web-ui`: current React app
- `repo-intelligence-api`: primary REST API on Cloud Run
- `enrichment-worker`: background worker on Cloud Run
- `scan-job`: scheduled Cloud Run Job

### Phase 2 Architecture
Split services where load or complexity demands it.

Services:
- `search-service`
- `brief-service`
- `compare-service`
- `watchlist-service`
- `auth-service` if needed

### Phase 3 Architecture
Add:
- `mcp-service`
- `analytics-service`
- `reporting-service`

### Core Data Flow
1. User enters intent query
2. Search service builds GitHub query and semantic retrieval request
3. GitHub candidates are fetched or served from cache
4. Enrichment worker computes telemetry and maintenance signals
5. Brief service generates structured AI output
6. Ranker orders candidates by persona fit and telemetry
7. UI renders recommendation cards
8. Saved repositories and watchlists feed ongoing background refresh

## 11. Data Model

### Core Tables

#### `repositories`
- id
- full_name
- owner_login
- owner_type
- html_url
- description
- primary_language
- topics jsonb
- default_branch
- created_at
- github_created_at
- github_updated_at
- last_pushed_at
- license
- archived
- has_funding

#### `repository_snapshots`
- id
- repository_id
- snapshot_at
- stars
- forks
- open_issues
- closed_issues_30d
- commits_14d
- contributors_30d
- releases_90d
- activity_score
- maintenance_score
- momentum_score
- semantic_score
- quadrant_x
- quadrant_y
- quadrant_label
- quadrant_delta_x
- quadrant_delta_y
- quadrant_reason jsonb
- final_rank_score

#### `repository_briefs`
- id
- repository_id
- persona
- version
- model_name
- schema_version
- what_it_is
- why_it_matters
- best_for
- watch_out
- maturity
- adoption_recommendation
- structured_payload jsonb
- generated_at
- expires_at

#### `search_queries`
- id
- user_id nullable
- raw_query
- normalized_query
- persona
- filters jsonb
- created_at

#### `search_results`
- id
- search_query_id
- repository_id
- rank
- semantic_score
- telemetry_score
- persona_fit_score
- final_score

#### `collections`
- id
- user_id
- name
- description
- visibility
- created_at

#### `collection_items`
- id
- collection_id
- repository_id
- note
- saved_at

#### `watchlists`
- id
- user_id
- repository_id
- notification_preferences jsonb
- created_at

#### `comparisons`
- id
- user_id
- persona
- title
- repository_ids jsonb
- comparison_payload jsonb
- created_at

## 12. Structured AI Output Schema

### Goal
Replace the current freeform summary with a reusable structured contract that works in:
- web cards
- mobile cards
- detail drawer
- exports
- API clients
- future MCP tools

### Schema Version 1

```json
{
  "schema_version": "1.0",
  "repository": {
    "full_name": "owner/repo",
    "primary_language": "TypeScript",
    "themes": ["agents", "llmops"]
  },
  "persona": "integration_engineer",
  "what_it_is": "Agent orchestration framework for building multi-step LLM applications.",
  "why_it_matters": "Useful because it combines strong developer adoption with practical workflow patterns and visible maintainer activity.",
  "best_for": "Teams prototyping or shipping agent workflows in TypeScript.",
  "watch_out": "Rapid adoption is outpacing documentation depth in some advanced areas.",
  "maturity": "emerging",
  "adoption_recommendation": "evaluate",
  "strengths": [
    "High recent growth",
    "Good maintainer activity",
    "Clear AI workflow focus"
  ],
  "risks": [
    "Limited governance signals",
    "Fast-moving API surface"
  ],
  "integration_fit": {
    "api_surface": "medium",
    "documentation_quality": "medium",
    "production_readiness": "medium",
    "learning_curve": "medium"
  },
  "evidence": {
    "stars": 36100,
    "star_velocity_14d": 58.7,
    "commits_14d": 12,
    "issues_resolution_ratio_30d": 0.72,
    "semantic_relevance": 0.94
  },
  "quadrant": {
    "x_label": "adoption_momentum",
    "y_label": "operational_credibility",
    "x_score": 84,
    "y_score": 61,
    "label": "rising_challenger",
    "reason": "Adoption is accelerating quickly, but operational signals are still maturing."
  },
  "confidence": 0.83
}
```

### Enumerations

#### Persona
- `indie_builder`
- `integration_engineer`
- `platform_engineer`
- `technical_researcher`
- `ai_agent`

#### Maturity
- `experimental`
- `emerging`
- `maturing`
- `established`
- `legacy`

#### Adoption Recommendation
- `ignore`
- `watch`
- `learn`
- `evaluate`
- `adopt`

### Prompting Strategy
Input features should include:
- description
- topics
- primary language
- owner profile summary
- stars
- velocity
- commits
- issue health
- contributor signals
- semantic query context
- persona

Prompt should ask the model to output strict JSON, not prose.

## 13. REST API Design

### Base Path
`/v1`

### Search and Discovery

#### `POST /v1/search`
Purpose:
Search repositories by keyword or intent and return ranked results.

Request:
```json
{
  "query": "actively maintained TypeScript agent framework for production use",
  "persona": "integration_engineer",
  "filters": {
    "languages": ["TypeScript"],
    "themes": ["agents"],
    "min_stars": 500,
    "exclude_archived": true
  },
  "limit": 20
}
```

Response:
```json
{
  "search_id": "srch_123",
  "results": [
    {
      "repository_id": "repo_1",
      "full_name": "owner/repo",
      "why_it_matters": "Strong fit for production evaluation due to activity and ecosystem momentum.",
      "best_for": "TypeScript AI teams",
      "rank_scores": {
        "semantic": 0.91,
        "momentum": 0.82,
        "maintenance": 0.75,
        "persona_fit": 0.88,
        "final": 0.86
      }
    }
  ]
}
```

#### `GET /v1/repositories/{owner}/{repo}`
Purpose:
Return normalized repository metadata and latest telemetry.

#### `GET /v1/repositories/{owner}/{repo}/brief`
Purpose:
Return structured repository brief for a persona.

Query params:
- `persona`
- `refresh`

#### `POST /v1/repositories/compare`
Purpose:
Compare 2 to 5 repositories.

Request:
```json
{
  "persona": "integration_engineer",
  "repositories": [
    "owner/a",
    "owner/b",
    "owner/c"
  ]
}
```

#### `POST /v1/collections`
Create a saved collection.

#### `POST /v1/watchlists`
Create a watchlist entry.

#### `GET /v1/themes/{theme}/trending`
Get top repositories for a category over a defined time window.

#### `GET /v1/themes/{theme}/quadrant`
Purpose:
Return quadrant coordinates, labels, and movement data for repositories in a theme.

Response:
```json
{
  "theme": "agents",
  "x_axis": "adoption_momentum",
  "y_axis": "operational_credibility",
  "repositories": [
    {
      "full_name": "owner/repo",
      "quadrant_x": 84,
      "quadrant_y": 61,
      "quadrant_label": "rising_challenger",
      "movement": {
        "delta_x": 7,
        "delta_y": 3
      },
      "why_it_matters": "Fast-rising framework with visible adoption pull."
    }
  ]
}
```

#### `GET /v1/related`
Get similar repositories by semantic and telemetry proximity.

## 14. MCP Endpoint Design

### Strategic Note
MCP should not be the first monetization unit. It should be an access layer for the same core repository intelligence service.

### Recommended Rollout
Implement the backend contracts first. Launch MCP once:
- repository brief quality is strong
- persona ranking is stable
- compare results are useful

### MCP Server Shape
Deploy a dedicated `mcp-service` on Cloud Run later.

### Core Tools

#### `search_repositories_by_intent`
Input:
- query
- persona
- filters
- limit

Output:
- ranked repositories with concise rationale

#### `get_repository_brief`
Input:
- repository
- persona

Output:
- full structured brief

#### `compare_repositories`
Input:
- repositories
- persona

Output:
- structured comparison table and recommendation

#### `get_theme_trends`
Input:
- theme
- time_window

Output:
- incumbents
- rising challengers
- experimental repos

#### `get_theme_quadrant`
Input:
- theme
- persona
- time_window

Output:
- repository coordinates
- quadrant labels
- movement signals
- axis explanations

#### `find_integration_candidates`
Input:
- use_case
- language
- constraints

Output:
- shortlist optimized for integrators

### MCP Resources
- theme definitions
- ranking methodology
- saved org policy profiles
- persona definitions

### MCP Monetization Position
Do not sell "MCP access" as a standalone novelty.
Sell:
- repo intelligence API
- workflow augmentation for agents
- organization-grade search and evaluation

MCP is the delivery format, not the product.

## 15. Commercial Pathway

### Service Position
The commercial service is:
`open-source repository intelligence as workflow software`

Not:
- ads
- content sponsorship
- generic AI chat

### Monetization Logic
Users pay for:
- time saved
- evaluation confidence
- monitoring and alerts
- comparison workflows
- team collaboration
- agent-ready structured retrieval

### Free Tier
Target:
- individual exploration
- SEO and virality
- community goodwill

Include:
- limited searches per day
- limited repository briefs
- public theme trending pages
- basic compare with capped repositories

### Pro Tier
Target:
- indie builders
- consultants
- heavy individual users

Include:
- unlimited saved collections
- richer repository briefs
- persona-aware recommendations
- watchlists and alerts
- exportable reports
- deeper comparison

### Team Tier
Target:
- solution engineers
- platform teams
- research teams
- devtools orgs

Include:
- shared workspaces
- team notes
- approval or evaluation state
- shared watchlists
- Slack or Notion integrations
- admin usage controls

### API / Agent Tier
Target:
- AI applications
- internal assistants
- enterprise procurement or integration bots

Include:
- usage-based API
- SLA
- structured compare and shortlist endpoints
- later MCP server access

### Pricing Recommendation
Initial hypothesis, not final pricing:
- Free: no charge
- Pro: monthly self-serve subscription
- Team: seat-based or workspace-based pricing
- API: usage-based plus minimum platform fee

### Important Business Recommendation
Do not lead with MCP monetization.
Lead with SaaS workflow monetization.

Why:
- easier to explain
- easier to validate willingness to pay
- easier to prove value via user outcomes
- MCP can then become an enterprise multiplier instead of a speculative first bet

## 16. Three-Phase Roadmap With Free vs Paid Boundaries

### Phase 1: Recommendation Clarity
Goal:
Turn the current dashboard into a recommendation product.

Deliverables:
- structured repository brief schema
- new AI prompt and JSON generation
- `why_it_matters` in result cards
- `best_for` and `watch_out` in detail view
- improved desktop and mobile information hierarchy
- first production-quality Observatory Quadrant for theme exploration
- backend API contract for search and brief retrieval
- Cloud Run API service
- Postgres schema

Free:
- search
- limited briefs
- theme browsing

Paid:
- saved watchlists
- unlimited briefs
- compare workflow

Success Metrics:
- click-through from list to detail
- save rate
- compare usage
- user-reported decision confidence

### Phase 2: Workflow and Monitoring
Goal:
Turn repository intelligence into repeatable workflow software.

Deliverables:
- collections
- watchlists
- alerts
- compare mode
- saved quadrant views
- quadrant movement history
- team-shared ecosystem maps
- shared team notes
- exported brief documents
- scheduled refresh jobs
- query history
- persona presets

Free:
- simple saved items

Paid:
- alerts
- team collaboration
- exports
- advanced comparisons

Success Metrics:
- weekly retained users
- watchlist activation
- repeated searches by same user
- team workspace creation

### Phase 3: Platform and Agent Layer
Goal:
Expose the intelligence layer as programmable infrastructure.

Deliverables:
- public API
- org policy profiles
- MCP server
- quadrant APIs for agents and embeds
- partner integrations
- ecosystem maps
- enterprise governance features

Free:
- limited public API trial

Paid:
- API usage
- enterprise workflows
- agent integrations
- MCP access under platform plans

Success Metrics:
- API token adoption
- external integrations
- enterprise evaluation pilots
- partner usage

## 17. Discovery Platform Feature Blueprint

### Product Principle
We should borrow the best discovery patterns from mature AI platforms without inheriting their scope.

This product should not become:
- a model hosting service
- a dataset registry
- a notebook platform
- a general developer social network

It should become:
- the best place to discover, understand, compare, and monitor GitHub repositories in a given technical theme
- the cleanest structured metadata layer for downstream AI agents and enterprise workflows

The inspiration to borrow is not "AI artifacts." The inspiration to borrow is:
- canonical detail artifacts
- structured metadata
- strong taxonomy
- comparison and evaluation surfaces
- saved workflows
- programmable access

### Feature 1: Repository Cards As Canonical Product Units
The closest analogue to a model card should be a `Repository Card`.

Each repository should have a canonical card with:
- `why_it_matters`
- `best_for`
- `not_ideal_for`
- `maturity_summary`
- `adoption_summary`
- `operational_summary`
- `integration_readiness`
- `agent_relevance`
- `quadrant_label`
- `trust_signals`
- `watch_outs`

This is the single most important UI and data artifact in the product because it turns noisy GitHub metadata into an opinionated recommendation object.

#### Desktop Requirements
- repository card opens as a rich detail panel or dedicated page
- first screen answers value, fit, maturity, and risk before raw telemetry
- quadrant position, trend movement, and compare entry point are visible above the fold
- telemetry appears as supporting evidence, not as the headline

#### Mobile Requirements
- repository card stays compressed and readable in one vertical flow
- the first block is `why_it_matters`
- one-line `best_for` and one-line `watch_out`
- no mini graph or stretched decorative chart
- expandable sections for stack, maintainers, and change history

#### Free vs Paid
Free:
- basic repository card
- limited brief views per day

Paid:
- full historical card
- deeper risk explanation
- exportable repository brief
- saved notes and team annotations

### Feature 2: Structured Metadata Sheets
One of the strongest reusable patterns to borrow is highly structured metadata that is both human-readable and machine-readable.

Every repository should expose normalized metadata fields such as:
- theme
- jobs-to-be-done
- languages
- frameworks
- deployment surface
- integration type
- interface style: library, API, CLI, UI, SDK, agent framework
- agent usability level
- maintenance state
- license type
- release hygiene
- documentation quality
- onboarding complexity
- production readiness

This improves:
- filtering
- ranking
- compare workflows
- agent consumption through API and later MCP

#### UI Requirements
- filters should use this schema directly
- detail cards should show the highest-value metadata as plain-language badges
- raw metadata should be collapsible, not dominant

#### Free vs Paid
Free:
- visible metadata tags
- standard search filters

Paid:
- advanced compound filters
- persona-specific ranking
- org policy matching

### Feature 3: Curated Collections And Published Shortlists
Collections are one of the best product patterns to borrow because they turn search sessions into reusable assets.

Examples:
- `Best Open Source Agent Frameworks For Enterprise Evaluation`
- `Fastest-Rising Browser Automation Repositories`
- `Reliable RAG Infrastructure Projects`
- `Repositories To Watch For AI Coding Integrations`

Collections can be:
- editorial and product-curated
- user-created
- team-private
- team-shared

#### UI Requirements
- desktop should support collection pages with intro copy, repository cards, and compare actions
- mobile should treat collections as compact saved shortlists with quick badges and notes

#### Free vs Paid
Free:
- browse public collections
- create a small number of personal collections

Paid:
- unlimited collections
- shared team collections
- collaborative notes
- change tracking inside a collection

### Feature 4: Repository Scorecards And Decision Evals
Instead of model evals, this product should offer `repository evaluation scorecards`.

Recommended scoring dimensions:
- adoption momentum
- operational credibility
- documentation clarity
- integration readiness
- agent friendliness
- enterprise fit
- maintainer continuity
- experimentation velocity

Each score should include:
- numeric score
- short explanation
- evidence fields
- confidence level

#### UI Requirements
- desktop compare view should show side-by-side scorecards
- result cards should surface only 1-2 score highlights
- mobile should not show dense score matrices by default; it should show one recommendation sentence and one caution sentence

#### Monetization
This is a strong paid feature because it saves evaluation time and creates defensible workflow value.

### Feature 5: Theme Navigation Instead Of Keyword-Only Search
The product should not rely only on ad hoc search. It should also have strong category navigation by theme and job-to-be-done.

Example themes:
- AI agents
- RAG infrastructure
- browser automation
- LLM observability
- coding agents
- vector data systems
- prompt management

Each theme page should contain:
- quadrant view
- strategic leaders
- rising challengers
- best for production
- best for experimentation
- top maintainers or organizations
- short explanation of what the theme is and where it is going

#### Why This Matters
This reduces the "throwing a stone in the dark" problem by giving the user a structured starting point.

### Feature 6: Leaderboards And Movers
Discovery products feel useful when they show movement, not just static results.

Recommended leaderboard types:
- trending this week
- highest credibility
- fastest improving
- most relevant for a theme
- most production-ready
- most agent-friendly

#### UI Requirements
- desktop can support dedicated leaderboard tabs or theme sections
- mobile should show a compact top-five or top-ten list with one rationale per entry

#### Free vs Paid
Free:
- public trending lists

Paid:
- custom leaderboards
- historical leaderboard snapshots
- team-specific ranking views

### Feature 7: Watchlists, Alerts, And Movement Tracking
This already exists in the roadmap, but it should be treated as a primary product surface rather than an add-on.

Alert triggers should include:
- quadrant movement
- release activity change
- maintainer inactivity
- issue resolution deterioration
- adoption spike
- relevance change within a theme

#### Why It Matters
This converts the product from a one-time search tool into recurring operational intelligence.

### Feature 8: Maintainer, Organization, And Ecosystem Pages
An important pattern to borrow is rich entity pages, but adapted to GitHub organizations and maintainers instead of models or datasets.

Each entity page should show:
- core repositories
- focus areas
- aggregate credibility
- release cadence
- documentation quality trend
- collaboration network
- strongest themes

This helps users answer:
- which organizations consistently produce high-quality repos
- who is worth following in a given theme
- where ecosystem gravity is forming

### Feature 9: Team Workspaces And Decision Trails
The product should support a team workflow where evaluation work is preserved.

Workspace capabilities:
- shared watchlists
- shared collections
- compare sessions
- notes and recommendations
- approval status
- procurement or implementation checklist

This is especially important for:
- platform teams
- innovation teams
- developer tooling evaluators
- solution architects

### Feature 10: Agent-Ready Surfaces
The long-term platform advantage is that the same repository intelligence should be consumable by people and agents.

Every major UI artifact should have a structured equivalent:
- repository card JSON
- compare result JSON
- quadrant snapshot JSON
- collection JSON
- leaderboard JSON

This is what later makes API and MCP credible.

### What We Should Not Copy
We should deliberately avoid:
- heavy detail pages that feel like a registry dump
- community mechanics that distract from evaluation
- artifact hosting or inference surfaces
- telemetry-first layouts that bury the recommendation
- desktop patterns that collapse poorly on mobile

### Recommended Phase Mapping
#### Phase 1
Ship now:
- repository cards
- structured metadata
- theme pages
- quadrant view
- lightweight leaderboards

#### Phase 2
Add next:
- collections
- repository scorecards
- watchlists and alerts
- maintainer or organization pages
- compare workflows

#### Phase 3
Add later:
- team workspaces
- team decision trails
- programmable exports
- API-first agent consumption
- MCP delivery

## 18. Implementation Plan

### Step 1: Stabilize The Domain Model
Implement backend models for:
- repository
- telemetry snapshot
- repository brief
- search result
- collection
- comparison

### Step 2: Separate The Current Frontend From Data Generation
Move current enrichment logic out of the browser and into backend services.

The browser should stop being the source of truth for:
- enrichment
- ranking
- brief generation

It should become a thin client over APIs.

### Step 3: Replace The Current AI Summary Contract
Replace the summary prompt in [api/explain.js](/Users/irfan/projects/pub/github-observatory/api/explain.js:32) with structured JSON generation.

### Step 4: Promote Value Signals Into The Card
Replace `description || call_to_action` in the result card in [src/App.jsx](/Users/irfan/projects/pub/github-observatory/src/App.jsx:1943) with:
- `why_it_matters`
- optional `best_for`

### Step 4.5: Make The Quadrant A First-Class Surface
Implement:
- backend quadrant coordinate generation
- per-theme quadrant endpoint
- desktop interactive quadrant view
- quadrant labels in cards and detail views
- movement history storage

The quadrant should be productized, not left as an incidental scatterplot.

### Step 5: Build Compare
Compare is the first truly monetizable workflow beyond search.

### Step 6: Add Watchlists
Watchlists create retention and justify recurring pricing.

### Step 7: Add Theme Pages, Collections, And Leaderboards
These are the clearest discovery-product upgrades beyond raw search.

### Step 8: Add API
Only after brief quality is reliable.

### Step 9: Add MCP
Only after API and schema are stable.

## 19. Suggested Initial Technical Backlog

### Backend
- create Fastify service
- create Postgres schema migrations
- implement GitHub client adapter
- implement enrichment worker
- implement ranking pipeline
- implement brief generation via Vertex AI
- implement quadrant coordinate computation
- implement quadrant movement snapshots
- implement repository card schema and persistence
- implement theme taxonomy and tagging pipeline
- implement leaderboard aggregations
- implement collection and workspace tables
- implement maintainer and organization aggregate views
- implement cache layer

### Frontend
- migrate to TypeScript
- replace direct GitHub fetches with API calls
- add repository brief components
- add canonical repository card page or panel
- add Observatory Quadrant desktop surface
- add quadrant badges and labels to cards
- add theme landing pages
- add leaderboard views
- add maintainer and organization profile views
- add compare UX
- add collection and watchlist UX
- add auth

### Platform
- create Cloud Run services
- create Cloud SQL instance
- configure Secret Manager
- configure Pub/Sub topics
- configure Cloud Scheduler
- configure Redis
- add CI/CD

## 20. Success Metrics

### Product Metrics
- search-to-detail conversion
- detail-to-save conversion
- compare usage rate
- repeat weekly usage
- watchlist creation rate
- quadrant-to-detail clickthrough
- category exploration session depth

### Quality Metrics
- brief helpfulness score
- ranking satisfaction score
- false-positive rate in recommendations
- time to shortlist
- quadrant interpretation accuracy
- movement signal usefulness

### Business Metrics
- free-to-paid conversion
- watchlist-driven retention
- team workspace expansion
- API revenue

## 21. Final Recommendation

The most important strategic decision is this:

Do not build this as a prettier GitHub search client.

Build it as:
`the recommendation and evaluation layer between GitHub search and code understanding tools`

Borrow the strongest discovery patterns from modern AI platforms:
- canonical cards
- rich metadata
- collections
- scorecards
- leaderboards
- saved workflows

But apply them to GitHub repository evaluation, not to model hosting.

That is the product with the best chance of differentiation, monetization, and eventual API or MCP expansion.
