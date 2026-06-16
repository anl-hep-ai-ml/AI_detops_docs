# CMS Next-Gen DQM: WisDQM & DQM Vision
**Presenters:** Gabriele Benelli, Juan Pablo Salas, Aron Soha, Samantha Sunnarborg, Jessica Tang (WisDQM) · Martin Kwok (UNL), Sreevani Jarugula (FNAL) (DQM Vision)
**Institutions:** University of Wisconsin-Madison, Fermilab, Brown University, University of Nebraska-Lincoln
**Event:** Hardware-Aware AI Hackathon, June 15, 2026
**Topic:** AI-assisted Data Quality Monitoring for the CMS experiment — an agentic RAG chatbot for shift support (WisDQM) and automated plot grading using open-weight vision-language models (ngDQM)
**Framework:** Archi ([github.com/archi-physics/archi](https://github.com/archi-physics/archi), arXiv:2606.04755)

---

## Part 1: WisDQM Progress Report

---

## 1. What is WisDQM?

**WisDQM** is an **agentic RAG (Retrieval-Augmented Generation) chatbot** designed to assist shifters at the CMS experiment during detector operations.

The core architecture:
- A shifter submits a **request** to an LLM.
- The LLM calls **tools** (retrieve, run code) to interact with its **environment** (files, database, web).
- The LLM iterates until it produces a **response**.

The system is built on the **Archi** framework and is accessible at `wisdqm.fnal.gov` via SSO login. Key advertised capabilities:
- **Searchable knowledge** — scans documentation, tickets, and local resources
- **Focused chat** — context and follow-ups in one workspace
- **Actionable outputs** — summaries, snippets, next steps
- **Configurable workflows** — adaptable models, tools, and sources

---

## 2. Deployment Timeline

WisDQM is deployed using a customization of the **Archi framework** at **Fermilab's Elastic Analysis Facility (EAF)** using **Helm Charts on Kubernetes**.

| Period | Milestone |
|---|---|
| February 2026 | First WisDQM agent created with help of Archi developers; knowledge base consists of Online DQM Twikis |
| April 2026 | WisDQM goes live at FNAL ROC for DQM shifters; feedback collection begins; run coordination tool implemented |
| May 2026 | Expanded to Online Trigger and Offline Tracker DQM shifts; knowledge base includes shifter docs. *(Note: database reset incident occurred in May)* |
| June 2026 | Dedicated OMS (Online Monitoring System) Agent added; Archi gains access to OMS MCP at CERN and dedicated OMS chatbot given to ROC shifters |

---

## 3. System Architecture in Context

WisDQM sits inside a broader **Agentic AI** layer for CMS DQM operations:

```
Inputs                           Agentic AI                    Users
──────────────────────────────────────────────────────────────────────
DQM Histograms ────────────► PlotDiff Model ──► ChatBot LLM ──► DQM Shift Taker
Reference Histos + Twikis ──►                        │               │
Run Metadata ───────────────► Anomaly Collector ──►  │          Subsystem Experts
Anomaly algo 1…N ──────────►                    Reports/Prompts ◄─ Elogs,
                                                                   instructions,
                                                                   training docs
```

Future upgrade: a foundation model trained on multi-modal Elogs, Twikis, training docs, and conditions data.

---

## 4. Shifter Feedback

Approximately **12 shifters** across all three shift types (Online DQM, Online Trigger, Offline Tracker DQM) provided feedback over one month via the Archi framework and a shared Google Doc.

### What's Working
- **Twiki access and understanding is basic but saves time** — even simple Q&A against documentation is valued.
- *"It gave a useful answer and saved me some time!"* — experienced Online DQM shifter

### Common Problems
- Extraneous formatting and verbosity in responses
- Pasting fake links or instructions for UI elements the system doesn't yet have access to
- Pulling from the LLM's inherent (pre-trained) knowledge rather than the provided knowledge base

### Identified Gaps (Shifter Needs)
- Access to **live data or run information** during shifts
- Understanding of the **structure of CMS user interfaces** (DQM GUI, etc.)
- Ability to **paste screenshots or links to plots** for visual analysis

---

## 5. Current Developments

### 5.1 OMS MCP Integration
- The **Online Monitoring System (OMS)** MCP server is being integrated into WisDQM.
- A dedicated OMS agent chatbot is already deployed for ROC shifters (as of June 2026).

### 5.2 Benchmarking
- **Prompt grading:** evaluating quality of retrieved documents and generated prompts
- **Offline grading:** structured evaluation against known-good answers

### 5.3 Documentation Metadata Expansion
- Adding **document type metadata** to the knowledge base to enable **agent prioritization and restriction** (i.e., route certain query types to specific knowledge sources).

### 5.4 Knowledge Graph (OKG)
- Building an **ontology-based knowledge graph** to better structure relationships between CMS documentation, procedures, and subsystem concepts.

---

## 6. Future Plans and Integrations

Planned new tools and data access (API/MCP):
- **Shiftlist and Elogs** (with anonymization for privacy)
- **Run Registry**
- **DIALS** — per-lumisection-harvested DQM plots, primary interface for anomaly detection
- **DQM GUI**
- **Mattermost** (internal CERN messaging service)
- Admin tools for monitoring shifter usage and collecting feedback
- Tools to **run anomaly detection algorithms** directly (if not covered by DIALS MCP)
- Integration of **vision models** for plot analysis

---

## Part 2: DQM Vision — Automated Plot Grading with LLMs

---

## 7. Problem Statement and Overall Goal

The most time-consuming part of a DQM shifter's job is **comparing ~220 plots against their corresponding text instructions and reference images**, periodically throughout a shift.

**Goal:** Build a tool to reduce shifter burden and eventually **fully automate the DQM shift**.

### Approach
- Use a **RAG + prompt** setup to feed each plot, its Twiki text instructions, and a reference image to an LLM.
- The LLM outputs a **Good / Bad / Action** classification.
- Current phase: benchmarking different LLM models to identify the best candidate.

### Pipeline Overview

```
Twiki (Text Instructions + Reference Image)
            │
            ▼
           RAG  ◄────── Plots (current run)
            │
            ▼
        LLM Model
            │
            ▼
    Good / Bad / Action
```

---

## 8. Experimental Setup

The setup has four main "movable parts," each representing a dimension of exploration:

| Component | Variable | Current Strategy |
|---|---|---|
| **Inputs** | Which plots, runs, good/bad, run type, 1D vs 2D | Fixed representative test case |
| **Models** | Model family, model size | **Primary target** — varied |
| **RAG** | Captions, reference quality | Fixed |
| **Prompts** | Prompt wording | Fixed |

### Prompt Design
The same prompt is used for every plot (for now). Two simplifications were made for the initial benchmark: the prompt does not name the specific input plot and does not point to the exact instructions file.

The prompt instructs the model to produce **4 structured sections**:
1. Quote the relevant section of instructions for the input plot
2. Describe the input plot
3. Compare the input plot to the instruction
4. Decide if the plot is good or bad

### Test Plot: L1T-00-EcalOcc
The benchmark test plot is the **ECal TP ET-weighted Occupancy at Layer 1** (a 2D histogram in iEta × iPhi space). The human-readable quality criterion is simple: *"The plot should be completely filled without big white areas. Any white area larger than two neighboring pixels must be reported."*

---

## 9. Models Evaluated

Focus is on **open-weight models** (closed-weight is possible but requires additional infrastructure effort). Six models were tested spanning two families and two size ranges:

| Model | Size | Latency (s) |
|---|---|---|
| `qwen2.5vl:latest` | 7b | 17 |
| `qwen2.5vl:32b` | 32b | 38 |
| `qwen3-vl:latest` | 8b | 98 |
| `litellm-ow.qwen/qwen3.6` | 35b | 45 |
| `gemma3:latest` | 4b | 14 |
| `litellm-ow.google/gemma4-31b` | 31b | 51 |

*Note: latency figures include model loading time onto GPU and will be improved.*

---

## 10. Benchmark Results

Each model was graded on 4 criteria (Instructions quote, Plot description, Comparison to instructions, Final decision):

| Model | Instructions | Description | Comparison | Decision |
|---|---|---|---|---|
| qwen2.5vl:latest (7b) | ✗ | ✗ | ✗ | ✓ |
| qwen2.5vl:32b (32b) | ✗ | ✓ | ✓ | ✓ |
| qwen3-vl:latest (8b) | ✗ | ✗ | ✗ | ✗ |
| qwen/qwen3.6 (35b) | ✓ | ✓ | ✗ | ✗ |
| gemma3:latest (4b) | ✗ | ✗ | ✗ | ✓ |
| gemma4-31b (31b) | ✓ | ✓ | ✓ | ✓ |

### Notable Observations
- **Gemma4-31b** is the strongest performer — correctly quotes instructions, describes the plot accurately (correct iEta range), compares correctly against criteria, and reaches the right decision.
- **Qwen3.6 (35b)** shows potential: correctly quotes instructions and describes the plot, but the comparison step fails (flagged the expected central gap at iEta=0 as an anomaly when it is actually a known detector geometry artifact).
- **All models** struggled to locate the *exact* instruction text — they either paraphrase or hallucinate the relevant section. This points to a **prompt or RAG improvement** being the highest-leverage next step.
- **Qwen3-vl:latest (8b)** performed worst overall — very slow (98s) and failed every criterion.
- Smaller models (gemma3 7b, qwen2.5 7b) can sometimes reach the correct final decision even when intermediate reasoning is wrong — lucky guessing is a concern for evaluation.

### Common Failure Mode: The Central Gap
Several models incorrectly flagged the **expected vertical white gap at iEta=0** (a known ECal detector geometry feature — the beam pipe) as a bad-plot anomaly. This is a physics domain knowledge issue that better prompting or reference context may resolve.

---

## 11. Next Steps

- **Better prompt:** clarify what "instruction" means; potentially include PDF source directly
- **Explore input variations:** different plots, run types, 1D vs 2D histograms
- **Improve RAG:** better captions and more precise document references
- **Add agentic components:**
  - LLM-generated summary of results instead of per-plot human review
  - Orchestration layer for multi-plot workflows
- **Integration with Archi** — connect ngDQM capabilities into the WisDQM deployment at Fermilab

---

## 12. Key Takeaways

1. **WisDQM is live and useful** — deployed at Fermilab EAF, used during CMS Run 3 operations; shifters find it saves time even in its current basic form.
2. **RAG grounding is critical** — the most common failure mode across both WisDQM and the model benchmarking is the LLM ignoring the knowledge base and using its own (often wrong) training knowledge.
3. **Gemma4 leads among open-weight vision models** for plot-grading tasks; qwen3.6 (35b) is a promising alternative.
4. **Prompt quality is the dominant bottleneck** — all 6 models struggled to accurately quote the correct instructions section, suggesting the prompt needs to be more explicit about what "instructions" refers to.
5. **Archi as common infrastructure** — both WisDQM and ngDQM are converging toward the Archi framework as a shared deployment platform, enabling shared tool development (OMS MCP, DIALS, etc.).
