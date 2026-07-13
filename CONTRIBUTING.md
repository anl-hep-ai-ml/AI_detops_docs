# Contributing

Contributions are welcome. Please read this guide before opening a pull request.

## Workflow

1. Fork the repository and create a branch from `main`
2. Make your changes (see content guidelines below)
3. Test locally — `zensical serve` and verify your changes render correctly
4. Run `zensical build --clean --strict` and confirm zero issues
5. Open a pull request against `main` with a clear description of what was added or changed

All PRs are built automatically by GitHub Actions. The deployment to GitHub Pages only occurs on merge to `main`.

## Content Guidelines

**Where to put new content:**

| Content type | Location |
|---|---|
| Anomaly detection concepts, methods, or models | `docs/what_is_ad/` |
| Agentic AI concepts, tooling, or workflows | `docs/what_is_agentic_ai/` |
| Experiment-specific context or results | `docs/experiments/` |
| Shared technical reference or implementation docs | `docs/technical_docs/` |
| Meeting or event notes | `docs/meeting_notes/` |
| Static images or figures | `docs/assets/<topic>/` |

**New pages must be added to `nav` in `zensical.toml`** or they will build but won't appear in the site navigation.

**Keep method documentation experiment-agnostic.** If a concept applies across experiments, document it in `docs/what_is_ad/` and link from experiment pages — do not duplicate content.

**New page in an existing section:**

1. Create a `.md` file in the relevant `docs/<section>/` directory
2. Add it to the `nav` in `zensical.toml`
3. Verify locally with `zensical serve`

**New experiment:**

1. Create `docs/experiments/<experiment>.md`
2. Add a nav entry under `Experiments` in `zensical.toml`
3. For methods shared with other experiments, add pages to `docs/what_is_ad/` and link from the experiment page

## Writing Style

- Technical and concise — this is a reference site, not a tutorial
- Prefer tables and bullet lists over prose for specifications and comparisons
- Use admonitions (`!!! note`, `!!! warning`) to flag caveats or work-in-progress sections
- LaTeX math via `$...$` (inline) and `$$...$$` (display) is supported on all pages

**Admonitions:**

```markdown
!!! note "Optional title"
    Body text indented by four spaces.

!!! warning
    Use for known issues or work-in-progress sections.
```

**Math:**

Inline: `$L = \frac{1}{n} \sum_{i=1}^{n} \| x_i - \hat{x}_i \|^2$`

Display:

```markdown
$$
\hat{x}_t = f_\theta(x_{t-W}, \ldots, x_{t-1})
$$
```

## Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
zensical serve
```

See [README.md](README.md) for full setup and deployment details.

## Contact

For questions, contact [whopkins@anl.gov](mailto:whopkins@anl.gov)
