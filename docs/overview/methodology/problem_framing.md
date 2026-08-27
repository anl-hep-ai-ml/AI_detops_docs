# Problem Framing

This page explains *why* the project applies anomaly detection to detector operations, *what* is treated as an anomaly, and *how* one framework serves many experiments.

## Two Goals

The project pursues two complementary goals with the same tooling:

- **Real-time hardware fault detection.** Flag sensor faults, gain drift, readout failures, and other operational problems as they happen during data-taking, so shift crews can react before data is lost or corrupted.
- **Model-agnostic new-physics searches.** Identify statistically unusual events that may point to new or unexpected physical processes, without hard-coding what those processes look like.

Both goals reduce to the same computational question — *"is this data unlike the normal data the detector produces?"* — which is exactly what unsupervised anomaly detection answers.

## Why Operate on Low-Level Operational Data

Models are applied to **operational time-series taken close to the detector readout**, rather than to fully reconstructed physics objects. The reconstruction chain is designed to extract physics quantities of interest, and in doing so it discards information that looks like noise to the reconstruction but may actually signal a hardware fault or an unmodelled process. Operating on the lower-level monitoring streams **preserves sensitivity to signals that would be lost downstream**.

## What Counts as an Anomaly

Every dataset is normalised to the same shape — **`(T, C, D)`**: `T` timesteps, `C` channels (typically individual detectors or readout stations), and `D` features per channel. A model learns the normal joint behaviour of these channels over time. An anomaly is any window whose reconstruction error is large relative to normal, and the per-channel decomposition of that error tells you *which* detector is responsible and whether the problem is localised (a single bad channel) or coherent (a whole group drifting together).

## Cross-Experimental by Design

The defining architectural choice is that **experiment-specific logic is isolated from the shared pipeline**. Training, inference, and analysis code never import experiment code; they operate only on the common `(T, C, D)` representation. Each experiment plugs in through three narrow seams:

| Seam | Purpose |
|---|---|
| A YAML data config | Declares data paths, split strategy, preprocessing policy, and metadata |
| A `BaseDataset` subclass | Overrides only what is non-standard, chiefly how raw files are loaded |
| A registry entry | Maps a dataset family name (e.g. `spt`, `hlt`, `gm2`) to its class |

Because the shared pipeline is family-agnostic, adding a new detector is mostly a configuration exercise, not a code rewrite. This is what makes the framework genuinely cross-experimental. See [Repository Overview](repo_overview.md) for the concrete layout.

## Supported Experiments

| Experiment | Facility | Operational data | Channels | Format |
|---|---|---|---|---|
| [SPT-3G](../../experiments/spt/index.md) | South Pole | Calibrator-response detector-health summaries | Bolometers (TES) | HDF5 (legacy `.g3`) |
| [ATLAS HLT](../../experiments/atlas/index.md) | CERN LHC | High-Level Trigger rate/quality monitoring | Monitoring quantities | HDF5 |
| [Muon g-2](../../experiments/muon_gm2/index.md) | Fermilab | Per-station physical features (frequency, amplitude, …) | Ring stations | HDF5 |

Standard research benchmarks (SMAP, MSL, SMD, SWaT) are also supported and used to validate the models against published results; see [Experimental Results](../../experiments/index.md) for the experiment-facing documentation structure.
