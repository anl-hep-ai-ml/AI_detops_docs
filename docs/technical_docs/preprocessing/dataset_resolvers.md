# Dataset Resolvers

Dataset resolvers are the configuration layer between a short dataset request such as `load_dataset("spt", years=[2021, 2022])` and the fully specified dataset build dictionary consumed by `src/anldq/datasets/builder.py`.

The resolver system lives in:

- `src/anldq/datasets/resolvers/yaml_resolver.py`
- `src/anldq/datasets/resolvers/default.py`
- `src/anldq/configs/data_config/`

## Purpose

Resolvers let the repository keep experiment-specific path logic, default preprocessing policy, and required runtime parameters in YAML rather than scattering them across training scripts.

A resolver is responsible for:

- Loading the family YAML file
- Merging YAML defaults with runtime overrides
- Validating required parameters
- Resolving concrete data file paths
- Building split and preprocessing policy dictionaries
- Injecting experiment metadata needed downstream

## End-to-End Flow

The main flow in `YAMLResolver.resolve(spec)` is:

1. Load `src/anldq/configs/data_config/{family}.yml`
2. Merge the YAML `defaults` block with user parameters from `spec`
3. Validate required keys with `_validate_params()``
4. Build `source` via `_build_source()` and `_resolve_data_paths()`
5. Build `split` via `_build_split()`
6. Build `policy` via `_build_policy()`
7. Build `meta` via `_build_meta()` and optional `_resolve_meta()`
8. Return a normalized resolved-data dictionary used by the dataset builder

The output has four top-level sections:

- `source`: file locations and source mode
- `split`: logical split configuration
- `policy`: scaling, baseline, masking, and NaN handling
- `meta`: dataset metadata and score aggregation config

## Public Entry Points

The main public APIs are:

- `create_yaml_resolver(family)`
- `resolver.resolve(spec)`
- `load_dataset(family, **params)` in `src/anldq/datasets/__init__.py`

In normal use, callers do not instantiate resolver classes directly. They call `load_dataset(...)`, which resolves YAML config and then calls the [dataset builder](dataset_builder.md).

## Resolver Output Shape

The resolved dictionary is designed to be consumed directly by `build_dataset()` or `build_data_splits()`.

```python
{
    "family": "spt",
    "params": {...},
    "source": {
        "data_source": "offline",
        "data_file_paths": ...,
    },
    "split": {
        "mode": "by_year",
        "ratio": [0.6, 0.2, 0.2],
        ...
    },
    "policy": {
        "scaling": {...},
        "baseline": {...},
        "mask": {...},
        "nan": {...},
    },
    "meta": {
        "data_tag": "...",
        "score_aggregation": {...},
        ...
    },
}
```

## Family-Specific Resolver Classes

The repo uses one resolver base class plus per-family subclasses.

| Class | Family | Main responsibility |
|---|---|---|
| `YAMLResolver` | generic | Shared YAML loading, merge, validation, and output assembly |
| `SPTYAMLResolver` | `spt` | Resolve per-year HDF5 paths, variant aliases, and rich detector metadata |
| `GM2YAMLResolver` | `gm2` | Resolve single-file, list, glob, or bulk multi-file loading |
| `HLTYAMLResolver` | `hlt` | Map user-facing HLT options to reduced or unreduced dataset families |
| `SMAPYAMLResolver` | `smap` | Resolve fixed train/test directories from templates |
| `MSLYAMLResolver` | `msl` | Same pattern as SMAP |
| `SMDYAMLResolver` | `smd` | Fill machine-specific path templates |
| `SWaTYAMLResolver` | `swat` | Resolve fixed normal/attack CSV paths |

## What SPT Adds

`SPTYAMLResolver` is the richest example and is a good reference for methodology docs because it shows how experiment-specific logic is isolated while the rest of the pipeline stays shared.

Notable SPT behavior:

- Builds HDF5 paths from `data_root`, `years`, and `data_variant`
- Normalizes aliases such as response-like and snr-like variant names
- Supports `detector_selection_source="response"` so detector stability cuts can be computed from response files and then applied to SNR data
- Injects SPT-specific metadata such as wafer identifiers, detector naming context, and score aggregation defaults
- Builds compact `data_tag` values used later in run naming

## What the YAML Files Define

The YAML files under `src/anldq/configs/data_config/` are the canonical place for default dataset policy.

Typical contents include:

- `required`: parameters that must be supplied at runtime
- `defaults`: preprocessing defaults and experiment defaults
- `path_templates` or family-specific file layout rules
- split strategy such as `fixed`, `by_year`, or `by_file_random`
- scaling policy such as robust or standard scaling
- baseline policy such as disabled, per-channel, or per-file baseline removal
- score aggregation defaults used after inference

This keeps the methodology reproducible: a training run is defined by one dataset family, one YAML config, and a set of runtime overrides.

## Split Strategies

The `split.strategy` key in a family YAML selects a split implementation from `src/anldq/datasets/process/split_time.py`. The string-to-class mapping lives in `src/anldq/datasets/_builder_utils/split.py`.

| `strategy` | Implementation | Behavior |
|---|---|---|
| `chronological` | `RatioSplit` | Split one combined, time-ordered array by ratio |
| `by_year` | `YearWiseRatioSplit` | Group rows by calendar year, split each year chronologically by ratio, then concatenate the split-specific pieces |
| `by_file` | `FileWiseRatioSplit` | Assign whole files to splits by ratio |
| `by_file_random` | `RandomFileWiseRatioSplit` | Same as `by_file` but with randomized file assignment |

`split.mode` selects between `auto` (split a combined array by `ratio`) and `fixed` (use pre-split files such as SMAP/MSL train and test directories).

`by_year` matters for experiments that span multiple observing seasons: it guarantees every season is represented in train, validation, and test, rather than letting one year dominate a single split.

## Why This Matters for the Pipeline

The resolver layer is where the repo turns a high-level methodological choice into a concrete technical build spec.

Examples:

- Choosing which `years` to include (for example 2019, 2020, 2021) changes which raw files are loaded
- Choosing `data_variant="snr"` changes both input files and label semantics for SPT
- Choosing a different split mode changes how [BaseDataset](base_dataset.md) `_apply_split()` is parameterized
- Choosing `scaling_source="train_set_fit"` determines whether the train-fitted scaler is reused by val and test

That means the resolver is the top of the low-level pipeline. Everything after it is implementation of a resolved plan.

## Minimal Usage Example

```python
from anldq.datasets import load_dataset

train, val, test = load_dataset(
    "spt",
    data_variant="snr",
    years=[2019, 2020, 2021],
    label_from_snr=True,
    label_snr_threshold=20.0,
)
```

This single call triggers:

1. YAML resolution for the `spt` family
2. Path resolution for the requested years and variant
3. Policy construction for scaling, baseline, masking, and splitting
4. Dataset building for train, val, and test

## Source References

- `src/anldq/datasets/resolvers/yaml_resolver.py`
- `src/anldq/configs/data_config/README.md`
- `src/anldq/datasets/builder.py`
- `src/anldq/datasets/__init__.py`
