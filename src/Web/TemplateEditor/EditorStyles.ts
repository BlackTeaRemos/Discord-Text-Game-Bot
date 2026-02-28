export function BuildEditorStyles(): string {
    return `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #09090b;
    color: #f4f4f5;
    line-height: 1.5;
}
.page-layout {
    display: grid;
    grid-template-columns: 340px 1fr;
    min-height: 100vh;
}
.main-content {
    padding: 20px 24px;
    overflow-y: auto;
}
h1 {
    text-align: center;
    margin-bottom: 8px;
    color: #f97316;
}
.editor-nav {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
}
.nav-link {
    color: #a1a1aa;
    text-decoration: none;
    font-size: 13px;
    padding: 4px 10px;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    transition: background 0.2s;
}
.nav-link:hover {
    background: #27272a;
}
h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #a1a1aa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 10px;
}
.editor-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}
@media (max-width: 1200px) {
    .page-layout { grid-template-columns: 300px 1fr; }
}
@media (max-width: 900px) {
    .page-layout { grid-template-columns: 1fr; }
    .dc-sidebar { height: auto; position: static; border-right: none; border-bottom: 1px solid #27272a; }
    .editor-layout { grid-template-columns: 1fr; }
}
.dc-sidebar {
    background: #18181b;
    border-right: 1px solid #27272a;
    padding: 16px;
    overflow-y: auto;
    height: 100vh;
    position: sticky;
    top: 0;
}
.dc-sidebar h2 {
    font-size: 14px;
    color: #f97316;
    margin: 0 0 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.dc-enable-row { margin-bottom: 12px; }
.dc-panel { margin-bottom: 12px; }
.dc-subtitle {
    font-size: 12px;
    color: #a1a1aa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}
.dc-style-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
}
.dc-style-field {
    display: flex;
    align-items: center;
    gap: 6px;
}
.dc-style-field label {
    font-size: 11px;
    color: #71717a;
    white-space: nowrap;
    min-width: 55px;
}
.dc-style-field input[type="color"] {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid #3f3f46;
    border-radius: 3px;
    cursor: pointer;
    background: transparent;
}
.dc-style-field input[type="number"] {
    width: 50px;
    padding: 4px 6px;
    font-size: 12px;
}
.form-panel, .preview-panel {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 6px;
    padding: 20px;
}
.preview-panel {
    position: sticky;
    top: 20px;
    align-self: start;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
}
.section {
    margin-bottom: 20px;
    border-bottom: 1px solid #27272a;
    padding-bottom: 16px;
}
.section:last-child { border-bottom: none; }
.field {
    margin-bottom: 10px;
}
.field label {
    display: block;
    font-size: 12px;
    color: #71717a;
    margin-bottom: 3px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
input, textarea, select {
    width: 100%;
    padding: 8px 12px;
    background: #09090b;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    color: #f4f4f5;
    font-size: 14px;
    font-family: inherit;
}
input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #f97316;
}
.param-row, .action-row {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 6px;
    margin-bottom: 10px;
    position: relative;
    overflow: hidden;
}
.action-row { padding: 12px; }
.param-row.dragging { opacity: 0.4; }
.param-key-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #18181b;
    border-bottom: 1px solid #27272a;
    cursor: grab;
    user-select: none;
    transition: background 0.15s;
}
.param-key-header:active { cursor: grabbing; }
.param-key-header:hover { background: #1e1e22; }
.param-key-header .param-drag-icon { color: #52525b; font-size: 14px; flex-shrink: 0; }
.param-key-header input[data-field="key"] {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    background: #09090b;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    color: #f97316;
    padding: 4px 8px;
    cursor: text;
}
.param-key-header .btn-remove {
    position: static;
    flex-shrink: 0;
}
.param-fields {
    padding: 10px 12px;
}
.param-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 100px 100px;
    gap: 8px;
}
.action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 140px 80px;
    gap: 8px;
}
.full-width { grid-column: 1 / -1; }
.btn-remove {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #7f1d1d;
    color: #fca5a5;
    border: 1px solid #ef4444;
    border-radius: 3px;
    cursor: pointer;
    padding: 2px 8px;
    font-size: 12px;
}
.btn-remove:hover { background: #991b1b; }
.btn-add {
    background: #27272a;
    color: #f4f4f5;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 12px;
}
.btn-add:hover { background: #3f3f46; }
.btn-copy, .btn-download, .btn-upload, .btn-validate {
    background: #27272a;
    color: #f4f4f5;
    border: 1px solid #3f3f46;
    border-radius: 4px;
    padding: 6px 14px;
    cursor: pointer;
    font-size: 12px;
}
.btn-copy:hover, .btn-download:hover, .btn-upload:hover { background: #3f3f46; }
.btn-validate {
    background: #7c2d12;
    border-color: #f97316;
}
.btn-validate:hover { background: #9a3412; }
.btn-validate.loading {
    opacity: 0.6;
    cursor: wait;
}
.json-preview {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 6px;
    padding: 16px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    color: #d4d4d8;
    min-height: 200px;
    max-height: 60vh;
    overflow-y: auto;
}
.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}
.preview-actions {
    display: flex;
    gap: 6px;
}
.validation-messages {
    margin-top: 10px;
    font-size: 13px;
}
.validation-error {
    color: #ef4444;
    padding: 4px 0;
}
.validation-ok {
    color: #22c55e;
    padding: 4px 0;
}
.validation-warning {
    color: #f59e0b;
    padding: 4px 0;
}
.expression-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.expression-row {
    display: flex;
    gap: 4px;
}
.expression-row input { flex: 1; }
.btn-expr-remove {
    background: #27272a;
    color: #a1a1aa;
    border: 1px solid #3f3f46;
    border-radius: 3px;
    cursor: pointer;
    padding: 2px 6px;
    font-size: 12px;
}
.btn-expr-add {
    background: transparent;
    color: #71717a;
    border: 1px dashed #3f3f46;
    border-radius: 3px;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 12px;
    margin-top: 4px;
}
.checkbox-field {
    display: flex;
    align-items: center;
    gap: 6px;
}
.checkbox-field input[type="checkbox"] {
    width: auto;
}
.dc-group-card { background: #09090b; border: 1px solid #27272a; border-radius: 4px; padding: 10px; margin-bottom: 8px; transition: opacity 0.15s, border-color 0.15s; }
.dc-group-card[draggable="true"] { cursor: grab; }
.dc-group-card[draggable="true"]:active { cursor: grabbing; }
.dc-group-card.dragging { opacity: 0.4; }
.dc-group-card.drag-over { border-color: #f97316; }
.dc-group-header { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.dc-group-header input { flex: 1; }
.dc-drop-zone { min-height: 28px; border: 1px dashed #27272a; border-radius: 4px; padding: 4px; transition: border-color 0.15s, background 0.15s; }
.dc-drop-zone.drag-over { border-color: #f97316; background: #09090b; }
.dc-drop-zone-empty { padding: 8px; text-align: center; color: #3f3f46; font-size: 11px; }
.dc-param-row { display: flex; gap: 6px; align-items: center; padding: 6px 4px; border-bottom: 1px solid #27272a; font-size: 12px; transition: opacity 0.15s, background 0.15s; }
.dc-param-row:last-child { border-bottom: none; }
.dc-param-row[draggable="true"] { cursor: grab; }
.dc-param-row[draggable="true"]:active { cursor: grabbing; }
.dc-param-row.dragging { opacity: 0.4; }
.dc-param-name { width: 140px; font-weight: 600; color: #d4d4d8; font-size: 13px; }
.dc-param-field { display: flex; flex-direction: column; }
.dc-param-field label { font-size: 9px; color: #52525b; }
.dc-param-field select, .dc-param-field input { padding: 3px 6px; font-size: 11px; }
.dc-drag-handle { cursor: grab; color: #52525b; user-select: none; font-size: 12px; }
.card-preview-panel { margin-top: 16px; border: 1px solid #27272a; border-radius: 6px; }
.card-preview-panel[open] { padding-bottom: 12px; }
.card-preview-toggle { padding: 12px 16px; cursor: pointer; color: #a1a1aa; font-weight: 600; list-style: none; font-size: 14px; }
.card-preview-toggle::-webkit-details-marker { display: none; }
.card-preview-toggle::before { content: '\\25b6'; margin-right: 8px; font-size: 10px; display: inline-block; transition: transform 0.2s; }
.card-preview-panel[open] .card-preview-toggle::before { transform: rotate(90deg); }
.card-preview-container { padding: 12px 16px; display: flex; justify-content: center; }
.card-mock { width: 400px; border-radius: var(--card-radius, 0); overflow: hidden; font-family: Inter, system-ui, sans-serif; }
.card-mock .cm-accent-bar { height: 3px; width: 100%; }
.card-mock .cm-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--cm-border); }
.card-mock .cm-name { font-size: 16px; font-weight: 700; font-family: Quantico, sans-serif; text-transform: uppercase; color: var(--cm-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-mock .cm-type { font-size: 11px; color: var(--cm-text-muted); white-space: nowrap; }
.card-mock .cm-section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cm-text-label); padding: 8px 16px 4px; border-bottom: 1px solid var(--cm-border); }
.card-mock .cm-desc { font-size: 13px; color: var(--cm-text-secondary); padding: 6px 16px 10px; line-height: 1.5; border-bottom: 1px solid var(--cm-border); }
.card-mock .cm-row { display: flex; align-items: center; height: 32px; padding: 0 16px; border-bottom: 1px solid var(--cm-border); position: relative; overflow: hidden; }
.card-mock .cm-graph-bg { position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.15; pointer-events: none; }
.card-mock .cm-graph-bg svg { width: 100%; height: 100%; display: block; }
.card-mock .cm-row-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--cm-text-label); flex-shrink: 0; position: relative; z-index: 1; }
.card-mock .cm-row-value { font-size: 13px; font-weight: 700; color: var(--cm-text-value); background: #00000066; padding: 0 4px; border-radius: 2px; margin-left: 8px; position: relative; z-index: 1; }
.card-mock .cm-group-chart { padding: 8px 16px; border-bottom: 1px solid var(--cm-border); }
.card-mock .cm-group-chart svg { width: 100%; display: block; border-radius: 3px; background: #00000033; }
.card-mock .cm-chart-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.card-mock .cm-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--cm-text-secondary); }
.card-mock .cm-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.card-mock .cm-action-row { display: flex; align-items: center; gap: 8px; padding: 6px 16px; border-bottom: 1px solid var(--cm-border); }
.card-mock .cm-action-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.card-mock .cm-action-label { font-size: 13px; font-weight: 500; color: var(--cm-text-value); }
.card-mock .cm-action-trigger { font-size: 10px; color: var(--cm-accent); opacity: 0.7; }
.card-mock .cm-footer { display: flex; justify-content: flex-end; align-items: center; padding: 8px 16px; border-top: 1px solid var(--cm-border); font-size: 10px; color: var(--cm-text-muted); }
.docs-panel {
    background: #18181b;
    border-radius: 6px;
    margin-bottom: 20px;
    border: 1px solid #27272a;
}
.docs-toggle {
    padding: 14px 20px;
    cursor: pointer;
    color: #a1a1aa;
    font-size: 1rem;
    font-weight: 600;
    user-select: none;
    list-style: none;
}
.docs-toggle::-webkit-details-marker { display: none; }
.docs-toggle::before {
    content: '\\25B6';
    display: inline-block;
    margin-right: 8px;
    transition: transform 0.2s;
    font-size: 0.8rem;
}
.docs-panel[open] .docs-toggle::before {
    transform: rotate(90deg);
}
.docs-content {
    padding: 0 20px 20px;
    font-size: 14px;
    line-height: 1.7;
}
.docs-content h3 {
    color: #f97316;
    margin: 16px 0 8px;
    font-size: 1rem;
}
.docs-content h3:first-child { margin-top: 0; }
.docs-content code {
    background: #09090b;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    color: #d4d4d8;
}
.docs-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
}
.docs-content th, .docs-content td {
    border: 1px solid #27272a;
    padding: 6px 10px;
    text-align: left;
}
.docs-content th {
    background: #27272a;
    color: #a1a1aa;
    font-weight: 600;
}
.docs-content td { background: #09090b; }
.docs-content .example-block {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 8px 0;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    color: #d4d4d8;
    white-space: pre-wrap;
}
.server-validation-header {
    color: #f97316;
    font-weight: 600;
    margin-bottom: 6px;
}
.game-context-bar {
    background: #18181b;
    border-radius: 6px;
    padding: 16px 20px;
    margin-bottom: 20px;
    border: 1px solid #27272a;
}
.context-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}
.context-field { flex: 1; margin-bottom: 0; }
.btn-fetch {
    background: #7c2d12;
    color: #f4f4f5;
    border: 1px solid #f97316;
    border-radius: 4px;
    padding: 8px 18px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
    height: 36px;
}
.btn-fetch:hover { background: #9a3412; }
.btn-fetch.loading { opacity: 0.6; cursor: wait; }
.refs-panel {
    margin-top: 14px;
    border-top: 1px solid #27272a;
    padding-top: 12px;
}
.refs-panel h3 {
    color: #a1a1aa;
    font-size: 14px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
.refs-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.ref-template-group {
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 6px;
    padding: 10px;
    min-width: 180px;
    max-width: 300px;
}
.ref-template-name {
    color: #f97316;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 6px;
}
.ref-param-tag {
    display: inline-block;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 3px;
    padding: 2px 8px;
    margin: 2px;
    font-size: 12px;
    font-family: 'Fira Code', 'Consolas', monospace;
    color: #d4d4d8;
    cursor: pointer;
    user-select: all;
    transition: border-color 0.15s;
}
.ref-param-tag:hover { border-color: #f97316; }
.ref-no-params {
    color: #52525b;
    font-size: 12px;
    font-style: italic;
}
.autocomplete-dropdown {
    position: absolute;
    z-index: 100;
    background: #18181b;
    border: 1px solid #f97316;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    min-width: 240px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
.autocomplete-item {
    padding: 6px 12px;
    cursor: pointer;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    color: #d4d4d8;
    border-bottom: 1px solid #27272a;
}
.autocomplete-item:last-child { border-bottom: none; }
.autocomplete-item:hover,
.autocomplete-item.selected {
    background: #27272a;
}
.autocomplete-item .ac-template-label {
    color: #f97316;
    font-weight: 600;
}
.autocomplete-item .ac-param-label {
    color: #52525b;
    margin-left: 6px;
    font-size: 12px;
}
.docs-content h4 {
    color: #a1a1aa;
    margin: 12px 0 6px;
    font-size: 14px;
}
`;
}
