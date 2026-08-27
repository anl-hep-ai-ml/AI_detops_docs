# SPT-3G

This section documents the SPT-3G calibrator-response workflow implemented in `anldq`. The current SPT path in this repository focuses on detector-health monitoring using per-observation detector summaries such as `CalibratorResponse` and `CalibratorResponseSN`, not the full raw sky timestream anomaly-search problem.

## What This Workflow Covers

The SPT pages are split into the same pieces used by the code:

| Page | What it covers |
|---|---|
| [Data Loading](data_loading.md) | How `SPT3GDataset` loads HDF5 calibrator-response files and optional legacy `.g3` files |
| [Preprocessing](preprocessing.md) | Detector trimming, timestamp trimming, NaN interpolation, baseline handling, and scaling |
| [Training](training.md) | How SPT datasets are passed into `build_trainer()` and trained with TranAD |
| [Histograms](histograms.md) | How `scripts/spt/plot_spt_histogram.py` trains, runs inference, and makes 1D/2D error-vs-SNR plots |

## Current SPT Focus In This Repo

The active worked example is the SPT calibrator-response pipeline:

- Input data is typically one HDF5 file per observing year.
- Each timestamp is a calibrator observation.
- Each channel is a detector.
- The dataset shape presented to models is `(T, C, 1)`.
- The most important variants are `response` and `snr`.

The `snr` variant is especially important for the histogram workflow because the plotting script uses raw per-detector SNR values as `channel_labels`, then compares those SNR values to TranAD reconstruction errors.

## Related Pages

- [Methodology](../../overview/methodology/index.md)
- [Repository Overview](../../overview/methodology/repo_overview.md)
- [Core Workflow](../../overview/methodology/core_workflow.md)
- [Preprocessing](../../technical_docs/preprocessing/index.md)
- [BaseDataset](../../technical_docs/preprocessing/base_dataset.md)
- [Dataset Resolvers](../../technical_docs/preprocessing/dataset_resolvers.md)
- [Training Pipeline](../../technical_docs/training/training_pipeline.md)
- [Inference Pipeline](../../technical_docs/inference/inference_pipeline.md)
- [Analysis and Scoring](../../technical_docs/analysis/analysis_and_scoring.md)
