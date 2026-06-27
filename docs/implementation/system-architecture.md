# System Architecture

## Architectural Position

The product is a repository intelligence system with four layers:

1. ingestion and telemetry
2. scoring and interpretation
3. product APIs and UI
4. optional agent-facing interface later through MCP

The current codebase already contains the seed of the product:

- `src/` contains the user-facing discovery interface
- `api/` contains the first backend boundary
- `scripts/` contains early data workflows

The implementation plan preserves those assets and evolves them into production-grade services.

## Primary Goals

- serverless-first deployment
- minimal idle cost
- container-based delivery
- clear multi-tenant SaaS path
- client-hosted container deployment path
- clean separation between telemetry, scoring, AI interpretation, and presentation

## Target Runtime Topology

### 1. Web Application
- React frontend
- built as static assets
- served through CDN hosting in the default SaaS deployment
- can also be served from a container for client-hosted environments

### 2. API Service
- stateless HTTP service
- exposes search, repository detail, compare, collections, watchlists, themes, leaderboards, and quadrant data
- validates all request and response contracts
- does not compute long-running enrichment inline

### 3. Enrichment Worker
- asynchronous compute path
- fetches GitHub telemetry
- computes normalized signals
- generates repository briefs
- computes scores and quadrant positions
- refreshes watchlists and alerts

### 4. Data Store
- Postgres is the system of record
- stores repositories, snapshots, briefs, scores, quadrant positions, themes, collections, watchlists, workspaces, and audit logs

### 5. Queue and Scheduling
- queue dispatch for enrichment and refresh work
- scheduled refresh for trending themes, watchlists, and score movement snapshots

### 6. Object Storage
- exports
- cached artifacts
- optional snapshot payload storage

## Architectural Principles

### Deterministic First
The platform should compute factual repository telemetry deterministically:

- stars
- forks
- issue activity
- release recency
- commit cadence
- contributor patterns

AI should interpret the signals, not invent them.

### Thin Client
The browser should not be the source of truth for:

- enrichment
- ranking
- brief generation
- score computation

The browser should render product APIs only.

### Container Neutrality
Every runtime component should support:

- Cloud Run for SaaS
- plain Docker deployment for client-hosted delivery

### Low Idle Cost
The system should tolerate low traffic without expensive always-on infrastructure.

## Recommended Technical Stack

### Application
- TypeScript
- React
- Vite
- Fastify
- Zod
- Drizzle ORM

### Platform
- Cloud Run for API
- Cloud Run Jobs or Cloud Run worker service for background jobs
- Cloud Scheduler
- Cloud Tasks or Pub/Sub
- Secret Manager
- Cloud Storage

### Data
- Postgres
- optional Redis later if caching pressure justifies it

### Quality
- Playwright
- contract validation tests
- schema fixtures

## Model Use Policy

### Stronger model
Reserved for:

- schema definition
- scoring design
- prompt design
- review and signoff

### Lower-cost implementation models
Used for:

- code scaffolding
- endpoint implementation
- UI implementation against specs
- test generation
- migrations and repetitive wiring

This repo should be structured so lower-cost agents can work from clear contracts rather than improvising architecture.
