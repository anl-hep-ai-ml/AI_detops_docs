# Multi-Agent Systems for Scientific Analysis
**Presenter:** Azton Wells, Asst Computational Scientist, Computational Sciences Division
**Event:** Hardware Aware AI Hackathon, June 15, 2026
**Topic:** Architecture and design principles for building reliable multi-agent AI systems, with applications to scientific workflows and detector operations
**System presented:** MACosmo (Quarks2Cosmos Genesis Seed Team)

---

## 1. Why Multi-Agent Systems?

### The Core Problem with Single-Agent LLMs
- The instinct when using LLMs is to give them everything and ask them to solve it in one prompt — this fails at scale.
- Modern LLMs have very long context windows (1M+ tokens), but **they don't use long context efficiently.** Feeding 500K tokens produces worse results than feeding a targeted 10K tokens.
- Multi-agent systems solve this by breaking work into focused sub-tasks, each receiving only the information it needs.

### Key Benefit
Rather than one agent seeing everything and doing everything sequentially, a multi-agent system routes specific information to specialized agents — each working on a narrow, well-defined task.

### Concrete Motivating Example: Claude vs. Dr. MACS
Given the same prompt — "retrieve quasar data from SDSS DR17 within a 10-degree radius of RA=180, Dec=30, create a histogram of redshift distribution, and determine if there are statistically significant overdensities" — the two approaches produced very different results:

- **Claude (single agent):** Generated **mock data** (1,000 fake quasars), created a histogram, and reported 3 significant overdensities at z=1.15, 1.25, and 3.15 — with no warnings that it fabricated the data.
- **Dr. MACS (MACosmo):** Retrieved actual SDSS DR17 data, ran a Poisson test with Bonferroni correction, and found **1 real significant overdensity at z=0.039** — with full attribution to the data source.

The single-agent approach produced a plausible but completely wrong answer with no warnings. This is the core motivation for bespoke agent systems in scientific analysis.

---

## 2. System Architecture

**MACosmo** is organized around a **supervisor + specialized agents** pattern:

```
Input Query
    │
    ▼
Supervisor Agent ◄─────────────────────────── Retry Advisor Agent
    │                                                  ▲
    ├──► Plan Creation ◄──► Arxiv Agent                │
    │         │         ◄──► Simulation Summarizer      │
    │         │         ◄──► Dynamic Tool Registry      │
    │         ▼                                         │
    │    Plan Approval (human-in-the-loop) ─────────────┘
    │         │
    │         ▼
    │    Plan-based Routing
    │         │
    │         ├──► Data Retrieval Agent
    │         ├──► Cosmo Agent (Analysis)
    │         └──► Viz Agent
    │
    └──► Synthesis Agent ──► Response Report
```

### Plan Creator
- Receives the query, available tools, background context (e.g., from the Arxiv Agent), and creates a **plan of atomic steps**.
- Plans can be 100+ steps for complex scientific analysis workflows.
- Each step is a single tool call — one operation, one result.
- **Human in the loop:** After plan creation, a human can review and approve or modify the plan before execution begins (e.g., "don't do that at redshift 5, do it at redshift 2").
- A **Retry Advisor Agent** handles failed steps and routes them back to the supervisor for re-evaluation.

### Synthesis Agent
- Sees only the **resulting state** of the workflow — the output of tool calls, not the full context.
- Deliberately siloed: it knows what data came out of each tool call, but doesn't know the full problem context.
- "Synthesis is informative, not definitive" — interpretation stays with the scientist.
- This prevents it from over-interpreting results.

---

## 3. Design Principles

### 3.1 Atomic Tools
- Each tool accomplishes **exactly one job** with no side effects outside the tool.
- "Atomic" doesn't mean simple — a tool could run a multi-day cosmological simulation. It means: one set of inputs in, one defined result out, no ambiguity.
- Avoid glue logic between tools: when a tool returns a result, it should either be directly interpretable or hand directly into the next tool.

