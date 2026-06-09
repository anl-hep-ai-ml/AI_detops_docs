# Baseline Methods

In addition to transformer-based models, this project evaluates a range of classical and statistical anomaly detection baselines. These serve as comparison points for benchmarking and as lightweight alternatives for settings where deep learning is not practical.

| Method | Type | Description |
|---|---|---|
| Z-Score | Statistical | Flags values exceeding a threshold in units of standard deviations |
| EWMA | Statistical | Exponentially weighted moving average; sensitive to gradual drift |
| Isolation Forest | Tree-based | Detects anomalies by how easily a point is isolated in a random tree partition |
| Local Outlier Factor | Density-based | Compares local density of a point to its neighbours |
| PCA | Linear | Reconstructs data in a reduced subspace; high residual = anomaly |
| MERLIN | Statistical | Discord discovery in time-series via matrix profile |
| DBSCAN | Clustering | Density-based clustering; points in sparse regions flagged as outliers |

!!! note "More detail coming"
    Per-method documentation including parameter guidance and benchmark results will be added here.
