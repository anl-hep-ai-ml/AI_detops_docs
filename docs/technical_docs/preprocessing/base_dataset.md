# BaseDataset

`BaseDataset` is the shared dataset foundation for offline datasets in `anldq`.
It lives in `src/anldq/datasets/base.py` and provides the common preprocessing pipeline used by dataset families such as GM2, HLT, SPT, SMAP, DUNE, and generic file-based datasets.

Its main job is to turn raw source data into a consistent model-ready representation with shape `(T, C, D)`:

- `T`: time samples
- `C`: channels
- `D`: features per channel

A custom dataset subclass usually only needs to override one or two hooks such as `_load_raw()` or `scale_impl()` while reusing the rest of the pipeline.

## Quick Start

If you only remember a few things, remember these:

1. `__init__(...)` stores configuration and usually calls `_build()`.
2. `_build()` runs the shared preprocessing pipeline.
3. `_load_raw()` is the main hook for custom input formats.
4. `scale_impl(raw)` is the main hook for custom scaling behavior.
5. Metadata such as `timestamps`, `labels`, and `headers` must stay aligned whenever time or channels are filtered.
6. `self.raw_data` is the intermediate tensor and `self.data` is the final model-ready tensor.

## Reading Guide

- If you are using an existing dataset, focus on `Quick Start`, `Pipeline Overview`, and `Core Attributes`.
- If you are implementing a new dataset, jump to `Extension Points for Custom Dataset Classes`.

## Pipeline Overview

`BaseDataset` uses a fixed preprocessing order inside `_build()`.
Most subclasses keep this structure and override only one or two steps.

| Step | Method | What it does | Why the order matters |
|---|---|---|---|
| 1 | `_load_raw()` | Loads source data, normalizes it to `(T, C, D)`, and may initialize aligned metadata such as `timestamps` and `headers` | Every later step assumes a consistent in-memory representation |
| 2 | `_apply_time_mask()` | Filters the `T` axis and keeps `timestamps` and `labels` synchronized | Split logic should run on the filtered timeline |
| 3 | `_apply_channel_mask()` | Filters the `C` axis and keeps channel-aligned metadata synchronized | Downstream processing should only see the selected channels |
| 4 | `_apply_split()` | Selects the requested logical split and updates split-aligned metadata | Baseline fitting and scaling often depend on split semantics |
| 5 | `_apply_nan()` | Applies shared missing-value handling through `NanHandler` | Cleaning should happen before baseline estimation and scaling |
| 6 | `_apply_baseline()` | Removes offset or baseline structure and may store fitted baseline state | Scaling should usually be fit on corrected signals |
| 7 | `_apply_scaling()` / `scale_impl(raw)` | Fits or applies scaling, produces `self.data`, and may clip values | Scaling should see the final modeling input distribution |

## Baseline and Scaling Policy

Baseline removal and scaling are shared across all dataset families. Their knobs come from the `policy` block of the family YAML and are documented here so experiment pages can reference them instead of repeating them.

### Baseline removal

Baseline removal subtracts slow structure from each channel before scaling. It is controlled by:

| Setting | Meaning |
|---|---|
| `baseline_enable` | Whether baseline removal runs at all |
| `baseline_type` | `constant` for a single offset, or a time-dependent (rolling) baseline |
| `baseline_axis` | Which axis the offset is estimated over, such as `per_channel_time_mean`, `per_file_channel_time_mean`, `per_time_channel_mean`, `per_time_group_mean`, or `per_feature_global` |
| `baseline_stat` | `mean` or `median` estimator |
| `baseline_mode` | `per_channel` or grouped estimation |
| `baseline_window`, `baseline_stride` | Window and stride for the rolling (time-dependent) baseline |

The math lives in `src/anldq/datasets/process/offset_remove.py` (constant offset) and the rolling-median filter in `src/anldq/datasets/process/median_filter.py`.

### Scaling

Scaling produces the final `self.data`. It is controlled by:

| Setting | Meaning |
|---|---|
| `scaling_type` | `standard`, `minmax`, `robust`, or `none` |
| `scaling_mode` | `per_dim` or `per_channel` |
| `scaling_source` | How fitted state is shared across splits: `train_set_fit`, `per_set_fit`, `per_file_fit`, `per_run_fit`, or `rolling` |
| `auto_scale` | Whether the scaler type is auto-selected from the data |

