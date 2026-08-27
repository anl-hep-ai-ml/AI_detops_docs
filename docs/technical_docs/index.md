# Technical Docs

Reference documentation for shared technical components used across the project.

## Pages

| Page | Description |
|---|---|
| [Preprocessing](preprocessing/index.md) | Shared dataset and preprocessing documentation, from YAML resolution through dataset construction |
| [Training](training/index.md) | Shared training pipeline documentation and experiment-specific training deep dives |
| [Inference](inference/index.md) | Shared inference pipeline documentation and experiment-specific inference outputs |
| [Analysis](analysis/index.md) | Shared score aggregation, thresholding, and evaluation documentation |
| [Future Features](future_features/index.md) | Forward-looking design notes, including YAML-defined preprocessing pipelines and extensible step composition |

## Direct Links

| Page | Description |
|---|---|
| [BaseDataset](preprocessing/base_dataset.md) | Shared dataset foundation and preprocessing pipeline for offline datasets in `anldq` |
| [Dataset Resolvers](preprocessing/dataset_resolvers.md) | How YAML config files are resolved into concrete source, split, policy, and metadata dictionaries |
| [Dataset Builder](preprocessing/dataset_builder.md) | How resolved dataset configs are turned into train, val, and test dataset objects with shared scaler and baseline reuse |
| [Training Pipeline](training/training_pipeline.md) | `build_trainer()`, `Trainer.train()`, scheduler handling, checkpointing, and runtime artifacts |
| [Inference Pipeline](inference/inference_pipeline.md) | `build_infer()`, `Infer.run()`, score aggregation, and saved inference outputs |
| [Analysis and Scoring](analysis/analysis_and_scoring.md) | Aggregation, thresholding, point adjustment, and metric computation |
| [YAML-Driven Preprocessing](future_features/yaml_driven_preprocessing.md) | Reference pattern for YAML-defined preprocessing pipelines, callable resolution, and stateful vs stateless step design |
