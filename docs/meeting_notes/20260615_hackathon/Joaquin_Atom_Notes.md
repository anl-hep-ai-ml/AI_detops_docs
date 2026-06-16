# ATOM: Anomaly-detection on Time-series for Operation Monitoring
**Presenters:** Joaquin Hoya & Walter Hopkins, Argonne National Laboratory
**Event:** Hardware-Aware AI Hackathon, June 15, 2026
**Topic:** ATOM – a modular, hackable, model-agnostic & data-agnostic Python framework for anomaly detection on ATLAS operational time-series data
**Contributors:** Kevin Stehle, Walter Hopkins, Giuseppe Avolio, Antoine Marzin, Mario Campanelli, Lukas Vicenik, Andre Sopczak

---

## 1. Background and Motivation

- Project started in late 2023/early 2024, originating from work by Kevin Stehle (DeepHYDRA project) and Antoine Marzin (AnomalyDetectionTDAQ project).
- When Kevin left, the team took over with the goal of building a general anomaly detection framework for the ATLAS T-DAQ (Trigger and Data Acquisition) system.
- A parallel group working on Level-1 central trigger anomaly detection at ATLAS was doing similar work, which motivated creating a **shared, common framework**.
- Key requirement: the framework needed access to **streaming live data** in time for the **2026 data-taking run** (a five-year gap follows before the next major data-taking period).

---

## 2. ATOM Framework Overview

ATOM is a set of **four independent, pip-installable Python packages** that connect into an end-to-end pipeline, configurable via YAML with MLflow integration:

| Package | Purpose |
|---|---|
| `pbeast_fetcher` | Retrieves ATLAS time-series from PBeast via the Beauty library |
| `data_preprocessing` | Pipeline for filtering, normalizing, imputing, and reducing data |
| `ml_core` | Training and inference classes with ~15 ML models and MLflow integration |
| `streaming_pipeline` | End-to-end: fetch → preprocess → inference |

### Key Design Principles
- Fully configurable via **YAML files** — users define data sources, preprocessing steps, and models without modifying core code.
- **Hackable/extensible** — new preprocessing functions or models can be added by simply defining a class with standard methods (`forward`, `prepare_batch`, `compute_loss`) and it integrates automatically.
- Data source agnostic in principle — while currently built around ATLAS's PBeast database, any data source can be plugged in before `data_preprocessing` and the rest of the pipeline continues unchanged.

---

## 3. Framework Components in Detail

### 3.1 Data Fetching (`pbeast_fetcher`)
- ATLAS operational data is stored in **PBeast**, accessed via the **Beauty** library.
- Users define which data sources to fetch in a `sources.yaml` config file.
- The `PBeastFetcher` class supports four fetch modes: by **run**, **date range**, **GRL** (Good Run List), or **live stream**.
- To use a non-PBeast data source, simply plug it in before the preprocessing stage — no other changes needed.
- **Data alignment challenge:** Different ATLAS applications publish data at different times, so the framework includes logic to align all features to a common time grid, including handling gaps when applications haven't published recently.

### 3.2 Data Preprocessing (`data_preprocessing`)
- Composable pipelines defined in YAML or code using `PreprocessingPipeline` and `OnlinePreprocessor` classes.
- Available step types: **Transformers**, **Filters**, **Normalizers**, **Imputers**, **Reducers**.
- Examples: `filter_low_rate`, `normalize_all_by_column`, `filter_nan_rows`, `normalize_by_pileup`, `reduce_to_rack_stats`.
- Pre-processing was found to be **critical** to model performance — as much as the model architecture itself.

### 3.3 Model Core (`ml_core`)
- ~15 models available out of the box, organized by family:

| Family | Models |
|---|---|
| Transformer | TranAD, GroupedTranAD, TranAD_Basic, TranAD_Transformer, TranAD_Adversarial, TranAD_SelfConditioning |
| LSTM | LSTMAutoencoder, LSTM_AD, LSTM_Univariate |
| Autoencoder | USAD, DAGMM, CAE-M |
| Other | MSCRED, OmniAnomaly, MAD-GAN, GDN |

- **Bring your own model:** implement 3 methods — `forward`, `prepare_batch`, and `compute_loss` — and it plugs in automatically (built on PyTorch).
- **MLflow integration** (`MLFlowTracker`) tracks all experiments, hyperparameters, model versions, and training curves — essential for knowing which model version is running in production.
- Supports both `OfflineInference` (batch evaluation) and `BatchStreamingInference` (online/streaming).

### 3.4 Streaming Pipeline
- Runs continuously on a virtual machine (CERN OpenStack).
- Starts and stops based on data availability (e.g., stops when no stable beam, resumes when a new run begins).
- Output is stored in a **TimescaleDB** (PostgreSQL) database and visualized in **Grafana** dashboards in real time.

---

## 4. Use Cases and Results

### 4.1 DCM Farm Anomaly Detection (High-Level Trigger)
- The ATLAS High-Level Trigger (HLT) runs on a software farm of ~2,000 nodes called **Data Collection Managers (DCMs)**.
- Input data: input rates from all 2,000 DCM nodes, sampled every 5 seconds.
- **Feature reduction:** Instead of feeding all 2,000 raw rates, the median and standard deviation across racks are computed — reducing to ~51 medians and ~51 standard deviations (~102 total features).
- The custom ATLAS model used here is called **GroupedTranAD**: two separate TranAD instances run independently on each group (medians and std devs), then their x1 and x2 outputs are concatenated before computing a joint loss.
- Results showed significantly improved anomaly detection after careful preprocessing: removing detector busy periods, vDM scans, and **normalizing with respect to pileup**.

