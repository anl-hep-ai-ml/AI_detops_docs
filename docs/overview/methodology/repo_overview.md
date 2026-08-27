# Repository Overview

`CrossExperimentalAIDQM` (Python package: `anldq`) is a shared anomaly-detection framework developed at Argonne National Laboratory. It applies deep learning to operational time-series data from large-scale physics and astrophysics experiments, with the goals of real-time hardware fault detection and model-agnostic anomaly searches. The framework is designed to be cross-experimental: experiment-specific data handling is isolated from shared training, inference, and analysis infrastructure, so the same pipeline runs on detector data from any supported experiment without modification to core code.

---

## Supported Experiments

| Experiment | Detector / system | Data format | Docs |
|---|---|---|---|
| SPT-3G | Bolometric CMB detector array | HDF5 calibrator-response files | [SPT-3G](../../experiments/spt/index.md) |
| ATLAS HLT | High-Level Trigger rate monitoring | HDF5 (median/std features) | [ATLAS](../../experiments/atlas/index.md) |
| Muon g-2 | Storage ring BPM stations | HDF5 (multi-feature per station) | [Muon g-2](../../experiments/muon_gm2/index.md) |

Benchmark datasets (SMAP, MSL, SMD, SWaT) are also supported and used for model validation.

---

## Repository Layout

The top-level structure separates configuration, source code, scripts, and notebooks:

```
CrossExperimentalAIDQM/
│
├── src/anldq/                  # installable Python package
│   ├── configs/                # YAML configs for datasets and training
│   ├── datasets/               # BaseDataset, per-experiment subclasses, YAML resolvers, builder
│   ├── deep_learning/          # nine anomaly-detection model implementations
│   ├── trainer/                # training loop, checkpointing, loss curves
│   ├── infer/                  # inference loop, saved outputs
│   ├── analysis/               # score aggregation, thresholding, evaluation metrics
│   ├── baselines/              # classical baseline models (ZScore, EWMA, DBSCAN, …)
│   └── cli/                    # command-line entry point
│
├── scripts/                    # PBS job scripts, sweep runners, environment setup
│   └── spt/                    # SPT-specific plotting and PBS launch helpers
├── jupyter/                    # experiment notebooks (SPT, GM2, HLT, …)
└── src/anldq/                  # installable package root
```

The key components and their technical documentation:

| Component | What it does | Technical reference |
|---|---|---|
| `datasets/` | Loads, preprocesses, and splits experiment data | [BaseDataset](../../technical_docs/preprocessing/base_dataset.md), [YAML config system](../../technical_docs/preprocessing/dataset_resolvers.md) |
| `trainer/` | Training loop, early stopping, checkpointing | [Training pipeline](../../technical_docs/training/training_pipeline.md) |
| `infer/` | Forward pass on test data; saves error maps | [Inference pipeline](../../technical_docs/inference/inference_pipeline.md) |
| `analysis/` | Score aggregation, thresholding, metrics | [Analysis and scoring](../../technical_docs/analysis/analysis_and_scoring.md) |

---

## The Shared Pipeline

Every experiment follows the same five-stage pipeline: raw data on disk is described by a YAML configuration file and loaded into a dataset object, a model is trained on that dataset, the trained model runs inference on a held-out test set to produce per-channel reconstruction errors, those errors are aggregated into anomaly scores, and the scores are thresholded and evaluated against ground-truth labels.

A full walkthrough of each stage is in [Core workflow](core_workflow.md).

---

## Compute Targets

The framework runs locally on any GPU-equipped machine or on Argonne HPC clusters. PBS job scripts for both clusters are included in the repository.

| Target | Notes |
|---|---|
| Local GPU | `anldq` CLI or notebooks; no additional configuration |
| LCRC Swing | `swing_spt_example.pbs` — PBS job script, module-based environment |

See the [Technical Docs](../../technical_docs/index.md) for details on running the pipeline, and [Core Workflow](core_workflow.md) for an end-to-end code example.
