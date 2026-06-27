# GitHub Galaxy Observatory — Primary Goals

This document outlines the core objectives, architectural vision, and target capabilities of the **GitHub Galaxy Observatory** standalone application.

---

## 🌌 Core Objectives

The Observatory functions as a high-tech "Observatory HUD" and discovery dashboard for tracking the evolution of open-source software, particularly in the AI engineering space. It replaces static lists with a dynamic "observation deck" focused on velocity, developer health, and strategic categorization.

---

## 🎯 Primary Goals

### 1. Velocity over Volume (Rising Stars)
- Prioritize repositories based on **acceleration and momentum** rather than legacy star volume.
- Use a multi-dimensional weighted scoring system:
  $$\text{Score} = 5.0 \cdot \text{Star Velocity} + 2.0 \cdot \text{Commit Frequency} + 3.0 \cdot \text{Resolution Ratio}$$
- Differentiate active, growing codebases from dormant trending projects.

### 2. Sector Focus Classification
- Categorize every repository into one of three scopes:
  - **Enterprise Focus**: High-compliance, production-grade tools backed by corporate organizations (e.g., Microsoft, Google, OpenAI).
  - **Community Focus**: Shared, open-source collaborative guides, curated wikis, and collective learning projects.
  - **Individual Focus**: Lightweight developer playbooks, single-builder CLI utilities, and local workspace accelerators.

### 3. Quadrant Division (System Domains)
- Categorize projects by specific system quadrants of interest:
  - **Agents**: Autonomous loops, multi-agent frameworks, and execution tools.
  - **RAG & Knowledge**: Vector bases, semantic retrieval, and ingestion layers.
  - **Local & Open AI**: Local model servers, Apple Silicon MLX engines, and private fine-tuning.
  - **AI Coding**: IDE additions, sandboxed testing, and developer tools.
  - **Applied AI Products**: End-to-end open product implementations.

### 4. Interactive Observatory HUD Controls
- Provide a responsive visual dashboard where users can filter stars by sector focus, search target coordinates (keywords), and filter by quadrants.
- Clicking on any star badge instantly telescope-zooms into a side-panel displaying metrics progress bars (commits, resolution rate, stars).

### 5. Automated Radar Scanning
- Deploy daily automated scans via GitHub Actions that query active topics, score new candidates, automatically filter duplicates, and append top candidates to the galaxy.
- Include a live simulation scan console in the dashboard UI that allows manual sweeps, logging API diagnostic coordinates in real time.
