# SPT Preprocessing

This page documents the preprocessing steps applied to SPT data before training and inference.

## Where SPT Fits In The Shared Pipeline

SPT runs through the same fixed `BaseDataset._build()` order as every other dataset — load, time mask, channel mask, split, NaN, baseline, scale. See [BaseDataset → Pipeline Overview](../../technical_docs/preprocessing/base_dataset.md#pipeline-overview) for the full order and what each stage does.

This page only covers the stages where the SPT subclass replaces the generic behavior with SPT-3G-specific logic:

| Stage | SPT override | Why |
|---|---|---|
| Load / trim | `_load_calibrator_response_hdf5()` | Reads season HDF5 files and applies detector and timestamp cuts |
| NaN | `_apply_pre_transform()` | Interpolates NaNs per channel in time before scaling |
| Split | `_apply_split()` | Optional post-split timestamp trimming |
| Baseline | `_apply_baseline()` | Adds a time-dependent (rolling) baseline mode |
| Scale | `scale_impl()` | Custom vectorized per-channel robust scaler |
| Channel mask | `_apply_channel_mask()` | Keeps detector, wafer, and band metadata aligned |

The generic baseline and scaling knobs these overrides consume are documented in [Baseline and Scaling Policy](../../technical_docs/preprocessing/base_dataset.md#baseline-and-scaling-policy).

## Detector Trimming

For HDF5 calibrator-response inputs, detector trimming happens inside `_load_calibrator_response_hdf5()` before the array is handed back to the shared pipeline.

The detector-quality cut keeps detectors whose low and high quantiles stay close to the detector median:

- quantiles from `detector_stability_quantiles`, default `[10.0, 90.0]`
- tolerance from `detector_stability_tolerance`, default `0.10`

In code terms, the detector is kept only if its percentile envelope stays within roughly `median +/- 10%`.

For `data_variant="snr"`, this cut can still be computed on the companion raw-response files when `detector_selection_source="response"`.

## Timestamp Trimming

Timestamp trimming is also SPT-specific.

The timestamp-quality cut removes rows where any kept detector fails the configured value checks:

- finite
- positive if `require_positive=true`
- above the lower quantile bound
- below the upper quantile bound unless the upper quantile is `100`

The default YAML settings are:

- `response: [1.0, 99.0]`
- `snr: [1.0, 100.0]`

That means the `snr` path keeps the upper side open and only trims low-SNR outliers.

Two modes are supported:

- `trim_test_timestamps: true`
  trims before splitting, so train/val/test all inherit only clean timestamps
- `trim_test_timestamps: false`
  split first, then only trim the splits named in `trim_timestamp_splits`

The histogram workflow uses `trim_test_timestamps=False` so the held-out test split still contains low-SNR observations that should show up in the error-vs-SNR plots.

## NaN Handling

SPT applies a pre-transform interpolation step before scaling. `_apply_pre_transform()` converts timestamps to seconds and calls `interp_nans_per_channel(data, ts_sec)` so each detector channel is linearly interpolated in time. Because SPT cleans NaNs here, the generic `nan.enable` path stays off in the config.

## Baseline Removal

Baseline removal is disabled by default for SPT (`policy.baseline.enable: false`). The generic knobs are documented in [Baseline and Scaling Policy](../../technical_docs/preprocessing/base_dataset.md#baseline-and-scaling-policy).

The one SPT-specific addition is that `_apply_baseline()` supports a **time-dependent (rolling) baseline** in addition to the generic constant offset. When enabled with `baseline_type` set to the rolling mode, SPT calls `rolling_baseline_remove()` with the configured `window` and `stride`.

## Scaling

SPT replaces the generic scaler by overriding `scale_impl()` with a vectorized per-channel robust scaler. For each detector channel it computes:

- `center = median`
- `scale = q75 - q25`

The fitted state is stored as a small dictionary (`kind: spt_vectorized_robust`, `center`, `scale`) rather than an sklearn object. It still honors the generic `scaling_source: train_set_fit` behavior — fit on train, reuse on validation and test — described in [Baseline and Scaling Policy](../../technical_docs/preprocessing/base_dataset.md#baseline-and-scaling-policy).

## Channel Labels For Histogram Analysis

A recent SPT-specific addition is `label_from_snr=True`.

When enabled together with `data_variant="snr"`, the loader stores the raw SNR matrix as `channel_labels` before the shared masking and split operations run. Because `BaseDataset`, `apply_time_mask()`, and `apply_split_plan()` now propagate `channel_labels`, the final test split still carries an SNR matrix aligned with the inference error map.

That alignment is what makes `scripts/spt/plot_spt_histogram.py` work.

## Related Pages

- [SPT Overview](index.md)
- [SPT Data Loading](data_loading.md)
- [SPT Training](training.md)
- [SPT Histograms](histograms.md)
- [Preprocessing](../../technical_docs/preprocessing/index.md)
- [BaseDataset](../../technical_docs/preprocessing/base_dataset.md)
- [Dataset Resolvers](../../technical_docs/preprocessing/dataset_resolvers.md)
- [Dataset Builder](../../technical_docs/preprocessing/dataset_builder.md)
- [Training Pipeline](../../technical_docs/training/training_pipeline.md)
