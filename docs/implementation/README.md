# Implementation Pack

This folder is the execution contract for turning the current repository into the full product.

The existing repository remains the central codebase. We are not forking away from it. We are evolving it from:

- a Vite frontend in `src/`
- an experimental serverless `api/` layer
- local scripts in `scripts/`

into a production system with:

- a stable product schema
- a stateless API service
- an asynchronous enrichment worker
- a durable data model
- a deployment topology optimized for low idle cost
- a clean structure for lower-cost implementation agents

## Documents

- `system-architecture.md`: target platform shape and runtime topology
- `repo-evolution.md`: how the current repository maps into the future structure
- `service-boundaries.md`: service responsibilities and interfaces
- `product-schema.md`: canonical entities and response contracts
- `agent-work-orders.md`: multi-agent execution split
- `delivery-roadmap.md`: implementation order and milestones
- `infra-deployment.md`: serverless and container deployment guidance

## Working Rules

1. The current repo is the source of truth.
2. New code should move toward the target structure without breaking the working product.
3. Deterministic telemetry comes before AI interpretation.
4. Mobile constraints are product constraints, not polish tasks.
5. Lower-cost agents implement against the contracts defined here.