`scaling_source="train_set_fit"` is the common default: the scaler is fit on the train split and reused on validation and test. This fit-and-reuse behavior is orchestrated by `src/anldq/datasets/builder.py` (`build_data_splits`). The scaling implementations live in `src/anldq/datasets/process/scale.py`.

A dataset subclass can override `scale_impl()` to replace the scaler entirely while still honoring `scaling_source` (SPT does this — see [SPT Preprocessing](../../experiments/spt/preprocessing.md)).

## Core Attributes

| Group | Attributes | Meaning |
|---|---|---|
| Core tensors | `self.raw_data`, `self.data` | Intermediate tensor before final scaling, and final model-ready tensor |
| Split config | `self.split`, `self.split_plan` | Which logical subset to build and how the split is defined |
| Source config | `self.data_file_paths`, `self.data_source`, `self.stream_iter` | Where data comes from and whether streaming is involved |
| Time metadata | `self.timestamps`, `self.labels` | Arrays aligned to the `T` axis |
| Channel metadata | `self.headers`, `self.channel_numbers`, `self.channel_groups` | Arrays aligned to the `C` axis |
| Scaling state | `self.scaling_type`, `self.scaling_mode`, `self.scaling_source`, `self.fitted_scaler`, `self.enable_scale`, `self.auto_scale` | Controls whether scaling runs and how fitted state is handled |
| Baseline state | `self.baseline_enable`, `self.baseline_type`, `self.baseline_estimator`, `self.baseline_axis`, `self.baseline_stat`, `self.fitted_baseline_state` | Controls whether baseline removal runs and how it is estimated |
| Mask and cleaning | `self.time_mask`, `self.time_mask_mode`, `self.channel_mask`, `self.channel_drop`, `self.channel_mask_mode`, `self.feature_keep`, `self.feature_drop`, `self.nan_enable`, `self.clip_enable`, `self.clip_per_feature` | Controls filtering, missing-value handling, and clipping |
| Bookkeeping | `self.meta`, `self.preprocess_steps` | Shared metadata and a record of applied preprocessing steps |

## Extension Points for Custom Dataset Classes

Most custom dataset classes only need to override a small subset of methods.

| If you need to... | Override |
|---|---|
| Read a custom file format, combine files, or build `(T, C, D)` from a domain-specific source layout | `_load_raw()` |
| Fit custom scalers such as per-channel, grouped, or domain-specific scaling | `scale_impl()` |
| Keep extra channel-aligned metadata synchronized during channel filtering | `_apply_channel_mask()` |
| Add domain-specific detrending or baseline estimation | `_apply_baseline()` |
| Add split-specific postprocessing | `_apply_split()` |

After implementing the subclass, register it in `src/anldq/datasets/subclass/registry.py`.

### Smallest possible custom dataset

```python
from ..base import BaseDataset

class MyDataset(BaseDataset):
    pass
```

This works if the default loader and scaling behavior are already sufficient.

### Typical custom dataset

```python
from ..base import BaseDataset

class MyDataset(BaseDataset):
    def _load_raw(self):
        # Load raw data
        # Set timestamps / headers if available
        # Return ndarray with shape (T, C, D)
        ...
```

## Example: How `SPT3GDataset` Extends `BaseDataset`

`SPT3GDataset` in `src/anldq/datasets/subclass/spt.py` is a good example because it reuses the shared pipeline and overrides only the pieces that are SPT-specific.

SPT mainly customizes:
- `_load_raw()` for `.g3` and HDF5 input handling plus detector metadata
- `_apply_pre_transform()` for NaN interpolation before scaling
- `_apply_split()` for split-specific timestamp trimming
- `_apply_baseline()` for rolling or constant baseline removal
- `_apply_channel_mask()` for keeping detector, wafer, and band metadata aligned
- `scale_impl()` for custom per-channel robust scaling

That is the intended extension model for new dataset classes: keep `_build()` and replace only the hooks that need domain knowledge.

