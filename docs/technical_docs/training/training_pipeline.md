# Training Pipeline

The training pipeline turns a preprocessed dataset into a trained anomaly-detection model checkpoint.

The main implementation lives in:

- `src/anldq/trainer/builder.py`
- `src/anldq/trainer/core.py`
- `src/anldq/trainer/utils/data_prepare.py`
- `src/anldq/deep_learning/manager.py`

## High-Level Flow

At a high level, training follows this sequence:

1. Load train and validation datasets
2. Build a `TrainConfig`
3. Call `build_trainer(config, dataset=train_ds)`
4. Let the builder choose the final model, dimensions, and device
5. Call `trainer.train(train_ds, val_ds)`
6. Save checkpoints, loss curves, and run metadata

This is the implementation behind Stage 2 in the [methodology overview](../../overview/methodology/core_workflow.md).

## `build_trainer()` Responsibilities

`build_trainer()` is the entry point that converts configuration plus dataset metadata into a ready-to-run `Trainer`.

Its flow in `src/anldq/trainer/builder.py` is:

1. Set global random seeds for `random`, `numpy`, and `torch`
2. Require the dataset so `AutoModelSelector` can inspect shape and modality
3. Populate `config.data_tag` from `dataset.data_tag` when available
4. Run `AutoModelSelector.recommend(dataset, subsensor_mode=...)`
5. Resolve the final model name, allowing user override
6. Resolve TranAD correlation mode if the chosen model is `TranAD`
7. Resolve final input dimensions from explicit dims, selector output, or config override
8. Apply model activation heuristics with `maybe_apply_model_activation(...)`
9. Build or resume the model and optimizer with `create_or_resume_model(...)`
10. Resolve device
11. Construct the `Trainer`

## Why the Dataset Is Required

The builder is not purely config driven. It looks at the dataset to infer:

- channel and feature dimensionality
- model compatibility
- correlation mode recommendations for TranAD
- whether extra activation logic should be applied

That means training configuration is partly static and partly data-driven.

## What the `Trainer` Owns

`Trainer` in `src/anldq/trainer/core.py` is the runtime object that owns:

- `model`
- `optim`
- `sched`
- `cfg`
- `device`
- `dtype`
- `summary_writer`
- `strategy`
- per-epoch loss histories

The `strategy` comes from `train_strategy(model)` and hides model-specific batch and loss details behind a shared interface.

## Training Data Preparation

`trainer.train(train_ds, val_ds)` first converts dataset tensors into model-ready inputs and targets using `cut_data_for_model(...)` from `trainer/utils/data_prepare.py`.

This is where shapes are adapted for the selected model.

Typical behavior:

- window-based models use overlapping windows of length `n_window`
- model input precision follows `config.model_precision`
- `subsensor_mode` and `subsensor_reduce` affect how feature groups are prepared

After cutting, the trainer builds paired PyTorch data loaders with `create_pair_loaders(...)`.

## Main Runtime Steps in `Trainer.train()`

The training loop in `Trainer.train()` does the following:

1. Enable or disable early stopping based on whether `val_ds` exists
2. Prepare train and validation inputs/targets with `cut_data_for_model(...)`
3. Build data loaders
4. Resolve scheduler choice, possibly using auto-scheduler recommendation
5. Build and optionally restore scheduler state
6. Print the resolved training plan
7. Initialize early stopping state and checkpoint cadence
8. Run the epoch loop
9. Track training loss and validation loss
10. Save checkpoints and summaries

## Scheduler Logic

The scheduler path is more dynamic than a fixed config-only design.

If `cfg.scheduler` is unset and `cfg.auto_scheduler` is enabled, the trainer calls `recommend_scheduler(train_ds, cfg)`.

Then it resolves the final scheduler choice with `resolve_scheduler_choice(...)` and constructs it through:

- `build_scheduler(...)`
- `build_and_finalize_scheduler(...)`

This supports schedulers such as cosine annealing, step schedules, `ReduceLROnPlateau`, and `OneCycleLR`.

## Precision and Performance

`Trainer.__init__()` also resolves runtime performance policy.

Important settings include:

- `config.device`: explicit device or `auto`
- `config.model_precision`: `float32` or `float64`
- `config.use_amp`: enables mixed precision on CUDA when compatible
- `config.amp_dtype`: `bf16` or `fp16`
- TF32 and cuDNN tuning flags on CUDA

The model is moved onto the final device and dtype before training begins.

## Early Stopping

If validation data is present, the trainer auto-enables early stopping unless config already specifies otherwise.

The main parameters are:

- `early_stopping`
- `early_stop_patience`
- `early_stop_min_delta`

The best validation loss is tracked across epochs. When patience is exhausted, training stops early.

## Artifacts Produced by Training

The training stage writes persistent artifacts to the run directory.

Common outputs include:

- best checkpoint
- final checkpoint
- checkpoint snapshots at configured intervals
- `loss_curve.pdf`
- `loss_curve.csv`
- `run_info.md`
- TensorBoard logs when enabled

These are the artifacts later consumed by the [inference stage](../inference/inference_pipeline.md).

## Minimal Example

```python
from anldq.configs import TrainConfig
from anldq.datasets import load_dataset
from anldq.trainer import build_trainer

cfg = TrainConfig.from_yaml("src/anldq/configs/train_config/tranad.yml")
train, val, test = load_dataset("spt", data_variant="snr")
trainer = build_trainer(cfg, dataset=train)
trainer.train(train, val)
```

## Methodological Notes

A few training choices matter for the scientific methodology, not just implementation:

- model selection is dataset-aware rather than arbitrary
- scaler fitting happens upstream on the training split to avoid leakage
- early stopping uses validation loss instead of test information
- saved checkpoints separate training from inference, making later scoring reproducible

## Source References

- `src/anldq/trainer/builder.py`
- `src/anldq/trainer/core.py`
- `src/anldq/trainer/utils/data_prepare.py`
- `src/anldq/trainer/utils/scheduler_factory.py`
- `src/anldq/trainer/utils/scheduler_resolver.py`
- `src/anldq/deep_learning/model_select/auto_selector.py`
