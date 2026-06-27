# Product Schema

## Canonical Product Entities

### Repository
Primary identity for a GitHub repository tracked by the system.

Core fields:
- `id`
- `owner`
- `name`
- `full_name`
- `html_url`
- `description`
- `homepage_url`
- `license_spdx`
- `primary_language`
- `archived`
- `fork`
- `created_at`
- `updated_at`
- `pushed_at`

### Repository Snapshot
Point-in-time telemetry capture.

Core fields:
- `repository_id`
- `captured_at`
- `stargazers_count`
- `forks_count`
- `open_issues_count`
- `watchers_count`
- `default_branch`
- `commit_count_30d`
- `commit_count_90d`
- `contributors_30d`
- `release_count_180d`
- `issue_close_rate_30d`

### Repository Brief
Human-facing recommendation artifact.

Core fields:
- `repository_id`
- `generated_at`
- `theme`
- `why_it_matters`
- `best_for`
- `not_ideal_for`
- `maturity_summary`
- `adoption_summary`
- `operational_summary`
- `integration_readiness`
- `agent_relevance`
- `watch_outs`
- `confidence`
- `evidence_summary`

### Repository Scorecard
Deterministic scoring artifact.

Core fields:
- `repository_id`
- `computed_at`
- `adoption_momentum`
- `operational_credibility`
- `documentation_clarity`
- `integration_readiness_score`
- `agent_friendliness`
- `enterprise_fit`
- `maintainer_continuity`
- `experimentation_velocity`

### Quadrant Position
Theme-specific repository positioning.

Core fields:
- `repository_id`
- `theme_slug`
- `computed_at`
- `quadrant_x`
- `quadrant_y`
- `quadrant_label`
- `movement_x`
- `movement_y`
- `movement_label`

### Theme
Curated discovery category.

Core fields:
- `slug`
- `name`
- `description`
- `jobs_to_be_done`
- `status`

### Collection
User or editorial shortlist.

Core fields:
- `id`
- `workspace_id`
- `owner_user_id`
- `title`
- `summary`
- `visibility`

### Watchlist
Saved monitoring surface.

Core fields:
- `id`
- `workspace_id`
- `owner_user_id`
- `name`
- `alert_policy`

## Contract Priorities

The first implementation must stabilize contracts for:

1. repository brief
2. repository scorecard
3. quadrant position
4. search result item
5. theme page payload

## Search Result Shape

Each search result should eventually contain:

- repository identity
- short `why_it_matters`
- `best_for`
- two or three high-signal metrics
- quadrant label
- one caution or trust badge
- freshness timestamp

## AI Output Rule

AI-generated fields must be:

- structured
- validated
- attributable to deterministic evidence
- storable for later reuse

Free-form prose without schema enforcement should not remain the core product contract.
