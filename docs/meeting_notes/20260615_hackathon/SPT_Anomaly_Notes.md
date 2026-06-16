# Anomaly Detection on SPT Observation Data
**Presenters:** JJ, Wei
**Event:** Hardware-Aware AI Hackathon, June 15, 2026
**Topic:** Applying TranAD transformer-based anomaly detection to calibrator observation data from the South Pole Telescope (SPT-3G), compared against the traditional SNR-based method

---

## 1. Instrument Background: South Pole Telescope (SPT)

The **South Pole Telescope** is a 10-meter primary mirror telescope located at the South Pole. Its primary science goal is observing the **microwave sky** — specifically fluctuations in the **Cosmic Microwave Background (CMB)**.

The current receiver, **SPT-3G**, sits at the focal plane and contains the detector array. The optical chain from the primary mirror passes through a series of filters and lenses (including IR filters, field lenses, a Lyot stop, and a collimator lens), ultimately reaching the **image plane and detector array**, which is cooled to **315 mK**.

---

## 2. SPT-3G Detectors

- SPT-3G uses **Transition Edge Sensors (TES)** — extremely sensitive thermistors.
- Operating principle: a TES is biased at its superconducting transition point. Incoming radiation changes the temperature of the sensor, which changes its resistance, producing a measurable electrical signal.
- The array contains approximately **11,000 detectors** in total.

---

## 3. Calibrator Observations

To monitor detector health, SPT runs **calibrator observations**:

- The calibrator is **mounted behind the center of the secondary mirror**, normally hidden by a shutter.
- When exposed, it alternately emits radiation from **two blackbodies: 1000 K and 300 K**.
- SPT performs **a few tens of one-minute calibrator observations every day**.
- Purpose: **check detector aliveness** and **calibrate data** from CMB sky observations.

### Key Derived Quantities

From each one-minute calibrator observation, two quantities are computed per detector:

| Quantity | Definition |
|---|---|
| `CalibratorResponse` | Average peak-to-trough amplitude of the detector timestream over the one-minute observation \[fW\] |
| `CalibratorResponseSN` | Signal-to-noise ratio of the `CalibratorResponse` (unitless) |

A healthy detector should show a stable `CalibratorResponse` (~1.5 fW) and a high `CalibratorResponseSN` (~150–200) over time. Significant drops or spikes in either quantity can indicate detector or hardware problems.

---

## 4. Traditional SNR-Based Anomaly Detection

The current baseline approach for flagging anomalous calibrator observations uses a simple SNR count method:

1. **Count detectors per observation:** For each observation (time point), count how many detectors have `CalibratorResponseSN > 20`.
2. **Apply threshold → flag anomalies:** Compute the year-round median count. Any observation where the count falls below **median × 0.8** is flagged as anomalous.

This method is effective at catching **wafer-scale degradation** (many detectors going bad at once) but is blind to localized or subtle anomalies.

---

## 5. TranAD: Transformer-Based Anomaly Detection

**TranAD** is a transformer-based model for time-series anomaly detection with the following key properties:

- **Captures long-term temporal dependencies** more effectively than LSTM-based models.
- **Self-supervised training** — no anomaly labels required. Trained only on normal (good) data.
- **Outputs reconstruction error** of sliding time windows as anomaly scores — large reconstruction error indicates the observed pattern is unusual relative to what the model learned.

*Note: TranAD is the same model architecture used in the ATOM framework presented earlier in the workshop (see [ATOM Notes](Joaquin_Atom_Notes.md)). This presentation applies it independently to SPT data.*

---

## 6. TranAD Results: Ranked Reconstruction Errors

After training on SPT calibrator data, TranAD was used to score all observations. The top anomalies by reconstruction loss fall into three natural groups:

| Rank | Representative Date | Avg. Error Magnitude | Max Detector Contribution | Spatial Distribution | Physical Interpretation |
|---|---|---|---|---|---|
| 1–2 | 2019-10-09 | 10⁴–10⁵ | 91% (Detector 2019.7o8); 62% (Detector 2019.7pg) | Single-detector dominated | **Extreme outlier caused by two specific detectors** |
| 3–17 | 2019-10-10 | ~190 | 2.4% | Wafer-wide distributed | **Coherent detector response across the wafer** — consistent with a CryoBoard-related hardware issue |
| 18–30 | 2022-09-18… | ~10 | Top 3 detectors > 50% | Few-detector localized | **Weak localized anomalies** affecting only a handful of detectors; close to nominal operating behavior |

The natural separation in error magnitude (10⁴–10⁵ vs. ~190 vs. ~10) provides an automatic **severity ranking** without any additional labeling.

---

## 7. Advantages of TranAD Over Traditional SNR Detection

### 7.1 Rediscovers Traditional Anomalies (Sanity Check)
- TranAD independently recovers **nearly all anomalies already identified by the SNR method**, without ever seeing SNR data — only the raw response values.
- This serves as a **sanity check of model validity**.
- The few misses are caused by NaN values in the raw data that TranAD cannot process; all other anomalies are recovered.

### 7.2 Catches Anomalies the Traditional Method Misses
- **Example — 2019-10-10 (Ranks 3–17):** These anomalies are highly localized, involving only a small number of specific detectors (max 2.4% contribution per detector). The traditional SNR-based method was designed to detect **wafer-scale** degradation affecting many detectors simultaneously; localized anomalies like these fall through the threshold.
- TranAD flagged this cluster as a coherent hardware event (CryoBoard-related) that the SNR method entirely missed.

### 7.3 Continuous Severity Score + Fault Localization
- Instead of a binary good/bad label, TranAD outputs a **continuous reconstruction error** that naturally grades event severity:
  - **10⁴–10⁵** → single-detector blowout
  - **~10²** → full-wafer coherent drift (hardware issue)
  - **~10¹** → minor localized glitch
- **Per-channel decomposition** further pinpoints **which detector is at fault** and whether the issue is local (few detectors) or global (wafer-wide) — information the threshold method simply cannot provide.

---

## 8. Key Takeaways

1. **TranAD is a strong drop-in upgrade** over traditional SNR thresholding for calibrator anomaly detection — it recovers all known anomalies and discovers additional ones.
2. **Spatial distribution of reconstruction error** is the key diagnostic: a single-detector-dominated error points to a bad channel, a wafer-wide error points to a hardware/electronics issue (e.g., CryoBoard).
3. **No labels required** — TranAD trains on normal data only, making it practical for SPT where labeled anomaly datasets are sparse.
4. **Severity grading is automatic** — the reconstruction error magnitude provides a natural ordering that is more informative than a binary flag.
5. **Next steps** (implied): validate the CryoBoard hypothesis for the 2019-10-10 cluster; extend the approach to CMB sky observation data beyond calibrator runs; investigate the 2022 localized events further.
