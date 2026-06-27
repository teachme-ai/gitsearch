# Infrastructure and Deployment

## Primary Objective

The infrastructure should be:

- serverless-first
- low idle cost
- container-based
- easy to run for SaaS
- portable for client-hosted deployments

## Recommended Default SaaS Stack

### Frontend
- static React build
- hosted on Firebase Hosting or Cloudflare Pages

### API
- Cloud Run service

### Worker
- Cloud Run Jobs or Cloud Run service triggered from queue

### Database
- Postgres

Recommended decision:
- if strict all-Google Cloud is required, use Cloud SQL Postgres
- if lowest early-stage idle cost matters most, evaluate Neon or Supabase Postgres

### Queue
- Cloud Tasks for targeted work dispatch
- Pub/Sub if broadcast or event fan-out becomes important

### Scheduler
- Cloud Scheduler

### Secrets
- Secret Manager

### Storage
- Cloud Storage

## Why This Shape Fits The Product

- Cloud Run keeps idle compute cost low
- background work can scale independently from request traffic
- the same services can ship as containers for client deployments
- the platform can stay lightweight until watchlists, exports, and enterprise workflows increase load

## Container Delivery Requirements

Every deployable service should have:

- Dockerfile
- health check behavior
- environment variable contract
- startup command
- stateless runtime behavior where possible

## Client-Hosted Deployment Goal

The product should later support:

- customer-managed API container
- customer-managed worker container
- customer-managed frontend container or static hosting
- customer-provided database and model credentials

This means the application code should avoid deep coupling to SaaS-only infrastructure assumptions.

## Cost Discipline Rules

1. do not add Redis before we prove it is required
2. do not keep always-on workers unless traffic or SLAs justify it
3. precompute heavy intelligence asynchronously
4. keep AI generation cached and reusable
5. separate user-facing latency-sensitive paths from expensive background processing

## Infrastructure Decision Summary

### Best all-GCP path
- frontend hosting
- Cloud Run API
- Cloud Run worker
- Cloud SQL Postgres
- Cloud Scheduler
- Cloud Tasks or Pub/Sub
- Secret Manager
- Cloud Storage

### Best low-idle-cost path
- frontend hosting
- Cloud Run API
- Cloud Run worker
- Neon or Supabase Postgres
- Cloud Scheduler
- Cloud Tasks
- Secret Manager
- Cloud Storage

Both paths should be supported by the same codebase.
