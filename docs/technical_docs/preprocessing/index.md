# Preprocessing

This section collects the shared preprocessing and dataset-construction documentation used across experiments.

## Pages

| Page | Description |
|---|---|
| [BaseDataset](base_dataset.md) | Shared dataset foundation and preprocessing pipeline for offline datasets in `anldq` |
| [Dataset Resolvers](dataset_resolvers.md) | How YAML config files are resolved into concrete source, split, policy, and metadata dictionaries |
| [Dataset Builder](dataset_builder.md) | How resolved dataset configs are turned into train, val, and test dataset objects with shared scaler and baseline reuse |

## Experiment-Specific Deep Dives

| Page | Description |
|---|---|
| [SPT-3G Data Loading](../../experiments/spt/data_loading.md) | How `SPT3GDataset` loads calibrator-response files, resolves detector metadata, and exposes aligned detector arrays |
| [SPT-3G Preprocessing](../../experiments/spt/preprocessing.md) | Detector trimming, timestamp trimming, interpolation, baseline handling, and SPT robust scaling |
