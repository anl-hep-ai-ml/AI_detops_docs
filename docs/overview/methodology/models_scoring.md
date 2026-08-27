# Models & Scoring

This page covers the conceptual half of stages 2–5 of the [Core Workflow](core_workflow.md): which models are available, how a model's output becomes an anomaly score, and how that score is turned into evaluated anomaly flags. For implementation-level detail, follow the links into the [Technical Docs](../../technical_docs/index.md).

## Models

The framework implements **nine deep-learning models**, each registered under a name and selectable from config:

| Model | Note |
|---|---|
| **TranAD** | Default; two-phase self-conditioning transformer |
| USAD | Adversarially-trained autoencoder |
| DAGMM | Deep autoencoding Gaussian mixture |
| OmniAnomaly | Stochastic RNN |
| LinearTransformer | Linear-attention transformer |
| Informer | Efficient long-sequence transformer |
| PatchTST | Patch-based time-series transformer |
| DLinear | Simple linear decomposition model |
| GDN | Graph deviation network |

### Choosing a Model

If a config names a model, that model is used. If it does not, an **automatic selector** picks one from the data shape — TranAD for the common small-channel case (roughly `C ≤ 64`), and other models for wider or more feature-rich data. In practice most experiments use the shipped TranAD configuration.

### TranAD

TranAD is a **transformer encoder feeding two transformer decoders**, run in two phases:

1. **Phase 1** reconstructs the input window.
2. **Phase 2** re-encodes using the squared phase-1 error as a self-conditioning signal, concentrating the second reconstruction on the hardest-to-model parts of the window.

It is reconstruction-based and trains on normal data only. The training-time objective (including the adversarial component from the original paper) lives in the TranAD training strategy; see the [Training Pipeline](../../technical_docs/training/training_pipeline.md).

### Baselines

Classical and statistical baselines (ZScore, RobustZ, EWMA, Range, Quantile, DBSCAN, ChannelGroup, Merlin, Oneline) are available as comparison points and lightweight alternatives. See [Baseline Methods](../../what_is_ad/baselines.md).

## From Model Output to Anomaly Score

Inference runs the trained model over the test set and produces a **per-timestep, per-channel reconstruction error map of shape `(T, C)`** — one error value for every detector at every timestep. This map is the raw material for scoring.

The error map is then **aggregated** into whichever view the analysis needs:

| Level | Output shape | Answers |
|---|---|---|
| Timeline | `(T,)` | When is the detector anomalous overall? |
| Channel | `(C,)` | Which detectors are consistently anomalous? |
| Group | `(T, G)` | How does each detector group (e.g. SPT wafer) behave over time? |
| Error map | `(T, C)` | Full per-detector, per-timestep detail |

See [Analysis and Scoring](../../technical_docs/analysis/analysis_and_scoring.md) for the reduction options (mean, max, median, percentile, …) behind each level.

## Thresholding

A threshold converts continuous scores into binary anomaly flags. Three strategies are supported:

| Strategy | How the threshold is chosen |
|---|---|
| **Quantile** | The `(1 − anomaly_rate)` percentile of the scores |
| **SPOT** | Fits a generalised Pareto distribution to the score tail (Peaks-Over-Threshold); adapts to the data. Variants: SPOT, biSPOT, dSPOT, bidSPOT |
| **Best-F1** | Enumerates candidate thresholds and picks the one maximising point-adjusted F1 |

The default is the best-F1 (event) strategy.

## Evaluation

Predictions are compared to ground-truth labels using **point adjustment**: if any point inside a true anomaly *event* is flagged, the whole event is credited as detected. This is standard practice in the time-series anomaly-detection literature, where labels correspond to contiguous events rather than isolated timestamps.

Reported metrics: **F1 (event, point-adjusted), Precision, Recall, MCC, AUROC**. When anomaly categories are available, the same metrics are also reported per category.
