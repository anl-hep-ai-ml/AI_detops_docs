# Hardware-Aware AI Hackathon — June 15, 2026

**Event:** [Hardware-Aware AI Hackathon](https://indico.cern.ch/event/1693999/)  
**Date:** June 15, 2026  
**Location:** CERN  

---

## Presentation Notes

!!! tip "Jump to notes"
    - [**ATOM: Anomaly-detection on Time-series for Operation Monitoring**](Joaquin_Atom_Notes.md) — Joaquin Hoya & Walter Hopkins
    - [**Multi-Agent Systems for Scientific Analysis**](Azton_Agentic_Notes.md) — Azton Wells
    - [**CMS Next-Gen DQM: WisDQM & DQM Vision**](CMS_DQM_Notes.md) — Gabriele Benelli et al.
    - [**Anomaly Detection on SPT Observation Data**](SPT_Anomaly_Notes.md) — JJ & Wei

---

## Overview

This hackathon brought together teams working at the intersection of hardware-aware AI and detector operations. The event featured presentations on anomaly detection frameworks currently deployed in production, AI-assisted shift support tools, and architectural design principles for multi-agent scientific AI systems.

---

## Presentations

### [ATOM: Anomaly-detection on Time-series for Operation Monitoring](Joaquin_Atom_Notes.md)
**Presenters:** Joaquin Hoya & Walter Hopkins, Argonne National Laboratory

ATOM is a modular, model-agnostic Python framework for anomaly detection on ATLAS operational time-series data. The presentation covered the four-package pipeline (`pbeast_fetcher`, `data_preprocessing`, `ml_core`, `streaming_pipeline`), live 2026 deployment status, and real-world results — including the framework's detection of network cable faults that traditional threshold monitoring missed entirely.

---

### [Multi-Agent Systems for Scientific Analysis](Azton_Agentic_Notes.md)
**Presenter:** Azton Wells, Argonne National Laboratory

This talk presented MACosmo (Quarks2Cosmos Genesis Seed Team) and the design principles behind reliable multi-agent AI systems for scientific workflows. Key themes included atomic tool design, stateful MCP servers, avoiding LLM overinterpretation, and building reproducibility into the workflow via auto-generated Python scripts.

---

### [CMS Next-Gen DQM: WisDQM & DQM Vision](CMS_DQM_Notes.md)
**Presenters:** Gabriele Benelli, Juan Pablo Salas, Aron Soha, Samantha Sunnarborg, Jessica Tang, Martin Kwok, Sreevani Jarugula — University of Wisconsin-Madison, Fermilab, Brown University, University of Nebraska-Lincoln

Two complementary tools for AI-assisted Data Quality Monitoring at CMS: WisDQM, an agentic RAG chatbot already deployed at Fermilab for shift support, and ngDQM, an automated plot-grading pipeline benchmarking open-weight vision-language models (Gemma4-31b emerging as the strongest performer).

---

### [Anomaly Detection on SPT Observation Data](SPT_Anomaly_Notes.md)
**Presenters:** JJ & Wei

Application of TranAD transformer-based anomaly detection to South Pole Telescope calibrator observation data (~11,000 TES detectors). TranAD recovered all anomalies found by the traditional SNR threshold method and additionally caught localized hardware events (CryoBoard-related) that the SNR approach missed entirely.
