# AI for Detector Operations — Documentation

Public documentation for the cross-experimental AI for operations effort at [Argonne National Laboratory](https://www.anl.gov/). The site covers transformer-based anomaly detection applied to operational data streams from large-scale physics and astrophysics experiments, with the dual goals of new physics discovery and real-time hardware fault detection.

**Live site:** https://anl-hep-ai-ml.github.io/AI_detops_docs/

---

## Directory Structure

```
AI_detops_docs/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions — builds and deploys to GitHub Pages on push to main
├── docs/                   # all site content
│   ├── assets/             # all static files (logos, CSS, JS)
│   │   ├── logo/           # Argonne and DOE logos
│   │   ├── stylesheets/    # custom CSS
│   │   └── javascripts/    # MathJax config and footer logo injection
│   ├── what_is_ad/         # anomaly detection overview and method documentation
│   ├── what_is_agentic_ai/ # agentic AI concepts, RAG, MCP, and frameworks
│   ├── experiments/        # per-experiment summaries (ATLAS, Muon g-2, SPT-3G, DUNE)
│   ├── technical_docs/     # shared technical reference pages such as BaseDataset
│   └── meeting_notes/      # dated meeting and event notes
├── requirements.txt        # pinned Python dependencies
└── zensical.toml           # site config: nav, theme, markdown extensions
```

Content is organised into five areas:

- **`what_is_ad/`** — high-level anomaly detection concepts, the transformer-based approach, and a baseline methods reference.
- **`what_is_agentic_ai/`** — agentic AI concepts including RAG, MCP servers, and framework comparisons.
- **`experiments/`** — one page per experiment covering detector context, data characteristics, and the AD application.
- **`technical_docs/`** — shared implementation and reference documentation such as `BaseDataset`.
- **`meeting_notes/`** — dated notes from meetings, workshops, and hackathons.

---

## Local Development

The site is built with [Zensical](https://zensical.org/docs/), the successor to Material for MkDocs.

**Prerequisites:** Python ≥ 3.10

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Serve locally with live reload:**

```bash
zensical serve
```

The site is available at `http://localhost:8000`. Any edit to `docs/` or `zensical.toml` triggers an automatic rebuild and browser refresh.

**One-off build** (output written to `site/`):

```bash
zensical build --clean --strict
```

`--strict` promotes warnings (broken anchors, missing files) to errors — the same flag used in CI. Run this before pushing to catch issues early.

---

## Deployment

The site is deployed to [GitHub Pages](https://pages.github.com/) via GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`.

**Trigger:** any push to `main`.

**Pipeline steps:**

1. `actions/configure-pages` — configures the GitHub Pages environment
2. `actions/checkout` — checks out the repository
3. `actions/setup-python` — sets up Python 3.x
4. `pip install -r requirements.txt` — installs pinned Zensical version
5. `zensical build --clean --strict` — builds the static site into `site/`
6. `actions/upload-pages-artifact` — uploads `site/` as a Pages artifact
7. `actions/deploy-pages` — publishes to GitHub Pages

**Required GitHub repository setting:** Settings → Pages → Source must be set to **GitHub Actions** (not "Deploy from a branch"). This only needs to be configured once.

The deployed URL is `https://anl-hep-ai-ml.github.io/AI_detops_docs/`.

---

## Contact

For questions, contact [whopkins@anl.gov](mailto:whopkins@anl.gov).
