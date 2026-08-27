# Core Workflow

Every experiment in `anldq` follows the same five-stage pipeline. The stages are independent enough that each can be run, inspected, or replaced without touching the others. This page gives a conceptual walkthrough of all five stages; links to the relevant technical pages are provided at each step.

```
Raw data on disk
      │
      ▼  Stage 1 — Data loading and preprocessing
      │
      ▼  Stage 2 — Training
      │
      ▼  Stage 3 — Inference
      │
      ▼  Stage 4 — Score aggregation
      │
      ▼  Stage 5 — Thresholding and evaluation
```

---

## Stage 1 — Data Loading and Preprocessing

Raw detector data lives on disk in an experiment-specific format (HDF5, CSV, numpy arrays). A YAML configuration file describes the experiment family, data paths, preprocessing policy, and split strategy. At runtime, `anldq` resolves that configuration and constructs three dataset objects — train, val, and test — each holding a preprocessed array of shape `(T, C, D)`: T timesteps, C channels (detectors), D features per channel.

Preprocessing is applied in a fixed order inside every dataset object:

| Step | What it does |
|---|---|
| Load | Read raw files from disk |
| Time mask | Drop unwanted timestamps |
| Channel mask | Drop unwanted detectors or features |
| Split | Divide into train / val / test |
| NaN handling | Fill, interpolate, or drop missing values |
| Baseline removal | Subtract a constant offset or rolling median |
| Scaling | Fit a scaler on train; apply to val and test |

The scaler is always fitted on the training set and reused for validation and test — no leakage. For SPT-3G, the scaler is a per-channel robust (median/IQR) normalisation rather than a global sklearn scaler.

**Technical references:** [Preprocessing](../../technical_docs/preprocessing/index.md) · [BaseDataset](../../technical_docs/preprocessing/base_dataset.md) · [YAML config system](../../technical_docs/preprocessing/dataset_resolvers.md)

---

## Stage 2 — Training

`build_trainer(cfg, dataset=train)` inspects the dataset shape, selects an appropriate model and correlation mode, constructs the model and optimizer, and returns a `Trainer` object. Calling `.train(train_ds, val_ds)` runs the epoch loop.

Key features of the training loop:

- Data is windowed into overlapping segments of length `n_window` before being fed to the model. Most models operate on windows of shape `(batch, n_window, C×D)`.
- A learning rate scheduler (default: cosine annealing) adjusts the learning rate each epoch.
- Early stopping monitors validation loss with a patience of 10 epochs by default.
- The best checkpoint (lowest validation loss) and the final checkpoint are both saved to disk.
- A loss curve (`loss_curve.pdf`, `loss_curve.csv`) and a run summary (`run_info.md`) are written at the end.

Nine deep learning models are available. The default for most experiments is **TranAD** — a two-phase self-conditioning Transformer encoder-decoder designed for multivariate time-series anomaly detection.

**Technical references:** [Training](../../technical_docs/training/index.md) · [Training pipeline](../../technical_docs/training/training_pipeline.md)

---

## Stage 3 — Inference

`build_infer(cfg, load_best=True)` loads the best saved checkpoint. Calling `.run(test_ds, save_dir=run_dir)` runs the trained model on the test set in mini-batches and returns per-channel reconstruction errors.

The model reconstructs each input window and computes an error between the reconstruction and the original. These errors are accumulated across all test timesteps and returned as a `(T, C)` array — one error value per timestep per channel.

The following files are saved to `run_dir`:

| File | Shape | Contents |
|---|---|---|
| `errors.npy` | `(T, C)` | Per-timestep, per-channel reconstruction error |
| `predictions.npy` | `(T, C)` | Per-timestep, per-channel model output |
| `time_loss.npy` | `(T,)` | Global per-timestamp mean error |
| `scores.npz` | varies | All aggregated score views |

**Technical reference:** [Inference](../../technical_docs/inference/index.md) · [Inference pipeline](../../technical_docs/inference/inference_pipeline.md)

---

## Stage 4 — Score Aggregation

The raw `(T, C)` error map is aggregated into one or more score views depending on what the analysis requires:

| Aggregation level | Output shape | Use case |
|---|---|---|
| Timeline | `(T,)` | Global anomaly flag per timestamp |
| Channel | `(C,)` | Which detectors are consistently anomalous |
| Group | `(T, G)` | Per-wafer or per-band score, preserving time |
| Error map | `(T, C)` | Full per-detector, per-timestep view |

For SPT-3G the group level corresponds to bolometer wafers, allowing spatial patterns to be identified across the focal plane.

**Technical reference:** [Analysis](../../technical_docs/analysis/index.md) · [Analysis and scoring](../../technical_docs/analysis/analysis_and_scoring.md)

---

## Stage 5 — Thresholding and Evaluation

A threshold is applied to the aggregated scores to produce binary anomaly predictions. Three thresholding strategies are supported:

| Strategy | How the threshold is set |
|---|---|
| Quantile | Set at the `(1 − anomaly_rate)` percentile of training scores |
| SPOT | Statistical POT — fits a generalised Pareto distribution to the tail of training scores; adapts to the data distribution |
| Best-F1 | Enumerates candidate thresholds; selects the one that maximises point-adjusted F1 on the validation set |

Predictions are compared to ground-truth labels using **point adjustment**: if any point inside a true anomaly event is flagged, all points in that event are credited as detected. This is standard practice in the anomaly detection literature.

Reported metrics: F1 (event, point-adjusted), Precision, Recall, MCC, AUROC.

**Technical reference:** [Analysis](../../technical_docs/analysis/index.md) · [Analysis and scoring](../../technical_docs/analysis/analysis_and_scoring.md)

---

## End-to-End Code Example (SPT-3G)

The following is the complete training and inference sequence used by `scripts/spt/plot_spt_histogram.py`. It illustrates how all five stages connect in practice.

```python
from anldq.configs import TrainConfig
from anldq.datasets import load_dataset
from anldq.trainer import build_trainer
from anldq.infer import build_infer
import numpy as np

# Load config and derive run directory
cfg = TrainConfig.from_yaml("src/anldq/configs/train_config/tranad.yml")
cfg.data_tag = "spt_float_labels"
cfg.run_id = f"{cfg.data_tag}_TranAD"
run_dir = cfg.io.get_experiment_dir(cfg.run_id)

# Stage 1 — load and preprocess
train, val, test = load_dataset(
    "spt",
    data_variant="snr",
    label_from_snr=True,        # store raw SNR values as channel_labels
    trim_test_timestamps=False, # keep low-SNR observations in test set
)

# Stage 2 — train
build_trainer(cfg, dataset=train).train(train, val)

# Stage 3 — infer
infer = build_infer(cfg, load_best=True)
infer.run(test, save_dir=run_dir)

# Save labels for downstream histogram analysis
np.save(run_dir / "test_labels.npy", np.asarray(test.channel_labels))
```

For the full histogram analysis that follows inference, see [SPT-3G histograms](../../experiments/spt/histograms.md).
