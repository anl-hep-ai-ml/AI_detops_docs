# What is Anomaly Detection?

Anomaly detection (AD) is the task of identifying data points or time windows that deviate significantly from expected behaviour. In the settings this project cares about, AD is **unsupervised** or **self-supervised**: a model learns what "normal" looks like from unlabelled data, and anything that does not fit that learned normal is flagged as anomalous. No catalogue of known anomalies is required in advance.

This matters because in real operational systems, anomalies are rare, diverse, and often never seen before. Supervised classifiers need labelled examples of every failure mode; anomaly detection does not.

## How It Works

The general recipe used throughout this project is **reconstruction-based** (equivalently, forecasting-based) anomaly detection:

1. Train a model only on normal data, teaching it to reconstruct or predict the input.
2. At inference, feed the model new data and measure the reconstruction error.
3. Low error means the input resembles learned normal behaviour; high error means it does not.
4. The reconstruction error is used directly as a continuous **anomaly score**, which can then be thresholded.

Because the score is continuous rather than a binary label, it naturally grades severity and can be traced back to the individual channel or timestep responsible.

## Methods Used Here

| Page | What it covers |
|---|---|
| [Transformer-based AD](transformer_ad.md) | The primary deep-learning approach used in this project, centred on the TranAD model |
| [Baseline Methods](baselines.md) | Classical and statistical detectors used as comparison points and lightweight alternatives |

For how these concepts are applied specifically to detector operations, see [Problem Framing](../overview/methodology/problem_framing.md) in the Methodology section.
