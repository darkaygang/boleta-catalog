# Request to the orchestration AI

You are the lead product/design + frontend architect. The implementation will be executed by Kimi K3 through OpenCode CLI.

Using the attached visual references and the existing project, produce a complete implementation prompt/spec for an agentic workflow that can rebuild the BDV storefront in React.js.

The prompt you generate must:
- Treat `reference/bdv-archive-ui-target.png` as the primary visual reference.
- Treat `reference/current-catalog-screenshot.png` as the legacy behavior/content reference.
- Treat `assets/bdv-logo-original.png` as the canonical logo asset.
- Instruct agents to inspect the existing repository before changing anything.
- Preserve all working business logic, product data structures, category behavior, ordering logic, and integrations unless a change is explicitly required by the redesign.
- Avoid blindly trusting existing code; identify broken routes, build errors, dead components, and inconsistent state handling before implementation.
- Implement mobile-first responsive behavior and then scale to desktop.
- Build reusable React components and a coherent design system instead of page-specific hacks.
- Use accessible semantic HTML, keyboard navigation, focus states, reduced-motion support, sensible contrast, and usable touch targets.
- Keep the UI fast: lazy-load product imagery, avoid unnecessary dependencies, prevent layout shift, and avoid expensive effects on mobile.
- Model the made-to-order flow explicitly. This is a request/lead flow, not a fake instant-payment checkout.
- Use `MI PEDIDO`, `AÑADIR AL PEDIDO`, and `ENVIAR POR WHATSAPP` as the central order language.
- Require visual QA against the target reference at mobile and desktop widths.
- Require functional QA for search, filtering, sorting, product detail/quick view, add/remove/update quantity, order persistence during the session, and WhatsApp message generation.
- Require agents to run the project/build/tests and report exact failures instead of claiming success without verification.
- Produce an implementation checklist, architecture plan, component map, design tokens, route/state plan, QA checklist, and exact acceptance criteria.

Do not return a generic design description. Return an execution-ready prompt that another coding agent can follow step-by-step.
