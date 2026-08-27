# Methodology

This section describes **how this project does anomaly detection** — the scientific approach, the shared pipeline, the models, and the repository that implements it all.

The core idea is simple and deliberately uniform across every experiment: train a model on normal detector operation, score new data by how badly the model reconstructs it, and turn that score into anomaly flags. What changes between experiments is the *data*, not the *method*. A single shared framework (`anldq`) runs the same five-stage pipeline on data from any supported detector, with experiment-specific logic isolated behind a common interface.

```
Problem framing  ─►  Shared pipeline  ─►  Model + scoring  ─►  Per-experiment results
   (why AD?)          (five stages)       (TranAD + eval)        (SPT, ATLAS, g-2)
```

## Read in Order

| Page | What it answers |
|---|---|
| [Problem Framing](problem_framing.md) | Why anomaly detection for detector operations, what counts as an anomaly, and why the framework is cross-experimental |
| [Core Workflow](core_workflow.md) | The five-stage pipeline from raw data to evaluated anomaly scores, with a full code example |
| [Models & Scoring](models_scoring.md) | The models available (default: TranAD), how reconstruction error becomes a score, and how scores are thresholded and evaluated |
| [Repository Overview](repo_overview.md) | Where everything lives: repository layout, supported experiments, shared components, and compute targets |

Once you understand the method here, the [Experiments](../../experiments/index.md) section shows it applied to real detector data, and the [Technical Docs](../../technical_docs/index.md) give the implementation-level detail.
