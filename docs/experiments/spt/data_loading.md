# SPT Data Loading

This page documents how the SPT workflow loads calibrator-response data into `SPT3GDataset`.

## Main Code Paths

The main implementation lives in:

- `src/anldq/datasets/subclass/spt.py`
- `src/anldq/configs/data_config/spt.yml`
- `src/anldq/datasets/resolvers/yaml_resolver.py`

The shared dataset builder and resolver stack handles SPT the same way as other experiments, but `SPT3GDataset` overrides the actual load path.

## Default Data Model

The resulting dataset presented to the model has shape `(T, C, 1)`:

- `T`: calibrator observations over time
- `C`: detectors that survive filtering
- `D=1`: one scalar per detector per observation

The full behavior is driven by one YAML file, shown and annotated below.

## Config Reference (`spt.yml`)

This is the complete SPT config at `src/anldq/configs/data_config/spt.yml`. The inline comments are part of the file and carry the rationale for each detector and timestamp cut.

```yaml
# =============================================================================
# SPT Calibration-Response Dataset Configuration
# =============================================================================

family: spt

labels:
  source: authentic

# -----------------------------------------------------------------------------
# Data Source
# Loads one HDF5 file per SPT-3G observing season.
# -----------------------------------------------------------------------------
source:
  data_source: offline
  data_format: calibrator_response_hdf5
  data_root: /lcrc/project/SPT3G/users/ac.weiquan/ml_dqm/calibrator_responses

# -----------------------------------------------------------------------------
# Train/Val/Test Split
# -----------------------------------------------------------------------------
split:
  mode: auto
  # Split each year chronologically, then concatenate split-specific pieces.
  strategy: by_year
  ratio: [0.6, 0.2, 0.2]

# -----------------------------------------------------------------------------
# Preprocessing Policy
# -----------------------------------------------------------------------------
policy:
  scaling:
    auto: true
    scaling_type: robust
    scaling_mode: per_dim
    scaling_source: train_set_fit
  baseline:
    enable: false
    type: constant
    estimator: null
    mode: per_channel
    axis: per_channel_time_mean
    stat: mean
    window: 201
    stride: 1
  mask:
    time_mask: null
    channel_mask: []

  nan:
    enable: false

score_aggregation:
  scores:
    - name: time
      level: time
      reduce:
        feature: {method: mean}
        channel: {method: mean}
    - name: channel
      level: channel
      reduce:
        feature: {method: mean}
        time: {method: mean}
    - name: group
      level: group
      reduce:
        feature: {method: mean}
        channel: {method: percentile, q: 95}

# -----------------------------------------------------------------------------
# Metadata
# -----------------------------------------------------------------------------
meta:
  # Keep only static metadata here.
  # Runtime-resolved fields should come from source/defaults/spec.params and be injected by resolver.
  has_group: true

# -----------------------------------------------------------------------------
# Default Parameters
# -----------------------------------------------------------------------------
defaults:
  data_format: calibrator_response_hdf5
  # Which calibrator quantity to train/infer on:
  #   response -> CalibratorResponse (calibrator_responses_*.hdf5)
  #   snr      -> CalibratorResponseSN, signal-to-noise of the response
  #               (calibrator_response_snrs_*.hdf5)
  data_variant: response
  # For the snr variant, the shared notebook computes the detector stability
  # cut on raw CalibratorResponse and applies the kept detectors to the S/N
  # data. "response" reproduces that; "self" computes the cut on the loaded
  # variant directly.
  detector_selection_source: response
  years: [2019, 2020, 2021, 2022, 2023]
  # A plain string here applies to whichever variant is selected; the mapping
  # form picks the entry matching data_variant.
  file_template:
    response: calibrator_responses_095ghz_{year}.hdf5
    snr: calibrator_response_snrs_095ghz_{year}.hdf5
  file_glob:
    response: calibrator_responses_095ghz_*.hdf5
    snr: calibrator_response_snrs_095ghz_*.hdf5
  max_files: null
  observation_id_key: Observation ID
  wafer_id: w206
  boloproperties_path: /lcrc/project/SPT3G/analysis/calarchive/v3/boloproperties/60000000.g3
  default_band_ghz: 95.0

  # Detector cut from the example notebook:
  # keep detectors whose 10/90 percentiles are within median +/- 10%.
  detector_stability_quantiles: [10.0, 90.0]
  detector_stability_tolerance: 0.10

  # Timestamp cut from the example notebook:
  # every kept detector must be positive, finite, and inside its low/high
  # percentiles. A mapping picks the entry matching data_variant; a plain list
  # applies to either variant. high=100 disables the upper cut — for the snr
  # variant only low S/N is anomalous, so no upper trim is applied.
  timestamp_value_quantiles:
    response: [1.0, 99.0]
    snr: [1.0, 100.0]
  require_positive: true
  # true keeps the original behavior: trim timestamps before splitting, so
  # train/val/test are all clean under the same rule. Set false for anomaly
  # evaluation: split first, then trim only trim_timestamp_splits.
  trim_test_timestamps: true
  trim_timestamp_splits: [train, val]

  # Legacy .g3 knobs are left null so old runtime overrides can still opt in
  # by setting data_format: g3.
  obs_id: null
  split_obs_ids: null
  file_ext: g3
  file_numbers: null
  scan_frames: all
  good_detectors_path: null
  min_meta_match_ratio: 0.5
  min_meta_match_count: 32

# -----------------------------------------------------------------------------
# Required Parameters
# -----------------------------------------------------------------------------
required: []
```

