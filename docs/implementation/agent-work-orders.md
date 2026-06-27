# Agent Work Orders

## Operating Model

The high-reasoning model defines contracts, reviews tradeoffs, and signs off on cross-cutting decisions.

Lower-cost agents implement against those decisions.

## Agent 1: Schema and Contracts

### Scope
- TypeScript domain types
- JSON schemas
- API contracts
- validation rules

### Deliverables
- repository brief schema
- scorecard schema
- quadrant schema
- search result schema
- theme payload schema

### Acceptance criteria
- every schema is versionable
- every AI-produced payload is validated
- every frontend payload has a stable contract

## Agent 2: GitHub Ingestion

### Scope
- GitHub REST and GraphQL adapters
- telemetry normalization
- snapshot persistence
- rate limit policy

### Acceptance criteria
- repository telemetry can be refreshed asynchronously
- rate-limited errors are retried or deferred safely
- snapshots can support trending and historical movement

## Agent 3: Scoring and Quadrant

### Scope
- deterministic scoring formulas
- adoption momentum
- operational credibility
- quadrant coordinate computation
- movers and leaderboard logic

### Acceptance criteria
- formulas are config-driven
- score computation is reproducible
- quadrant labels are consistent by theme

## Agent 4: AI Brief Generation

### Scope
- prompt contracts
- structured generation
- validation
- caching
- cost controls

### Acceptance criteria
- output is schema-valid
- no unsupported factual claims are introduced
- retries and fallback behavior are defined

## Agent 5: API and Persistence

### Scope
- HTTP routes
- persistence layer
- auth boundaries
- workspace and user resource ownership

### Acceptance criteria
- search, detail, theme, compare, collection, and watchlist flows are API-backed
- stale data can enqueue worker refresh without blocking the user path excessively

## Agent 6: Frontend Experience

### Scope
- repository cards
- mobile grid-first flows
- detail panel or page
- theme pages
- compare UX
- quadrant desktop surface

### Acceptance criteria
- mobile remains compressed and non-overlapping
- result cards foreground interpretation before telemetry
- desktop supports rich exploration without visual clutter

## Agent 7: Platform and Deployment

### Scope
- Dockerfiles
- environment handling
- Cloud Run deployment configs
- scheduler and queue wiring
- observability

### Acceptance criteria
- services can deploy independently
- local development path is documented
- secrets and environment variables are explicit

## Agent 8: QA and Evaluation

### Scope
- contract tests
- integration tests
- visual regression
- mobile verification
- brief quality checks

### Acceptance criteria
- API contracts are testable
- mobile layouts are verified
- representative brief outputs are evaluated before release
