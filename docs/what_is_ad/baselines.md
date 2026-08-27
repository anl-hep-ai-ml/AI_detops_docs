# Baseline Methods

In addition to transformer-based models, the framework ships a set of classical and statistical anomaly-detection baselines. They serve two purposes: as **comparison points** for benchmarking the deep-learning models, and as **lightweight alternatives** for settings where a full neural model is not practical.

## Available Baselines

| Baseline | Category | Idea |
|---|---|---|
| `ZScore` | Classical | Flags points far from the mean in standard deviations |
| `RobustZ` | Classical | Z-score variant using median and MAD, resistant to outliers |
| `EWMA` | Classical | Exponentially weighted moving average; good for slow drift |
| `Range` | Classical | Simple min/max range check |
| `Quantile` | Classical | Flags values beyond configured quantiles |
| `DBSCAN` | Machine learning | Density-based clustering; points in low-density regions are anomalies |
| `ChannelGroup` | Physics-specialized | Flags channels that deviate from their peer group's median |
| `Merlin` | Advanced | Discord-based detector for heavy-tailed time-series |
| `Oneline` | Advanced | Streaming/online detector |

## Baseline Recommendation

The framework includes a heuristic recommender (`recommend_baseline`) that inspects a dataset's basic statistics — spread, tail heaviness (skew/kurtosis), temporal drift, and inter-channel correlation — and suggests a suitable baseline. For example, heavy-tailed single-channel data is steered toward `RobustZ` or `Merlin`, drifting data toward `EWMA`, and strongly correlated multi-channel data toward `ChannelGroup`. The recommender is a rules-based helper; it does not train or run any model itself.

!!! note "Benchmark results coming"
    Head-to-head benchmark numbers comparing these baselines against TranAD on experimental data will be added here as the framework is validated.
