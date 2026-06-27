# Delivery Roadmap

## Implementation Order

The system should be implemented in the following order so multi-agent work remains coordinated.

## Milestone 1: Contracts and Target Structure

### Goals
- stabilize schemas
- define service boundaries
- define target repo shape
- define deployment topology

### Why first
Without this, lower-cost agents will produce incompatible code and duplicate assumptions.

## Milestone 2: Backend Foundation

### Goals
- stand up typed API service
- stand up Postgres-backed persistence
- create GitHub client adapter
- introduce worker job entry points

### Exit criteria
- frontend can request structured repository results from a real API

## Milestone 3: Repository Card Productization

### Goals
- replace loose result summaries with structured repository briefs
- add scorecard fields
- add quadrant labels
- add theme-aware payloads

### Exit criteria
- result cards explain why a repository is worth attention

## Milestone 4: Mobile and Desktop Product Surfaces

### Goals
- mobile grid-only discovery
- strong detail view hierarchy
- desktop quadrant surface
- leaderboard and theme pages

### Exit criteria
- both mobile and desktop feel intentional rather than stretched from the same layout

## Milestone 5: Sticky Workflows

### Goals
- compare
- collections
- watchlists
- alerts

### Exit criteria
- users can return to prior decisions and monitor movement

## Milestone 6: Platformization

### Goals
- public API
- workspace features
- exports
- client-hosted container packaging
- MCP later

### Exit criteria
- the intelligence layer is consumable beyond the web app

## Work Sequence Rule

Before any major UI or worker implementation begins, the high-reasoning layer should approve:

- the schema
- the scoring formula outline
- the API shape
- the deployment boundary
