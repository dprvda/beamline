# Beamline UI: free sample

**React components built for AI coding agents.** Beamline gives Claude Code, Codex, Cursor or any MCP client a
designed part for every job, tells the agent what each one is for and what to use instead, and installs only what a
screen needs into your repo. The app your agent builds looks designed, because every part in it was.

This repository is Beamline's **free sample**: 26 components and a complete settings screen as editable React source,
under MIT, with a starter app that runs them. The complete system (190 parts, including tables, charts, dashboards,
AI agent workspaces, voice and trading screens) is at **[beamline.io](https://beamline.io)**.

![Beamline: designed parts your coding agent snaps onto your app](https://beamline.io/components/og.png)

## Run it

```bash
git clone https://github.com/dprvda/beamline.git
cd beamline
npm install
npm run dev
```

It opens the [settings](https://beamline.io/components/settings) screen in the Prism look, dark, on demo data that
saves to your browser. React 19, Vite, Tailwind v4.

## What is in the sample

| part | what it is for |
|---|---|
| [Settings](https://beamline.io/components/settings) | the whole settings area: profile, workspace, members, billing, API keys, one draft and a real save handler |
| [Button](https://beamline.io/components/button) | the action control: five weights and a brand fill, three sizes and a 44 px touch size |
| [Input](https://beamline.io/components/input) | a text field with its label, help and error wired for assistive tech |
| [Label](https://beamline.io/components/label) | the label tied to a control, with a required marker screen readers announce |
| [Select](https://beamline.io/components/select) | one choice from a short known list |
| [Combobox](https://beamline.io/components/combobox) | one value from a long list found by typing (time zones, countries, customers) |
| [Tag input](https://beamline.io/components/tag-input) | short free-form values as tags; a pasted list adds them all |
| [Switch](https://beamline.io/components/switch) | a setting that applies at once |
| [Segmented control](https://beamline.io/components/segmented-control) | two to five views or ranges of the same content |
| [Radio cards](https://beamline.io/components/radio-cards) | one choice among rich options, as cards |
| [Billing toggle](https://beamline.io/components/billing-toggle) | monthly or yearly, saying what the choice saves |
| [Hold to confirm](https://beamline.io/components/hold-to-confirm) | a costly action confirmed by holding, not clicking |
| [Copy button](https://beamline.io/components/copy-button) | copies a value and confirms in place |
| [Dialog](https://beamline.io/components/dialog) | a focused task over the page, focus trapped and returned |
| [Alert dialog](https://beamline.io/components/alert-dialog) | a blocking confirmation that starts on the safe choice |
| [Bottom sheet](https://beamline.io/components/bottom-sheet) | a phone panel that follows the finger |
| [Dropdown menu](https://beamline.io/components/dropdown-menu) | actions behind a trigger, with shortcuts, checks and submenus |
| [Toast](https://beamline.io/components/toast) | results of an action, stacked at an edge, with undo |
| [Alert](https://beamline.io/components/alert) | a message that stays until it is dealt with |
| [Badge](https://beamline.io/components/badge) | a short status, category or count |
| [Avatar](https://beamline.io/components/avatar) | a person or account in a small space |
| [Item](https://beamline.io/components/item) | the generic list row |
| [Table](https://beamline.io/components/table) | a styled HTML table for small static data |
| [Tabs](https://beamline.io/components/tabs) | switches between panels of one object |
| [Spinner](https://beamline.io/components/spinner) | spins while work runs, closes into a check or a cross |
| [Usage meter](https://beamline.io/components/usage-meter) | an allowance and what fills it |
| [UI root](https://beamline.io/components/ui-root) | makes a region of any app a Beamline root: theme, brand, direction |

Every part is live, with every example, in the [component library](https://beamline.io/components/).

## How it is built

- **Every part has the same API.** `variant`, `size` and `tone`; `value`, `defaultValue` and `onValueChange` for
  anything stateful; `className` lands on the root and wins. Use one and you can use any other.
- **One brand colour themes everything.** Set `brand` on `UIRoot` and the accent, hover, focus ring, selection and the
  text on brand fills all follow, keeping 4.5:1 contrast. Nine looks change type, surfaces and motion at once
  ([theming guide](https://beamline.io/guides/theme-react-components-brand-colour)).
- **Dark first, keyboard first.** Designed dark at desktop width first; every part has its keyboard model and visible
  focus.
- **Honest data.** A missing value draws as unmeasured, never as zero, and colour is never the only signal.

## Use it with your coding agent

The complete system reaches your agent through Beamline's MCP server, `https://mcp.beamline.io/mcp`. Sign in with
Google, GitHub or an e-mail code: the free sample opens at once.

```bash
claude mcp add --transport http --scope user beamline https://mcp.beamline.io/mcp   # Claude Code
codex mcp add beamline --url https://mcp.beamline.io/mcp                             # Codex
```

This repository's `.mcp.json` and `.cursor/mcp.json` already name the server, so Claude Code and Cursor offer it when
you open the folder.
Every agent's steps: [beamline.io/connect](https://beamline.io/connect).

## Learn more

- [Docs](https://beamline.io/docs): install, customise, connect your data, conventions, design language
  (also on [GitBook](https://beamline.gitbook.io/beamline-docs/))
- [Guides](https://beamline.io/guides): give your agent a component system, build a trading terminal, an AI agent
  interface, an analytics dashboard, a settings page, sign-in, a voice agent, a data grid
- [How Beamline compares](https://beamline.io/compare) with shadcn/ui, Untitled UI and MUI
- [Changelog](https://beamline.io/changelog)

## Licence

The code in this repository is MIT ([LICENSE](LICENSE)); the packages and fonts it uses are listed in
[NOTICE.md](NOTICE.md). The complete Beamline system is sold at [beamline.io](https://beamline.io): one payment, a year
of updates, one licence for your whole team. Made by Danylo Pravda in Kyiv, Ukraine. Questions:
[hello@beamline.io](mailto:hello@beamline.io).
