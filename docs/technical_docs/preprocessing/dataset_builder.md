# Dataset Builder

The dataset builder is the layer that turns resolver output into concrete dataset objects.

It lives in `src/anldq/datasets/builder.py` and is the bridge between:

- configuration resolution in [Dataset Resolvers](dataset_resolvers.md)
- dataset implementation in [BaseDataset](base_dataset.md) and `datasets/subclass/`

## Role in the Pipeline

At a methodology level, the builder is where the repo guarantees that train, val, and test are constructed consistently.

At a technical level, it is responsible for:

- choosing the right dataset subclass from the registry
- building the split plan for one logical split
- selecting the correct input paths for that split
- translating policy dictionaries into dataset constructor kwargs
- reusing train-fitted scaler and baseline state when configured

## Public API

The main entry points are:

- `build_dataset(resolved, split=...)`
- `build_data_splits(resolved)`
- `build_data` as a compatibility alias

Most user code reaches these indirectly through `load_dataset(...)`.

## `build_dataset()` Flow

`build_dataset()` constructs one split at a time.

The call flow is:

1. Normalize the resolved config with `_normalize_resolved()`
2. Read `family`, `source`, `split`, `policy`, and `meta`
3. Look up the dataset class with `get_dataset_cls(family)`
4. Build a split plan with `make_split_plan(...)`
5. Extract the correct file path subset with `unzip_data_paths_for_split(...)`
6. Convert policy blocks into dataset kwargs with `convert_resolved_policy_to_dataset_kwargs(...)`
7. Construct `data_tag`
8. Instantiate the dataset subclass
9. Attach `ds.data_tag` and return the dataset object

## Why the Builder Exists

Without the builder, each training script would need to duplicate logic for:

- split selection
- scaler reuse between splits
- baseline reuse between splits
- family-specific path normalization
- passing the right constructor kwargs into each dataset subclass

Centralizing that logic makes the methodology reproducible and keeps experiment scripts thin.

## `build_data_splits()` Flow

`build_data_splits()` builds the full `{train, val, test}` set.

Its important behavior is state reuse.

### Scaler reuse

The builder checks the scaling policy and then either:

- fits a scaler on train and injects it into val/test, or
- lets each split fit its own scaler

The main switch is `scaling_source`.

| `scaling_source` | Behavior |
|---|---|
| `train_set_fit` | Train split fits the scaler; val/test receive `inject_scaler_state=train_ds.fitted_scaler` |
| `per_set_fit` | Each split fits independently |

This is one of the key anti-leakage controls in the repo.

### Baseline reuse

Baseline state is handled similarly, but with an additional full-data mode.

| Baseline setting | Behavior |
|---|---|
| per-split baseline | Each split computes its own baseline |
| `per_file_channel_time_mean` | Train computes baseline; val/test reuse it |
| `per_file_channel_time_mean_fulldata` | Builder first creates an unsplit temporary dataset, computes full-data offsets, then injects that shared state into all splits |

The full-data path is implemented in `_compute_fulldata_baseline()`.

## Full-Data Baseline Path

This is the most specialized part of the builder.

When `should_compute_fulldata_baseline(...)` is true, the builder:

1. Constructs a temporary unsplit dataset using `PhysicalSplit(split="train")`
2. Disables baseline application while loading
3. Reads `raw_data` and grouped file lengths from `fulldata_ds.meta`
4. Computes a per-file offset tensor for each segment
5. Returns an injectable baseline state
6. Uses that same baseline state for train, val, and test

This is useful for experiments where baseline estimation should represent the full dataset rather than the training subset only.

## Key Helper Modules

The builder depends on three helper areas:

- `src/anldq/datasets/_builder_utils/split.py`
- `src/anldq/datasets/_builder_utils/unzip_path.py`
- `src/anldq/datasets/_builder_utils/policy_map.py`

Their roles are:

- split helper: build the correct logical `SplitPlan`
- unzip helper: normalize resolver-returned path structures into split-specific file paths
- policy map helper: flatten high-level policy blocks into constructor kwargs understood by `BaseDataset`

## Common Runtime Pattern

```python
from anldq.datasets import load_dataset

train, val, test = load_dataset(
    "gm2",
    load_all_newformat2=True,
)
```

Under the hood, this goes through:

1. [resolver output](dataset_resolvers.md)
2. `build_data_splits(resolved)`
3. `build_dataset(..., split="train")`
4. optional scaler and baseline state injection into val/test

## Methodological Significance

The builder is the repo's consistency layer.

It enforces these rules across all experiments:

- the same resolved config produces the same split construction rules
- preprocessing policy is applied uniformly across families
- stateful preprocessing is reused in a controlled way
- train, val, and test are built from a single source of truth

That is why it belongs in the low-level technical docs for the pipeline: it operationalizes the methodology described in the [overview pages](../../overview/methodology/core_workflow.md).

## Source References

- `src/anldq/datasets/builder.py`
- `src/anldq/datasets/_builder_utils/policy_map.py`
- `src/anldq/datasets/_builder_utils/split.py`
- `src/anldq/datasets/_builder_utils/unzip_path.py`
- `src/anldq/datasets/subclass/registry.py`
