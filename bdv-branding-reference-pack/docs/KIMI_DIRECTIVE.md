# Direct implementation directive for Kimi K3 / OpenCode

Before coding:
1. Inspect the entire repository and determine the actual framework, entry point, scripts, data model, routing, and current build status.
2. Read the assets and visual references in this pack.
3. Make a short internal implementation plan based on the existing code; do not replace working logic merely for style.

During coding:
- Implement the BDV / ARCHIVE visual system from the reference image.
- Prefer reusable components and design tokens.
- Keep the logo canonical.
- Make the storefront feel like a premium underground archive, not an admin dashboard.
- Make "MI PEDIDO" the persistent order surface.
- Optimize for WhatsApp conversion.
- Preserve or migrate existing product data rather than inventing a new incompatible schema.
- Never use placeholder copy where real project data already exists.
- Do not introduce a dependency unless it materially improves the implementation.

After coding:
- Run install/build/typecheck/lint commands that exist in the repository.
- Open or render the site at both mobile and desktop breakpoints.
- Fix visual regressions and runtime errors.
- Verify that the order-to-WhatsApp flow works end-to-end.
- Report changed files, test results, known limitations, and any assumptions.
