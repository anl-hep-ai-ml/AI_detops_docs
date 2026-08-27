# Inference Pipeline

The inference pipeline loads a trained checkpoint, runs the model on a dataset split, reconstructs per-timestep errors, and saves reusable scoring artifacts.

The main implementation lives in:

- `src/anldq/infer/builder.py`
- `src/anldq/infer/core.py`
- `src/anldq/trainer/utils/data_prepare.py`
- `src/anldq/analysis/aggregate.py`

## High-Level Flow

At a high level, inference does this:

1. Load a trained model checkpoint
2. Resolve device and precision
3. Cut dataset tensors into model-ready inputs and targets
4. Run batched forward evaluation
5. Reassemble outputs from window space back into timeline space
6. Reduce feature dimensions to channel-level error maps
7. Aggregate errors into configured score views
8. Save `.npy` and `.npz` outputs for later analysis

This is Stage 3 plus the first half of Stage 4 from the [overview docs](../../overview/methodology/core_workflow.md).

## `build_infer()` Responsibilities

`build_infer(config, load_best=True)` is the main factory in `src/anldq/infer/builder.py`.

Its responsibilities are:

1. Load the saved model with `load_infer_model(...)`
2. Resolve device from explicit argument or `config.device`
3. Resolve precision from `config.model_precision`
4. Move the model to device and dtype
5. Build the same strategy abstraction used by [training](../training/training_pipeline.md) with `train_strategy(model)`
6. Return an `Infer` object

This keeps checkpoint loading separate from the actual runtime loop.

## `Infer.run()` Call Flow

The core method is `Infer.run(ds, batch_size=None, save_dir=None)`.

Its internal flow is:

1. Prepare `inputs, targets = cut_data_for_model(ds.data, ...)`
2. Resolve effective inference batch size from explicit argument, `cfg.infer_batch_size`, or `cfg.batch_size`
3. Resolve AMP behavior for CUDA
4. Iterate over the dataset in batches
5. Call `self.strategy.forward_eval(in_batch, tg_batch)`
6. Concatenate raw batch outputs
7. Remove or collapse the window dimension with `glue_from_window(...)`
8. Reshape flat features back to channel space with `reshape_to_channels(...)`
9. Compute score views with `aggregate_scores(err, config=..., channel_groups=...)`
10. Cache last outputs on the `Infer` instance
11. Optionally save all outputs to disk
12. Return `(errors, predictions)`

## Shapes Through the Pipeline

The important shape transitions are:

- dataset tensor: typically `(T, C, D)`
- model inputs: often windowed into `(B, W, F_all)` depending on architecture
- raw eval outputs: model-specific, often with batch and window dimensions
- glued features: `(T, F_all)`
- final error map: `(T, C)`
- final prediction map: `(T, C)`

This conversion is why the shared data-preparation utilities are used by both [training](../training/training_pipeline.md) and inference.

## Output Artifacts

When `save_dir` is provided, `Infer.run()` saves reusable artifacts.

| File | Shape | Meaning |
|---|---|---|
| `errors.npy` | `(T, C)` | Per-timestep, per-channel reconstruction error |
| `predictions.npy` | `(T, C)` | Per-timestep, per-channel reconstruction or prediction output |
| `time_loss.npy` | `(T,)` | Mean error per timestamp |
| `timestamps.npy` | `(T,)` when available | Saved only if dataset timestamps are aligned to the final timeline |
| `scores.npz` | varies | Aggregated score views keyed by score name |

These files are intended to be reused by [analysis](../analysis/analysis_and_scoring.md) notebooks, thresholding code, and experiment-specific follow-up studies.

## Score Aggregation During Inference

Inference does not stop at raw reconstruction error.

After producing the `(T, C)` error map, it reads score aggregation config from:

```python
score_cfg = ds.meta.get("score_aggregation", {})
```

Then it calls:

```python
aggregate_scores(err, config=score_cfg, channel_groups=channel_groups)
```

This is where the repo converts one raw error map into multiple [analysis-ready views](../analysis/analysis_and_scoring.md) such as:

- global timeline scores
- channel summary scores
- group-level scores such as wafers for SPT
- raw map views

## Cached State on `Infer`

`Infer` keeps the most recent outputs in memory for convenience methods.

Important cached fields include:

- `_last_ds`
- `_last_errors`
- `_last_error_map`
- `_last_scores_map`
- `_last_preds`

Those are then used by helper methods such as `plot()` and `save_csv()`.

## Plotting and CSV Export

After one successful `run()`, the same `Infer` instance can:

- call `plot(...)` to render prediction vs truth plots through `analysis.plot.plotting.plot_predict`
- call `save_csv(...)` to export cached outputs in tabular form

These are convenience layers on top of the same cached reconstruction outputs.

## Minimal Example

```python
from anldq.infer import build_infer

infer = build_infer(cfg, load_best=True)
errors, preds = infer.run(test_ds, save_dir=run_dir)
```

## Methodological Notes

Inference in this repo is deliberately split from [training](../training/training_pipeline.md).

That matters because it makes it possible to:

- rerun scoring without retraining
- compare thresholding methods on identical raw errors
- inspect saved error maps offline
- keep experiment-specific analysis separate from the core model forward pass

This separation is one of the core design decisions of the overall pipeline.

## Source References

- `src/anldq/infer/builder.py`
- `src/anldq/infer/core.py`
- `src/anldq/trainer/utils/data_prepare.py`
- `src/anldq/analysis/aggregate.py`
