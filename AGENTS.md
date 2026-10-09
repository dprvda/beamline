# Beamline UI (free sample): for coding agents

This repository is Beamline's free sample: editable React 19 source in `ui/` (26 components and the settings block)
and a Vite app in `src/` that renders it. Run `npm install && npm run dev`.

- Import parts by path: `@/components/<id>/<id>`, `@/blocks/<id>/<id>` (`@` is `ui/`, see `vite.config.ts`).
- Every part follows one API: `variant` · `size` · `tone`; `value` / `defaultValue` / `onValueChange` (also `open`,
  `selected`); `className` lands on the root. Each part's `ui/<kind>/<id>/meta.json` has its spec, props and examples.
- Use the most specific part for each piece of data: a number is not a text input, two to five choices are a segmented
  control or radio cards, not a select. Input, Select and a plain card need a reason.
- Style with tokens (`var(--pui-surface)`, `bg-surface`, `text-ink-2`), never hex. Set one brand colour on `UIRoot`.
- A missing value is `null` and draws as unmeasured, never as 0. Colour is never the only signal. Icons: lucide-react.

More parts (tables, charts, dashboards, AI agent, voice and trading screens): Beamline's MCP server
`https://mcp.beamline.io/mcp` (named in `.mcp.json`). Call `beamline_capabilities` first, `beamline_component` before
writing a part, `beamline_install` to add parts. Docs: https://beamline.io/docs
