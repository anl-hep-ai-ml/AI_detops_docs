# SMAP — Soil Moisture Active Passive

SMAP is a multivariate time-series anomaly detection benchmark released by NASA's Jet Propulsion Laboratory. Despite the mission name, the benchmark dataset contains **spacecraft command and telemetry data**, not soil moisture measurements. Anomalies represent actual spacecraft faults identified by JPL engineers.

!!! note
    In the anomaly detection literature, "SMAP" refers to this telemetry dataset, not the scientific soil moisture product.

## Dataset Statistics

| Property | Value |
|---|---|
| Training samples | 135,183 |
| Test samples | 427,617 |
| Channels | 25 |
| Named subsequences | 55 |
| Anomaly rate | 13.1% |

## Citation

```
K. Hundman, V. Constantinou, C. Laporte, I. Colwell, T. Soderstrom.
"Detecting Spacecraft Anomalies Using LSTMs and Nonparametric Dynamic Thresholding."
KDD 2018.
```

## Results

!!! warning "Coming soon"
    Benchmark results will be added here.

| Model | F1 | Precision | Recall | AUC-ROC |
|---|---|---|---|---|
| TranAD | — | — | — | — |
| Isolation Forest | — | — | — | — |
| Z-Score | — | — | — | — |