### What each key does

The **Scope** column marks whether a key is specific to SPT-3G or a generic policy shared by every dataset. Generic keys are documented in the technical docs; the SPT-specific keys are the ones that encode SPT-3G calibrator-response physics.

| Key | Scope | Meaning |
|---|---|---|
| `family` | generic | Selects the SPT resolver and `SPT3GDataset` |
| `labels.source` | generic | Declares the label provenance; for SPT the usable labels come from the SNR variant, not this field |
| `source.data_source` | generic | Offline (file-based) loading |
| `source.data_format` | SPT | `calibrator_response_hdf5` selects the HDF5 season-file loader over the legacy `.g3` path |
| `source.data_root` | SPT path | Directory of per-season HDF5 files; overridable at runtime with `--data_root` |
| `split.mode` / `split.strategy` / `split.ratio` | generic | `by_year` splits each observing season chronologically then concatenates — see [Split Strategies](../../technical_docs/preprocessing/dataset_resolvers.md#split-strategies) |
| `policy.scaling.*` | generic schema | Robust, per-dimension scaling fit on train and reused — see [Baseline and Scaling Policy](../../technical_docs/preprocessing/base_dataset.md#baseline-and-scaling-policy). SPT replaces the scaler implementation (see [Preprocessing](preprocessing.md)) |
| `policy.baseline.*` | generic schema | Baseline removal knobs; disabled by default for SPT |
| `policy.mask.*` | generic schema | `channel_mask: []` keeps all detectors |
| `policy.nan.enable` | generic | Generic NaN handler stays off; SPT interpolates NaNs itself |
| `score_aggregation` | generic feature | Defines the score levels produced at inference. SPT is notable for defining a `group` level (95th-percentile over each wafer group) |
| `meta.has_group` | SPT-relevant | `true` because SPT detectors are grouped by wafer, which enables the group-level score |
| `data_variant` | SPT | `response` (`CalibratorResponse`) or `snr` (`CalibratorResponseSN`) |
| `detector_selection_source` | SPT | For the `snr` variant, whether the detector-stability cut is computed on companion response files (`response`) or on the SNR data itself (`self`) |
| `years` | SPT | Which observing seasons to load |
| `file_template` / `file_glob` | SPT | Per-variant filename templates and globs |
| `max_files` | SPT | Optional cap on number of files loaded |
| `observation_id_key` | SPT | HDF5 key holding the per-observation timestamps |
| `wafer_id` | SPT | Restricts detectors to one wafer (`w206`) via the BolometerProperties file |
| `boloproperties_path` | SPT | `.g3` BolometerProperties file used for wafer filtering and grouping |
| `default_band_ghz` | SPT | Observing band assigned to HDF5 detectors (95 GHz) |
| `detector_stability_quantiles` / `detector_stability_tolerance` | SPT | Detector-quality cut: keep detectors whose 10/90 percentiles stay within median ± 10% |
| `timestamp_value_quantiles` / `require_positive` | SPT | Timestamp-quality cut; an upper quantile of `100` disables the upper trim (used for `snr`, where only low S/N is anomalous) |
| `trim_test_timestamps` / `trim_timestamp_splits` | SPT | Whether to trim before splitting (all splits clean) or split first and trim only listed splits |
| Legacy `.g3` knobs (`obs_id`, `split_obs_ids`, `file_ext`, `file_numbers`, `scan_frames`, `good_detectors_path`, `min_meta_match_ratio`, `min_meta_match_count`) | SPT | Only used when `data_format: g3` |
| `required` | generic | Runtime parameters that must be supplied; empty for the default HDF5 path |

For the generic mechanics behind the scaling, baseline, split, and score-aggregation keys, see [BaseDataset](../../technical_docs/preprocessing/base_dataset.md) and [Dataset Resolvers](../../technical_docs/preprocessing/dataset_resolvers.md).

## Two Supported Input Modes

`SPT3GDataset._load_raw()` supports two input families.

### Calibrator-Response HDF5

This is the default and the path used by the histogram workflow.

The loader:

1. Resolves one HDF5 file per observing season.
2. Reads the observation-id column from `Observation ID` by default.
3. Collects detector datasets from each file.
4. Finds the detector keys common across all requested years.
5. Optionally filters detectors to a single wafer using `boloproperties_path` and `wafer_id`.
6. Stacks the yearly payloads into a single `(T, C)` array.
7. Sorts timestamps if needed.
8. Stores metadata such as `det_names`, `headers`, `wafers`, and `channel_groups`.

This logic is implemented in:

- `_load_calibrator_response_hdf5()`
- `_read_calibrator_hdf5_seasons()`
- `_stack_season_payloads()`
- `_filter_hdf5_detectors_by_wafer()`

### Legacy `.g3` Scan Files

The class also supports `.g3` inputs using `spt3g.core.G3Pipeline`.

That path:

- reads `RawTimestreams_I` scan frames
- skips turnaround scans
- optionally filters to configured scan numbers
- optionally filters to a predefined detector allowlist
- concatenates scans in time
- aligns detector metadata from calibration files, simstub files, or scan fallback

This path is still part of the dataset class, but it is not the main path used by the current SPT histogram example.

!!! warning "Docs drift"
    The SPT example in `src/anldq/configs/data_config/README.md` documents the legacy `.g3` mode (`path_template`, `obs_id`, `meta_cal_root`, `meta_simstub_root`). That is not the current default. The default SPT path is the HDF5 calibrator-response loader shown in the config above; do not copy the `.g3` keys for HDF5 runs.

## Wafer Grouping

SPT detectors are grouped by wafer, and that grouping is what powers the `group`-level score in `score_aggregation`.

- `wafer_id: w206` restricts the loaded detectors to a single wafer using the BolometerProperties file at `boloproperties_path`.
- `SPT3GDataset.get_channel_group_from_meta()` maps each detector to a wafer group id, which populates `channel_groups`.
- Because `meta.has_group` is `true`, inference produces a `group` score that takes the 95th percentile of the error map across detectors within each wafer group.

This is the main reason the SPT config carries a third score level that simpler datasets do not.

## Data Variants

The SPT config supports two detector-level quantities:

- `response`: `CalibratorResponse`
- `snr`: `CalibratorResponseSN`

For the `snr` variant, `detector_selection_source` controls which data is used to compute the detector stability cut:

- `response`: compute the kept detector set from raw response files, then apply it to SNR data
- `self`: compute the kept detector set directly on the loaded SNR values

The default is `response`, which keeps the SNR workflow aligned with the raw-response trimming logic used in the shared notebook workflow.

## Loaded Metadata

After loading, the dataset keeps several aligned arrays and metadata fields:

- `timestamps`
- `headers`
- `det_names`
- `wafers`
- `bands`
- `channel_groups`
- `meta`

When `label_from_snr=True` and `data_variant="snr"`, the loader also stores the raw SNR matrix as `channel_labels`. That is the key hook used later by `scripts/spt/plot_spt_histogram.py`.

## Cache Behavior

`SPT3GDataset` uses class-level caches so repeated construction of train, val, and test splits does not keep re-reading the same immutable raw arrays and metadata.

The main caches are:

- `_RAW_OBS_CACHE`
- `_DET_META_CACHE`

The cache keys include the selected paths and important format settings such as `data_variant`, detector-selection settings, wafer selection, and trim controls.

## Related Pages

- [SPT Overview](index.md)
- [SPT Preprocessing](preprocessing.md)
- [SPT Training](training.md)
- [SPT Histograms](histograms.md)
- [Preprocessing](../../technical_docs/preprocessing/index.md)
- [BaseDataset](../../technical_docs/preprocessing/base_dataset.md)
- [Dataset Resolvers](../../technical_docs/preprocessing/dataset_resolvers.md)
- [Dataset Builder](../../technical_docs/preprocessing/dataset_builder.md)
