# Service Boundaries

## Overview

The system should be implemented as three primary runtime surfaces inside the same repository.

1. web application
2. API service
3. worker service

## Web Application

### Responsibilities
- render search and theme exploration UI
- render repository cards and detail views
- render compare workflows
- render quadrant and leaderboard experiences
- manage user sessions and client state

### Non-responsibilities
- direct GitHub API calls in production architecture
- score computation
- repository brief generation
- long-running enrichment

## API Service

### Responsibilities
- expose product-facing endpoints
- authenticate users and workspaces
- validate contracts
- query Postgres
- serve cached repository intelligence
- enqueue enrichment work when data is stale

### Core endpoints
- `/v1/search`
- `/v1/repositories/:owner/:repo`
- `/v1/repositories/:owner/:repo/compare`
- `/v1/themes/:slug`
- `/v1/themes/:slug/quadrant`
- `/v1/leaderboards/:kind`
- `/v1/collections`
- `/v1/watchlists`

### Non-responsibilities
- background crawling loops
- long inference tasks inline with user request paths

## Worker Service

### Responsibilities
- fetch GitHub data
- normalize telemetry
- compute repository scores
- compute quadrant positions
- call AI brief generation
- generate leaderboard snapshots
- evaluate alert triggers

### Non-responsibilities
- serving end-user HTTP traffic directly

## Shared Packages

### `schemas`
- request and response types
- entity schemas
- validation rules

### `scoring`
- deterministic scoring logic
- weight configuration
- quadrant math

### `github-client`
- REST and GraphQL adapters
- rate limit handling
- normalization helpers

### `ui`
- reusable presentation components once the app structure matures

## Boundary Rules

1. shared packages must not depend on app-specific runtime state
2. API and worker should depend on schemas, not duplicate them
3. AI output must be validated before persistence
4. quadrant and score math should live in deterministic shared code
5. frontend must consume API responses as contracts, not reconstruct business logic
