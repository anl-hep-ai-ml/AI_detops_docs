# YAML-Driven Preprocessing

Reference notes for a preprocessing pipeline whose execution order is defined in YAML and resolved to Python callables at runtime.

This page summarizes the design pattern discussed in `yaml_driven_preprocessing.md` and maps it onto the current `PreprocessingPipeline` and `config_loader.py` implementation.

## Quick Start

If you only remember a few things, remember these:

1. YAML defines the ordered step list and per-step parameters.
2. A loader resolves YAML names to Python callables.
3. The pipeline runner executes the resolved steps in order.
4. The current implementation uses stateless functions for most transforms.
5. Stateful step objects are a better fit when a step must remember fitted values or shared context.

## Core Pattern

A config-driven preprocessing pipeline needs three parts:

| Part | Role | Typical representation |
|---|---|---|
| YAML config | Declares which steps run, in what order, and with what parameters | `list[dict]` or a mapping containing a `steps` list |
| Callable resolution | Maps a string from YAML to a real Python callable | `getattr(...)` or an explicit registry |
| Runner | Executes steps in order and passes data between them | `for` loop over resolved steps |

## YAML Shape

Minimal YAML structure:

```yaml
pipeline:
  - method: load_data
    args:
      path: "data.csv"
  - method: clean_data
  - method: normalize
    args:
      columns: ["a", "b"]
```

The current codebase uses a slightly richer schema:

```yaml
pipeline:
  steps:
    - type: filter
      function: clip_outliers
      params:
        threshold: 5
    - type: normalizer
      function: zscore_normalize
      params:
        columns: ["a", "b"]
```

Accepted top-level layouts:

| Layout | Example |
|---|---|
| `pipeline.steps` | `pipeline: { steps: [...] }` |
| direct list | `pipeline: [...]` |

Accepted step fields:

| Field | Meaning |
|---|---|
| `type` or `step` | Step category |
| `function` | Callable name to resolve |
| `params` | Optional keyword arguments |

## Step Type Mapping

The loader maps YAML step types to `PreprocessingPipeline` builder methods with an explicit registry:

```python
_STEP_ADDERS = {
    'filter': 'add_filter',
    'normalizer': 'add_normalizer',
    'imputer': 'add_imputer',
    'transform': 'add_transformer',
    'transformer': 'add_transformer',
    'reducer': 'add_reducer',
}
```

This registry serves two purposes:

- It defines the supported YAML vocabulary.
- It validates step types early by raising `ValueError` for unknown entries.

## Callable Resolution

Two patterns are relevant.

### Dynamic Bound-Method Lookup

For instance methods, YAML names can be resolved with `getattr`:

```python
method = getattr(instance, step["method"])
method(**kwargs)
```

This is simple and works well when YAML is written by the team and points to methods on a known object.

### Current Codebase Pattern

`config_loader.py` resolves free functions, not bound instance methods. `_get_function_from_string(...)` searches a fixed set of bundled modules and returns the matching callable.

| Resolution mode | Behavior |
|---|---|
| Default | Searches bundled preprocessing modules |
| `module_name` provided | Imports the named module and resolves from there |

Current limitation:

- `_get_function_from_string(...)` accepts `module_name`, but the pipeline builder does not pass it from YAML.
- That means YAML currently resolves functions only from the bundled preprocessing modules.
- Supporting external modules would require a per-step `module` field to be passed through.

## Runner Model

Two runner styles were discussed.

| Style | How data moves | Tradeoff |
|---|---|---|
| Shared mutable state | Steps read and write `self.data` | Simple, but harder to reason about and test |
| Explicit data threading | Each step takes input data and returns output data | Easier to test, reorder, and validate |

The current `PreprocessingPipeline.process(...)` implementation uses explicit data threading:

- Start with a copy of the input DataFrame.
- Iterate through `self.steps`.
- Read `type`, `function`, and `params` from each step entry.
- Call the resolved function with the current result.
- Replace `result` with the returned DataFrame.

This is the right default for shared preprocessing logic because the transformed dataset remains explicit at every stage.

## Step Representation

Each pipeline step is stored as a small record rather than a bare callable list.

| Key | Meaning |
|---|---|
| `type` | Logical step category |
| `function` | Resolved callable |
| `params` | Keyword arguments for execution |

That structure keeps the runner simple while preserving enough metadata for logging, validation, and debugging.

## Stateful vs Stateless Steps

The most important design distinction is between data state and configuration state.

| Kind of state | Example | Recommended location |
|---|---|---|
| Data state | The DataFrame being transformed | Explicit function input/output |
| Configuration or fitted state | Learned scaler statistics, DB connection, run metadata | Stateful object or pipeline context |

### Stateless Functions Fit Well When

- The transform is deterministic and does not need memory.
- The step should remain easy to unit test in isolation.
- The function should be reusable outside the pipeline system.
- YAML should remain simple and config-friendly.

Examples: filtering, dropping columns, clipping outliers, renaming fields.

### Stateful Objects Fit Better When

- A step must remember values learned from earlier data.
- A step depends on an expensive shared resource.
- Multiple steps need shared run-level context.
- The pipeline needs accumulated diagnostics or fit metadata.

Examples: learned imputers, scalers, cached models, shared DB sessions.

## Recommended Hybrid Pattern

A practical design is a hybrid model similar to scikit-learn:

- Keep stateless functions for simple one-shot transforms.
- Introduce small stateful objects for steps that need memory.
- Give stateful steps a narrow interface such as `fit(...)`, `transform(...)`, or `__call__(...)`.
- Let the runner dispatch uniformly based on the step object interface.

Representative execution pattern:

```python
for step in self.steps:
    func = step['function']
    params = step['params']
    if hasattr(func, 'transform'):
        result = func.transform(result, **params)
    else:
        result = func(result, **params)
```

This keeps existing functional transforms unchanged while allowing new stateful steps to join the same pipeline.

## Current Gaps and Follow-Up

| Gap | Why it matters | Likely fix |
|---|---|---|
| No YAML pass-through for `module_name` | External callables cannot be referenced directly | Add a per-step `module` field and pass it to resolver |
| Run-specific parameter injection is ad hoc | Context handling does not scale cleanly | Introduce pipeline-level context or stateful step objects |
| No first-class fit/transform lifecycle | Learned preprocessing state is awkward to model | Add a small stateful step interface |

## Best-Practice Summary

| Situation | Prefer |
|---|---|
| Deterministic transform with no memory | Stateless function |
| Learned preprocessing state | Stateful object with `fit` / `transform` |
| Shared external resource | Stateful object initialized once |
| Shared run context across many steps | Pipeline context or stateful object |
| Main data payload | Explicit input/output, not `self` |
