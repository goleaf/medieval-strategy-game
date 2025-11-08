# Alliance Diagram Assets

- `alliances-erd.mmd` — canonical Mermaid ERD source. Edit this file, then regenerate the SVG so designers and engineers stay in sync.
- `alliances-erd.svg` — rendered artifact embedded in specs/slides. Regenerate via `npm run diagrams:generate` (script wraps `mmdc`) or `npx @mermaid-js/mermaid-cli -i alliances-erd.mmd -o alliances-erd.svg`.
- `alliances-states.mmd` — Mermaid definition for membership, invite, application, and announcement state machines.
- `alliances-states.svg` — rendered export for the lifecycle diagrams (same generation command as above, swapping filenames).

Always include both files in the same commit so reviewers can diff the textual source and reference the rendered output.