### 3.2 Avoiding LLM Overinterpretation
- LLMs will try to tell you what results *mean* — this is often wrong and unwanted in scientific settings.
- The system is designed to return **factual outputs only**: averages, means, standard deviations, counts — not interpretations.
- Interpretation stays with the scientist.
- This was enforced through **very explicit system prompts** and by limiting what the synthesis agent is exposed to.

### 3.3 Stateful MCP Servers
- State (file paths, intermediate data, retrieved papers) is stored in the MCP server, not passed through the LLM.
- LLMs are unreliable at remembering and accurately passing information between steps — don't let them.
- If a paper is used in a plan, its reference is written to an intermediary file immediately — the LLM is not trusted to remember it.

### 3.4 Reproducibility
- The system composes all tool calls from a workflow into a single **Python script** as output.
- This script can be taken off the system (e.g., run on a supercomputer cluster like Polaris at ALCF) to reproduce or scale the analysis to full data.
- Effectively acts as a **prototype-to-production pipeline**.

---

## 4. Tooling and Benchmarking

### Tools
- The current system has approximately **85 tools** spanning:
  - Data access (built by a separate team with MCP compatibility in mind)
  - Common data analysis operations
- Building the tool library took approximately **one month**. Building the agent system itself took about **one week**.
- Benchmarking and validation took **months** — this is the dominant cost.

### Benchmarking
- A **CosmicEvaluator** with 33 validated questions serves as ground truth.
- Assembling these questions required significant manual effort — not easily scalable.
- Validated by comparing workflow outputs to known answers.

---

## 5. Human-in-the-Loop Design

Two checkpoints where humans can intervene:

1. **Plan approval** — after the plan creator generates a plan, a human can review, reject, or modify it before execution.
2. **Follow-up queries** — after a workflow completes, the MCP server retains the state, allowing follow-up questions that trigger additional operations on the same data without restarting.

---

## 6. Discussion: Application to Operations and Anomaly Detection

### Anomaly Detection Use Case
- Multi-agent systems map naturally to anomaly detection: each model (TranAD, K-means, etc.) becomes a **tool**, and a supervisor agent can choose which tool to call based on data characteristics.
- Example: an agent could inspect data distribution (seasonal patterns, trends), decide which anomaly detection approach is most appropriate, call that tool, and return results.
- This ties directly to the ATOM framework discussed earlier in the session.

### MCP Servers for Operations Data
- Several attendees are building MCP servers on top of existing web APIs for operations data (LHC fill information, instantaneous luminosity, trigger menus, pile-up conditions, etc.).
- If an API is well-documented, an MCP server can be built quickly and the agent can generate tools from the API documentation automatically.
- **Key concern raised:** Very long API calls (e.g., querying a 28-hour run at 23-second granularity) can time out or fail — chunking and pagination strategies are needed.

### Validation for Operations
- Shifters and operators need to **trust** the output — citing the raw API link (not just the result) allows validation of intermediate steps.
- Suggestion: tools should return links or references alongside results so users can verify what the tool actually fetched.

### Tool Count and Context
- Experience suggests that having too many tools in context degrades performance — the agent loses track of what's available.
- Keeping tool sets **focused and limited** per agent role is important in practice.

---

## 7. Key Takeaways

1. **Break everything into atomic steps** — the smaller and more focused each tool is, the more reliably agents compose them.
2. **Don't trust LLMs with state** — use stateful MCP servers to pass data and file paths; let the LLMs do reasoning, not memory.
3. **Constrain interpretation** — explicit instructions and architectural silos (synthesis agent sees only outputs, not full context) prevent overinterpretation.
4. **Front-load validation effort** — building the agent system is fast; building benchmarks and validating tools is where the real time goes.
5. **Human in the loop at the plan level** — plan approval catches bad decisions before expensive tool calls are made.
6. **Reproducibility is built-in** — generating a Python script from the tool call sequence means results can always be reproduced or scaled independently.

---

## 8. Related Publications (in preparation)

- *Evaluating agent systems in cosmological data analysis* — Al Wells et al., in prep, 2026
- *Cosmological analysis with agent systems* — Coburn et al., in prep, 2026
- *A Tale of Two Teams* — Al Wells et al., in prep, 2026
