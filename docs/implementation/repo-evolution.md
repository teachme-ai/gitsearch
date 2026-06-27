# Repository Evolution Plan

## Position

This repository remains the primary product repository.

We are not starting a second codebase. We are transforming this one from an exploratory app into a production system.

## Current State

### Existing assets worth preserving
- `src/App.jsx`: current discovery UX and ranking presentation logic
- `src/App.css`: evolving product UI and responsive behavior
- `api/search.js`: first backend proxy boundary
- `api/explain.js`, `api/parse.js`, `api/enrich.js`: early enrichment concepts
- `scripts/`: utility workflows and migration helpers
- `PRODUCT_PRD.md`: product strategy and roadmap

### Current limitations
- frontend and product logic are tightly coupled
- backend contracts are implicit
- no durable database-backed product model
- no worker boundary for long-running enrichment
- no typed schema layer
- no explicit deployment topology

## Target Repository Shape

The preferred end state for this same repository is:

```text
apps/
  web/
  api/
  worker/
packages/
  schemas/
  scoring/
  github-client/
  ui/
docs/
  implementation/
infra/
```

## Migration Mapping

### Frontend
Current:
- `src/`

Target:
- `apps/web/`

Migration note:
- move after API contracts and shared schema package exist

### Experimental serverless handlers
Current:
- `api/`

Target:
- `apps/api/`
- selected logic split into `apps/worker/`
- shared logic extracted into `packages/`

Migration note:
- first preserve behavior
- then replace ad hoc handler logic with typed routes

### Scripts
Current:
- `scripts/`

Target:
- one-off operational scripts remain in `scripts/`
- reusable pipeline logic moves into worker modules or shared packages

## Refactor Order

1. define schemas and service boundaries
2. introduce TypeScript-capable structure
3. build real API contracts
4. move enrichment into worker jobs
5. connect frontend to API-only flows
6. split reusable logic into packages
7. move to the final folder layout

## Retain vs Replace

### Retain
- UI direction and interaction patterns already tested with users
- search concepts
- mobile learnings
- product vocabulary

### Replace or restructure
- in-browser enrichment logic
- untyped response handling
- direct dependence on experimental serverless functions as the long-term system shape

## Rule For Agents

Agents should treat current code as:

- valid starting material
- not sacred line-by-line architecture
- valuable product evidence

The mission is to evolve it, not discard it.
