# Transformer-based Anomaly Detection

## Core Idea

The primary approach used in this project is **reconstruction-based anomaly detection** with transformer models. A model is trained on normal operational data to reconstruct windows of the input time-series. At inference time, a high reconstruction error in a given window indicates that the data deviates from learned normal behaviour — this excess error is used directly as an anomaly score.

This approach is fully unsupervised: no labelled anomalies are required for training.

## TranAD

The main model used is **TranAD** (Tuli et al., VLDB 2022), a deep transformer network designed for multivariate time-series anomaly detection. As implemented in this project, TranAD is a **two-phase self-conditioning transformer encoder–decoder**:

- A single transformer **encoder** feeds **two** transformer **decoders**.
- **Phase 1** produces an initial reconstruction of the input window.
- **Phase 2** re-encodes using the squared reconstruction error from phase 1 as a conditioning signal ("self-conditioning"), so the second pass focuses on the parts of the window that were hardest to reconstruct.
- All input channels are processed together, so cross-channel structure is available to the model.

TranAD operates on sliding windows and, being reconstruction-based, requires only normal data to train. The same architecture is used in the ATLAS ATOM framework and in the SPT-3G study documented in the [Meeting Notes](../meeting_notes/20260615_hackathon/index.md).

!!! note "Implementation detail"
    The exact loss and training loop (including the adversarial objective from the original paper) live in the TranAD training strategy inside `anldq`, not in the model definition itself. See [Models & Scoring](../overview/methodology/models_scoring.md) and the [Training Pipeline](../technical_docs/training/training_pipeline.md) technical docs for specifics.

## Other Models

TranAD is the default, but it is one of nine deep-learning models available in the framework (USAD, DAGMM, OmniAnomaly, LinearTransformer, Informer, PatchTST, DLinear, and GDN are also implemented). For the full list and how a model is chosen automatically from the data shape, see [Models & Scoring](../overview/methodology/models_scoring.md).

## Citation

```
S. Tuli, G. Casale, N. R. Jennings.
"TranAD: Deep Transformer Networks for Anomaly Detection in Multivariate Time Series Data."
VLDB, 2022.
```
