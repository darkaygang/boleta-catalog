# BDV Branding Reference Pack

This is a design/reference bundle for the BDV / ARCHIVE storefront redesign.

### Contents
- `assets/bdv-logo-original.png` — canonical BDV logo.
- `reference/bdv-archive-ui-target.png` — generated UI/UX target board.
- `reference/current-catalog-screenshot.png` — screenshot of the existing catalog.
- `docs/BRAND_BRIEF.md` — brand and UX rules.
- `docs/ORCHESTRATOR_REQUEST.md` — prompt request for an orchestration AI to generate the execution-ready coding prompt.
- `docs/KIMI_DIRECTIVE.md` — direct engineering directive for Kimi K3/OpenCode.

### Intended use
Attach the ZIP to the orchestration AI and also attach/show the target UI image. The orchestration AI should inspect these references and produce the final execution plan/prompt for Kimi K3.

The existing broken starter implementation is intentionally not included here: the goal is for the coding agents to inspect the actual repository and rebuild/refine it from the real source of truth.
