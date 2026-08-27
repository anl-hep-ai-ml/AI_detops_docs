# Experiments

This project is cross-experimental, applying a shared anomaly detection framework to operational data from multiple physics and astrophysics detectors. Each experiment has distinct data characteristics, channel counts, and anomaly types of interest.

| Experiment | Facility | Data Type | Status |
|---|---|---|---|
| [SPT-3G](spt/index.md) | South Pole | Bolometer calibrator-response streams | Documented |
| [ATLAS](atlas/index.md) | CERN LHC | HLT time-series, trigger rates | In progress |
| [Muon g-2](muon_gm2/index.md) | Fermilab | Per-station ring channels | In progress |

Each experiment applies the same shared pipeline described in the [Methodology](../overview/methodology/index.md); only the data loading and preprocessing differ. SPT-3G is the most fully documented; ATLAS and Muon g-2 pages are being filled in.
