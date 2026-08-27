# Analysis and Scoring

The analysis layer converts raw reconstruction errors into anomaly scores, binary predictions, and evaluation metrics.

The main implementation lives in:

- `src/anldq/analysis/aggregate.py`
- `src/anldq/analysis/eval/pipeline.py`
- `src/anldq/analysis/eval/thresholds.py`
- `src/anldq/analysis/eval/event_ops.py`

## Role in the Methodology

This is the stage where a model output becomes a scientific or operational anomaly decision.

The overall analysis flow is:

1. Start from [reconstruction errors](../inference/inference_pipeline.md)
2. Aggregate them into one or more score views
3. Select a thresholding strategy
4. Convert scores into binary predictions
5. Apply point adjustment for event-style evaluation
6. Compute metrics such as F1, Precision, Recall, MCC, and AUROC

That corresponds to Stages 4 and 5 in the [high-level workflow](../../overview/methodology/core_workflow.md).

## Score Aggregation

The aggregation helpers in `src/anldq/analysis/aggregate.py` operate on several shape conventions:

- feature-level: `(T, C, D)`
- channel-level: `(T, C)`
- timeline-level: `(T,)`

The main reduction helpers are:

- `to_channel_score(...)`
- `to_timeline_score(...)`
- `to_channel_summary_score(...)`
- `to_group_score(...)`
- `aggregate_score(...)`
- `aggregate_scores(...)`

## Aggregation Levels

The repo supports several score views from the same raw error tensor.

| Level | Output shape | Typical use |
|---|---|---|
| `time` | `(T,)` | Global anomaly flag per timestamp |
| `channel` | `(C,)` | Which channels are persistently anomalous |
| `group` | `(T, G)` | Group-aware monitoring such as SPT wafer-level scoring |
| `map` | `(T, C)` | Full error map for detailed diagnosis |

## Reduction Modes

Aggregation is configurable by reduction mode rather than being hard-coded.

Supported reductions include:

- `mean`
- `max`
- `median`
- `std`
- `iqr`
- percentile-style reductions such as `p95`
- explicit `percentile` configs with a `q` value

This matters because different experiments care about different failure signatures. A single outlier channel may be better captured by `max`, while broad detector degradation may be better captured by `mean` or `median`.

## Group-Aware Scoring

`to_group_score(...)` uses `channel_groups` from the dataset to preserve experiment structure.

For SPT, this enables group-level timelines such as wafer scores. The groups are ordered by first appearance in the dataset's `channel_groups` metadata.

This is a key part of the cross-experimental design: the shared aggregation code remains generic while experiment-specific structure is carried in metadata.

## Thresholding Strategies

Thresholding is implemented in `src/anldq/analysis/eval/thresholds.py`.

The main strategies are:

### Quantile threshold

`quantile_threshold(scores, rate)` sets a static threshold at the `(1 - rate)` quantile of the score distribution.

This is simple and useful when a target anomaly rate is known or can be estimated from labels.

### SPOT threshold

`spot_threshold(scores, spot_cfg, train_frac)` applies a Peaks Over Threshold style method through `anldq.analysis.spot.spot_run`.

Its behavior is:

1. Split the score timeline into a training prefix and a test suffix
2. Fit the SPOT-family model on the training prefix
3. Estimate dynamic or static thresholds on the test suffix
4. Convert scores into binary alarms

Important config fields include:

- `family`
- `q`
- `dynamic`
- `init_level`
- `min_extrema`
- `threshold_scale`
- `threshold_safety_factor`

### Best-F1 threshold

`best_f1_event_threshold(labels, scores)` enumerates candidate thresholds and chooses the one that maximizes point-adjusted event F1.

This is useful for model comparison, but it is validation-style threshold selection and should be interpreted differently from unsupervised deployment thresholding.

## Evaluation Pipeline

The main high-level entry point is `get_metrics(...)` in `analysis/eval/pipeline.py`.

Its two-step structure is explicit in the code:

1. scores to binary predictions
2. predictions plus scores to metrics

### Step 1: Build binary predictions

`_build_binary_predictions(...)` selects one of:

- quantile thresholding
- SPOT thresholding
- best-F1 thresholding
- or a no-threshold fallback

### Step 2: Compute metrics

After thresholding, the pipeline:

1. normalizes labels and scores to 1D timelines
2. applies point adjustment with `point_adjust_from_pred(...)`
3. computes evaluation metrics with `uncategorized_full_metrics(...)`
4. records a representative `threshold_rate`

## Point Adjustment

Point adjustment is implemented in `src/anldq/analysis/eval/event_ops.py`.

The key rule is:

- if a predicted anomaly hits any point within a true anomaly event, the full event is credited as detected

This is standard in time-series anomaly detection when anomaly labels correspond to contiguous events rather than isolated independent timestamps.

It changes the interpretation of F1 from pointwise detection to event-aware detection.

## Reported Metrics

`get_metrics(...)` returns a compact dictionary with these main fields:

- `F1_event`
- `precision`
- `recall`
- `MCC`
- `AUROC`
- `threshold_rate`

These are the core reported numbers used in model comparison and experiment reporting.

## Minimal Example

```python
from anldq.analysis.eval.pipeline import get_metrics

metrics = get_metrics(
    label_t=labels,
    score_t=timeline_scores,
    threshold_method="spot",
    spot_cfg={"family": "spot", "q": 1e-3, "dynamic": True},
)
```

## Methodological Notes

This layer separates three concepts that are often conflated:

- model error
- anomaly score
- anomaly decision

That separation is intentional.

It allows the repo to:

- compare score reductions without retraining
- compare thresholding strategies on fixed score sequences
- evaluate the same run under both operational and paper-style settings
- keep experiment-specific group structure while sharing the underlying evaluation code

## Source References

- `src/anldq/analysis/aggregate.py`
- `src/anldq/analysis/eval/pipeline.py`
- `src/anldq/analysis/eval/thresholds.py`
- `src/anldq/analysis/eval/event_ops.py`
- `src/anldq/configs/pot.py`
