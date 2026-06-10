# Transformer-based Anomaly Detection

## Core Idea

The primary approach used in this project is **forecasting-based anomaly detection** with transformer models. A model is trained on normal operational data to predict or reconstruct windows of the input time-series. At inference time, high reconstruction loss in a given window indicates that the data deviates from learned normal behaviour — this excess loss is used as an anomaly score.

This approach is fully unsupervised: no labelled anomalies are required for training.

## TranAD

The main model used is **TranAD** (Tuli et al., VLDB 2022), a deep transformer network designed specifically for multivariate time-series anomaly detection. Key properties:

- Processes all input channels simultaneously, capturing cross-channel correlations
- Uses a two-phase encoder-decoder structure that progressively focuses attention on anomalous regions
- Incorporates adversarial training to amplify anomaly scores and improve sensitivity
- Supports meta-learning (MAML) for fast adaptation with limited labelled data

TranAD was originally benchmarked on datasets including SMAP, MSL, SMD, and SWAT, where it achieves state-of-the-art F1 scores. See the [Benchmarks](../benchmarks/index.md) section for results.

!!! note "More detail coming"
    A full technical breakdown of the TranAD architecture, loss functions, and training procedure will be added here once the framework is validated on experimental data.

## Citation

```
S. Tuli, G. Casale, N. R. Jennings.
"TranAD: Deep Transformer Networks for Anomaly Detection in Multivariate Time Series Data."
VLDB, 2022.
```