### 4.2 Level-1 Trigger Anomaly Detection *(Antoine Marzin)*
- Uses correlated time-series from Level-1 Central Trigger online monitoring as inputs (Primary Physics Items: muons, electrons, MET before prescale, after Busy+Deadtime veto, plus muon rate in Barrel, End-Cap, and Forward for side-A and side-C — 35 features total).
- Model: LSTM layers predicting the next luminosity block based on the previous 5 LBs.
- All available models were also tested **out of the box with zero tuning** for comparison.
- **Real-world result (2025):** The rate of **L1_XE500** (missing energy trigger) jumped from ~1 Hz to >10 Hz on 11 June. The anomaly detection algorithm was the **only system** that flagged it; a fix was applied at ~11:00 AM.
- In 2026 deployment, the model was trained on almost all 2025 GRL runs and successfully generalized to 2026 pp runs.
- **Planned improvements:**
  - Investigate more advanced models and scale up with more features
  - Add **incremental learning** to include new runs without full retraining
  - Investigate **Reinforcement Learning** based on feedback from shifters and experts
  - **Interface to LLM** and other databases

---

## 5. TranAD Model Architecture

TranAD is a **transformer autoencoder with two-phase adversarial self-conditioning** for reconstruction-based anomaly detection on multivariate time series:

- **Phase 1 (learn normal reconstruction):** Input window `[10, batch, N_features]` with positional encoding → transformer encoder captures temporal patterns → transformer decoder reconstructs → FCN layer produces `x1`. Conditioning `c = zeros` (no anomaly info).
- **Phase 2 (anomaly-aware reconstruction):** Anomaly context `c = (x1 - input)²` is concatenated with the input → same encoder/decoder structure → produces corrected reconstruction `x2`. This second phase learns to improve predictions using error feedback.
- **Loss function** (progressive weighting across epochs):
  - `L1 = MSE(x1, target)` ; `L2 = MSE(x2, target)`
  - `weight_1 = 1 / (epoch + 1)` — starts high, decreases
  - `weight_2 = 1 - weight_1` — starts near 0, increases
  - `loss = mean(weight_1 * L1 + weight_2 * L2)` per feature
  - At Epoch 0: 100% Phase 1. By Epoch 9: ~90% Phase 2. This prevents anomaly-chasing before a solid baseline is established.
- Multiple variants available in `ml_core`: TranAD_Basic, TranAD_Transformer, TranAD_Adversarial, TranAD_SelfConditioning.

### ATLAS-Specific Modification: GroupedTranAD
Because DCM median and standard deviation time series have very different shapes, the **GroupedTranAD** model runs two independent TranAD instances in parallel — one per group (51 medians, 51 std devs). Each mini-model processes 51 features, then the x1 and x2 outputs from both groups are concatenated before the joint loss is computed. The concatenation couples the two models through the loss; removing this coupling is noted as a potential future experiment.

---

## 6. 2026 Deployment Status

- A **streaming pipeline** is running on a CERN OpenStack virtual machine.
- Outputs are stored in a TimescaleDB database-on-demand from CERN and visualized via Grafana.
- MLflow tracks all running model versions with training curves, feature columns, and metadata.
- **Seven models** are currently running in parallel; a **majority voting / ensemble** approach is planned for future work to reduce false positives.
- A **listener/orchestrator integration** is in progress: when an anomaly is detected, the signal will be made available to a higher-level orchestration system that can retrieve histograms, error logs, and other contextual data automatically.

---

## 7. Discovered Anomaly: Network Cable Issues

- While monitoring only DCM input rates (no network data), the model detected anomalies correlated with **flapping network cables** in ATLAS.
- The standard error-reporting system never flagged these events; experts had to manually connect to network switches to discover the issue.
- This use case demonstrated that the model can detect anomaly patterns that traditional threshold-based monitoring misses.

---

## 8. Discussion Points

### Continuous Learning / Model Retraining
- DCM data changed significantly between Run 3 (2025) and 2026 due to trigger menu updates and tracking configuration changes.
- **Solution:** Added just the first two runs from 2026 to the training set — the model quickly adapted.
- Open question: how few new runs are needed to adapt to detector changes? More study needed.
- This is a common challenge across all experiments using ML for anomaly detection.

### Repository Access
- Code is currently hosted on **CERN GitLab** (not public GitHub).
- Non-CERN collaborators cannot access it directly.
- Options discussed:
  - **Lightweight CERN accounts** (available via external email) could grant GitLab and Indico access.
  - **GitHub organization** with private/public repos is another option.
  - Plan to move the repo to be more publicly accessible, especially for Phase 2 growth.

### Extending to Other Experiments / Mini-DAQ Systems
- The framework is designed to be experiment-agnostic — any data source producing a timestamp + features table can plug in before `data_preprocessing`.
- Mini-DAQ systems with non-standard data formats are feasible but may require custom wrappers.
- **DCS (Detector Control System) data** integration is planned as the next package. Specific upcoming use cases:
  - MDT high voltage with AMOP (Zhen Yan)
  - NSW high voltage (Liang Guan)
  - Central DCS (Paris Moschovakos)
  - Networking data (Charis Harley)
  - Muon DCS data (Stathis Karentzos)
