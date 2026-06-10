# What is Anomaly Detection?

Anomaly detection (AD) is the task of identifying data points or time windows that deviate significantly from expected behaviour, without requiring labelled examples of anomalies in advance. In the context of physics detector operations, AD serves two roles:

- **Hardware monitoring:** Flagging sensor faults, gain drift, or readout failures in real time during data-taking
- **Physics searches:** Identifying statistically unusual events that may indicate new or unexpected physical processes

## Approach

This project applies AD to multivariate time-series data collected directly from detector readout systems. Rather than operating on fully reconstructed physics objects, models are applied at a lower level — closer to the raw data stream — to preserve sensitivity to signals that may be lost in the reconstruction chain.

See [Transformer-based AD](transformer_ad.md) for the primary method and [Baseline Methods](baselines.md) for the classical comparison methods.
