/**
 * Build the full HTML document string for the template editor.
 * @returns string Complete HTML document.
 * @example
 * const html = BuildTemplateEditorHtml();
 * response.end(html);
 */
export function BuildTemplateEditorHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Game Object Template Editor</title>
<style>
${__GetStyles()}
</style>
</head>
<body>
<div class="page-layout">
    <aside class="dc-sidebar" id="dcSidebar">
        <h2>Display Config</h2>
        <div id="dcContent">
            <div class="dc-panel">
                <h3 class="dc-subtitle">Style</h3>
                <div class="dc-style-grid" id="dcStyleGrid">
                    <div class="dc-style-field"><label>Card BG</label><input type="color" id="dc_cardBackground" value="#000000" onchange="dcUpdateStyle('cardBackground', this.value)"></div>
                    <div class="dc-style-field"><label>Panel BG</label><input type="color" id="dc_panelBackground" value="#09090b" onchange="dcUpdateStyle('panelBackground', this.value)"></div>
                    <div class="dc-style-field"><label>Border</label><input type="color" id="dc_borderColor" value="#18181b" onchange="dcUpdateStyle('borderColor', this.value)"></div>
                    <div class="dc-style-field"><label>Accent</label><input type="color" id="dc_accentColor" value="#f97316" onchange="dcUpdateStyle('accentColor', this.value)"></div>
                    <div class="dc-style-field"><label>Accent Fill</label><input type="color" id="dc_accentFill" value="#7c2d12" onchange="dcUpdateStyle('accentFill', this.value)"></div>
                    <div class="dc-style-field"><label>Text Primary</label><input type="color" id="dc_textPrimary" value="#f4f4f5" onchange="dcUpdateStyle('textPrimary', this.value)"></div>
                    <div class="dc-style-field"><label>Text Value</label><input type="color" id="dc_textValue" value="#d4d4d8" onchange="dcUpdateStyle('textValue', this.value)"></div>
                    <div class="dc-style-field"><label>Text Label</label><input type="color" id="dc_textLabel" value="#52525b" onchange="dcUpdateStyle('textLabel', this.value)"></div>
                    <div class="dc-style-field"><label>Text Sec.</label><input type="color" id="dc_textSecondary" value="#a1a1aa" onchange="dcUpdateStyle('textSecondary', this.value)"></div>
                    <div class="dc-style-field"><label>Text Muted</label><input type="color" id="dc_textMuted" value="#3f3f46" onchange="dcUpdateStyle('textMuted', this.value)"></div>
                    <div class="dc-style-field"><label>Radius</label><input type="number" id="dc_cardBorderRadius" value="0" min="0" max="24" style="width:50px;" onchange="dcUpdateStyle('cardBorderRadius', parseInt(this.value))"></div>
                </div>
                <button class="btn-add" style="margin-top:4px;font-size:11px;" onclick="dcResetStyleDefaults()">Reset Defaults</button>
            </div>
            <div class="dc-panel">
                <h3 class="dc-subtitle">Groups <button class="btn-add" onclick="dcAddGroup()">+ Group</button></h3>
                <p style="font-size:11px;color:#52525b;margin-bottom:8px;">Drag params from the editor to assign. Drag groups to reorder.</p>
                <div id="dcGroupsContainer"></div>
            </div>
            <div class="dc-panel">
                <h3 class="dc-subtitle" style="color:#f97316;">Charts <button class="btn-add" onclick="dcAddChart()">+ Chart</button></h3>
                <p style="font-size:11px;color:#52525b;margin-bottom:8px;">Drag params from the editor for multi-parameter charts.</p>
                <div id="dcChartsContainer"></div>
            </div>
            <div class="dc-panel">
                <h3 class="dc-subtitle">Layout Order</h3>
                <p style="font-size:11px;color:#52525b;margin-bottom:8px;">Drag to set rendering order of groups and charts.</p>
                <div id="dcLayoutOrderContainer"></div>
            </div>
        </div>
    </aside>

    <main class="main-content">
        <nav class="editor-nav">
            <a href="/tutorial" class="nav-link">Tutorial</a>
        </nav>

        <section class="game-context-bar">
            <div class="context-row">
                <div class="field context-field">
                    <label for="gameUid">Game UID</label>
                    <input type="text" id="gameUid" placeholder="game_abc123">
                </div>
                <button class="btn-fetch" onclick="fetchTemplates()">Load Templates</button>
            </div>
            <div id="availableRefsPanel" class="refs-panel" style="display:none;">
                <h3>Available Cross-References</h3>
                <div id="refsList" class="refs-list"></div>
            </div>
        </section>

        <details class="docs-panel">
            <summary class="docs-toggle">Expression Language Reference</summary>
            <div class="docs-content">
${__GetDocsHtml()}
            </div>
        </details>

        <div class="editor-layout">
            <div class="form-panel">
                <section class="section">
                    <h2>General</h2>
                    <div class="field">
                        <label for="templateName">Name</label>
                        <input type="text" id="templateName" placeholder="Factory" oninput="updatePreview()">
                    </div>
                    <div class="field">
                        <label for="templateDescription">Description</label>
                        <textarea id="templateDescription" rows="2" placeholder="A production building that converts raw materials." oninput="updatePreview()"></textarea>
                    </div>
                </section>

                <section class="section">
                    <h2>Parameters <button class="btn-add" onclick="addParameter()">+ Add</button></h2>
                    <div id="parametersContainer"></div>
                </section>

                <section class="section">
                    <h2>Actions <button class="btn-add" onclick="addAction()">+ Add</button></h2>
                    <div id="actionsContainer"></div>
                </section>
            </div>

            <div class="preview-panel">
                <div class="preview-header">
                    <h2>JSON Preview</h2>
                    <div class="preview-actions">
                        <button class="btn-validate" onclick="validateOnServer()">Validate</button>
                        <button class="btn-copy" onclick="copyJson()">Copy</button>
                        <button class="btn-download" onclick="downloadJson()">Download</button>
                        <label class="btn-upload">
                            Upload
                            <input type="file" accept=".json" onchange="uploadJson(event)" hidden>
                        </label>
                    </div>
                </div>
                <pre id="jsonPreview" class="json-preview"></pre>
                <div id="validationMessages" class="validation-messages"></div>
                <div id="serverValidationMessages" class="validation-messages"></div>

                <details class="card-preview-panel" open>
                    <summary class="card-preview-toggle">Card Preview</summary>
                    <div id="cardPreviewContainer" class="card-preview-container"></div>
                </details>
            </div>
        </div>
    </main>
</div>
<script>
${__GetScript()}
</script>
</body>
</html>`;
}

/**
 * CSS styles for the template editor page.
 * @returns string CSS stylesheet content.
 */
function __GetStyles(): string {
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
/* Display config inline section */
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
/* Card preview */
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
/* Docs panel styles */
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
/* Server validation results */
.server-validation-header {
    color: #f97316;
    font-weight: 600;
    margin-bottom: 6px;
}
/* Game context bar */
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
/* Available cross-references panel */
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
/* Autocomplete dropdown */
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
/* Docs subheadings */
.docs-content h4 {
    color: #a1a1aa;
    margin: 12px 0 6px;
    font-size: 14px;
}
`;
}

/**
 * HTML content for the expression language documentation panel.
 * @returns string HTML markup for the docs section.
 */
function __GetDocsHtml(): string {
    return `
<h3>Assignment Syntax</h3>
<p>Every expression follows: <code>targetVariable operator rightHandSide</code></p>
<table>
    <tr><th>Operator</th><th>Description</th><th>Example</th></tr>
    <tr><td><code>=</code></td><td>Direct assignment</td><td><code>output = 10</code></td></tr>
    <tr><td><code>+=</code></td><td>Add and assign</td><td><code>output += productionRate</code></td></tr>
    <tr><td><code>-=</code></td><td>Subtract and assign</td><td><code>rawMaterials -= cost</code></td></tr>
    <tr><td><code>*=</code></td><td>Multiply and assign</td><td><code>output *= 2</code></td></tr>
    <tr><td><code>/=</code></td><td>Divide and assign</td><td><code>output /= 2</code></td></tr>
</table>
<p>The <code>targetVariable</code> must be a numeric parameter key defined in the template.</p>

<h3>Arithmetic</h3>
<table>
    <tr><th>Operator</th><th>Example</th></tr>
    <tr><td><code>+</code></td><td><code>output += rate + bonus</code></td></tr>
    <tr><td><code>-</code></td><td><code>stock -= consumption - surplus</code></td></tr>
    <tr><td><code>*</code></td><td><code>cost = workers * wage</code></td></tr>
    <tr><td><code>/</code></td><td><code>perUnit = total / count</code></td></tr>
</table>
<p>Parentheses <code>()</code> control evaluation order: <code>output = (a + b) * c</code></p>

<h3>Comparison Operators</h3>
<p>Return <code>1</code> for true, <code>0</code> for false.</p>
<table>
    <tr><th>Operator</th><th>Example</th></tr>
    <tr><td><code>&gt;</code></td><td><code>if(stock > 0, 1, 0)</code></td></tr>
    <tr><td><code>&lt;</code></td><td><code>if(health < 10, 1, 0)</code></td></tr>
    <tr><td><code>&gt;=</code></td><td><code>if(level >= 5, bonus, 0)</code></td></tr>
    <tr><td><code>&lt;=</code></td><td><code>if(fuel <= 0, 0, speed)</code></td></tr>
    <tr><td><code>==</code></td><td><code>if(state == 1, active, 0)</code></td></tr>
</table>

<h3>Built-in Functions</h3>
<table>
    <tr><th>Function</th><th>Args</th><th>Description</th><th>Example</th></tr>
    <tr><td><code>min(a, b)</code></td><td>2</td><td>Returns smaller value</td><td><code>output = min(stock, demand)</code></td></tr>
    <tr><td><code>max(a, b)</code></td><td>2</td><td>Returns larger value</td><td><code>health = max(health, 0)</code></td></tr>
    <tr><td><code>clamp(val, lo, hi)</code></td><td>3</td><td>Constrains between bounds</td><td><code>speed = clamp(speed, 0, 100)</code></td></tr>
    <tr><td><code>floor(x)</code></td><td>1</td><td>Round down</td><td><code>units = floor(total / size)</code></td></tr>
    <tr><td><code>ceil(x)</code></td><td>1</td><td>Round up</td><td><code>batches = ceil(total / size)</code></td></tr>
    <tr><td><code>abs(x)</code></td><td>1</td><td>Absolute value</td><td><code>distance = abs(posA - posB)</code></td></tr>
    <tr><td><code>if(cond, then, else)</code></td><td>3</td><td>Conditional (cond &gt; 0 = true)</td><td><code>output = if(fuel > 0, rate, 0)</code></td></tr>
</table>

<h3>Cross-Object References</h3>
<p>Read numeric parameters from other object types using <code>@TemplateName.paramKey</code> syntax.</p>
<p>The <code>@</code> prefix signals that the value comes from a different template, not the current object.</p>

<h4>How References Resolve</h4>
<p>When the turn engine encounters <code>@Mine.oreOutput</code> in a Factory expression:</p>
<div class="example-block">1. Find all objects created from the "Mine" template in the same game
2. Take the FIRST matching object
3. Read its current "oreOutput" parameter value
4. Substitute that numeric value into the expression</div>
<p>If no objects of the referenced template exist, the reference evaluates to <code>0</code>.</p>
<p>Only <strong>numeric</strong> parameters can be referenced. String and boolean parameters are not available for cross-reference.</p>

<h4>Reference Scope</h4>
<p>References are <strong>game-wide</strong>. Any object in the same game can reference any other template's parameters, regardless of which organization owns them.</p>
<p>The current template's own parameters are also available as <code>@SelfTemplateName.paramKey</code>, but usually you just use the bare key name directly.</p>

<h4>Usage Patterns</h4>
<div class="example-block">// Read a single value from another template
output += @Mine.oreOutput

// Combine values from multiple templates
production = @Mine.oreOutput - @Refinery.consumption

// Use in conditionals
bonus = if(@Market.demand > 100, 2, 1)

// Nested in function calls
profit = max(@Market.price * output - cost, 0)</div>

<h4>Finding Available References</h4>
<p>Enter your game UID at the top and click "Load Templates" to see all available <code>@Template.param</code> references. Click any reference tag to insert it into the last-focused expression field.</p>

<h3>Aggregate Functions</h3>
<p>Aggregate across <strong>all</strong> objects of a template type in the game:</p>
<table>
    <tr><th>Function</th><th>Description</th><th>Example</th></tr>
    <tr><td><code>sum(@Tmpl.key)</code></td><td>Sum values from all matching objects</td><td><code>totalOre = sum(@Mine.oreOutput)</code></td></tr>
    <tr><td><code>avg(@Tmpl.key)</code></td><td>Average across all matching objects</td><td><code>avgEff = avg(@Factory.efficiency)</code></td></tr>
    <tr><td><code>count(@Tmpl.key)</code></td><td>Count objects that have this parameter</td><td><code>mineCount = count(@Mine.oreOutput)</code></td></tr>
</table>
<p>Unlike a bare <code>@Mine.oreOutput</code> reference (which takes the first object), aggregate functions consider every object of that template.</p>
<div class="example-block">// If the game has 3 Mines with oreOutput: 10, 20, 15
sum(@Mine.oreOutput)   // = 45
avg(@Mine.oreOutput)   // = 15
count(@Mine.oreOutput) // = 3

// Combine aggregates with arithmetic
totalCost = sum(@Factory.workers) * @Economy.wage
averageLoad = sum(@Truck.cargo) / count(@Truck.cargo)</div>

<h3>Inline Targeting</h3>
<p>By default, expressions modify the owning object. To modify other objects, use <code>@TemplateName.paramKey</code> as the <strong>left-hand side</strong>:</p>
<table>
    <tr><th>Expression</th><th>Effect</th></tr>
    <tr><td><code>output += rate</code></td><td>Modifies <code>output</code> on the owning object.</td></tr>
    <tr><td><code>@Mine.oreOutput -= 5</code></td><td>Reduces <code>oreOutput</code> by 5 on <strong>all Mine</strong> objects.</td></tr>
    <tr><td><code>@Warehouse.stock += output</code></td><td>Adds this object's <code>output</code> to every Warehouse's <code>stock</code>.</td></tr>
</table>
<p>When targeting multiple objects, the expression runs once per target. The owning object's parameters are used for RHS evaluation but not modified by inline-targeted expressions.</p>
<div class="example-block">// A Factory action that produces goods AND consumes from Mines:
{
  "key": "produceAndConsume",
  "expressions": [
    "output += productionRate",
    "@Mine.oreOutput -= productionRate * 2"
  ]
}
// output changes on the Factory
// oreOutput changes on ALL Mine objects</div>
<p><strong>Tip:</strong> If templates are loaded, the editor validates inline target template names and parameter keys against known templates.</p>

<h3>Triggers</h3>
<table>
    <tr><th>Value</th><th>When</th></tr>
    <tr><td><code>onTurnAdvance</code></td><td>Each turn advance event</td></tr>
    <tr><td><code>onManual</code></td><td>Manually triggered by user</td></tr>
    <tr><td><code>onCreate</code></td><td>When the object is created</td></tr>
    <tr><td><code>onDestroy</code></td><td>When the object is destroyed</td></tr>
</table>
`;
}

/**
 * JavaScript for the template editor client-side logic.
 * @returns string JavaScript source code.
 */
function __GetScript(): string {
    return `
let parameterCounter = 0;
let actionCounter = 0;

/* ── Display Config State ── */
var _dcEnabled = true;
var _dcConfig = { groups: [], parameterDisplay: [], charts: [], styleConfig: {} };
var _dcDragType = null;
var _dcDragIndex = null;
var _dcDragParamKey = null;

var DC_STYLE_DEFAULTS = {
    cardBackground: '#000000', panelBackground: '#09090b', borderColor: '#18181b',
    accentColor: '#f97316', accentFill: '#7c2d12', textPrimary: '#f4f4f5',
    textValue: '#d4d4d8', textLabel: '#52525b', textSecondary: '#a1a1aa',
    textMuted: '#3f3f46', cardBorderRadius: 0,
};

function toggleDisplayConfig(enabled) {
    _dcEnabled = true;
    dcRenderAll();
    updatePreview();
}

function dcUpdateStyle(field, value) {
    if (!_dcConfig.styleConfig) { _dcConfig.styleConfig = {}; }
    if (field === 'cardBorderRadius') { value = parseInt(value, 10) || 0; }
    _dcConfig.styleConfig[field] = value;
    updatePreview();
}

function dcResetStyleDefaults() {
    _dcConfig.styleConfig = {};
    dcRenderStyleFields();
    updatePreview();
}

function dcRenderStyleFields() {
    var styleConfig = _dcConfig.styleConfig || {};
    var colorFields = ['cardBackground','panelBackground','borderColor','accentColor','accentFill','textPrimary','textValue','textLabel','textSecondary','textMuted'];
    colorFields.forEach(function(field) {
        var input = document.getElementById('dc_' + field);
        if (input) { input.value = styleConfig[field] || DC_STYLE_DEFAULTS[field]; }
    });
    var radiusInput = document.getElementById('dc_cardBorderRadius');
    if (radiusInput) { radiusInput.value = styleConfig.cardBorderRadius !== undefined ? styleConfig.cardBorderRadius : 0; }
}

function dcAddGroup() {
    var nextOrder = _dcConfig.groups.length + (_dcConfig.charts ? _dcConfig.charts.length : 0);
    _dcConfig.groups.push({ key: 'group_' + _dcConfig.groups.length, label: 'Group ' + _dcConfig.groups.length, sortOrder: nextOrder });
    dcRenderGroupsAndParams();
    dcRenderLayoutOrder();
    updatePreview();
}

function dcRemoveGroup(groupIndex) {
    var removedKey = _dcConfig.groups[groupIndex].key;
    _dcConfig.groups.splice(groupIndex, 1);
    _dcConfig.parameterDisplay.forEach(function(pd) { if (pd.group === removedKey) { pd.group = ''; } });
    dcRenderGroupsAndParams();
    dcRenderLayoutOrder();
    updatePreview();
}

function dcUpdateGroup(groupIndex, field, value) {
    if (_dcConfig.groups[groupIndex]) { _dcConfig.groups[groupIndex][field] = value; }
    updatePreview();
}

function dcUpdateParam(paramKey, field, value) {
    var entry = _dcConfig.parameterDisplay.find(function(pd) { return pd.key === paramKey; });
    if (!entry) {
        entry = { key: paramKey, group: '', graphType: 'sparkline', hidden: false, displayOrder: 999 };
        _dcConfig.parameterDisplay.push(entry);
    }
    entry[field] = value;
    updatePreview();
}

function dcRenderAll() {
    dcRenderStyleFields();
    dcRenderGroupsAndParams();
    dcRenderCharts();
    dcRenderLayoutOrder();
}

/** Lightweight re-render of DC groups if enabled. Safe to call from param add/remove. */
function dcRefreshIfEnabled() {
    dcRenderGroupsAndParams();
    dcRenderCharts();
}

function dcGetCurrentParamDefs() {
    var paramDefs = [];
    var rows = document.getElementById('parametersContainer').children;
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var row = rows[rowIndex];
        var keyInput = row.querySelector('[data-field="key"]');
        var labelInput = row.querySelector('[data-field="label"]');
        if (keyInput && keyInput.value) {
            paramDefs.push({ key: keyInput.value, label: labelInput ? labelInput.value : keyInput.value });
        }
    }
    return paramDefs;
}

function dcRenderGroupsAndParams() {
    var container = document.getElementById('dcGroupsContainer');
    if (!container) return;
    container.innerHTML = '';

    var paramDefs = dcGetCurrentParamDefs();
    var paramMap = {};
    (_dcConfig.parameterDisplay || []).forEach(function(pd) { paramMap[pd.key] = pd; });

    var groupedParams = {};
    _dcConfig.groups.forEach(function(groupItem) { groupedParams[groupItem.key] = []; });

    paramDefs.forEach(function(pDef) {
        var pd = paramMap[pDef.key] || { key: pDef.key, group: '', graphType: 'sparkline', hidden: false, displayOrder: 999 };
        if (pd.group && groupedParams[pd.group]) {
            groupedParams[pd.group].push({ def: pDef, display: pd });
        }
    });

    Object.keys(groupedParams).forEach(function(groupKey) {
        groupedParams[groupKey].sort(function(itemA, itemB) { return (itemA.display.displayOrder || 999) - (itemB.display.displayOrder || 999); });
    });

    _dcConfig.groups.forEach(function(group, groupIndex) {
        var card = document.createElement('div');
        card.className = 'dc-group-card';
        card.draggable = true;
        card.dataset.groupIndex = groupIndex;

        var header = document.createElement('div');
        header.className = 'dc-group-header';
        header.innerHTML =
            '<span class="dc-drag-handle" title="Drag to reorder">\\u2630</span>' +
            '<input type="text" value="' + dcEscapeAttr(group.key) + '" placeholder="key" style="width:90px;" onchange="dcUpdateGroup(' + groupIndex + ',\\'key\\',this.value); dcRenderGroupsAndParams();" onclick="event.stopPropagation();">' +
            '<input type="text" value="' + dcEscapeAttr(group.label) + '" placeholder="Label" onchange="dcUpdateGroup(' + groupIndex + ',\\'label\\',this.value); dcRenderGroupsAndParams();" onclick="event.stopPropagation();">' +
            '<button class="btn-remove" style="position:static;" onclick="event.stopPropagation(); dcRemoveGroup(' + groupIndex + ');">x</button>';
        card.appendChild(header);

        // Drop zone with param rows
        var dropZone = document.createElement('div');
        dropZone.className = 'dc-drop-zone';
        dropZone.dataset.groupKey = group.key;
        var groupParams = groupedParams[group.key] || [];
        if (groupParams.length === 0) {
            dropZone.innerHTML = '<div class="dc-drop-zone-empty">Drop params here</div>';
        } else {
            groupParams.forEach(function(entry) {
                dropZone.appendChild(dcBuildGroupParamRow(entry.def, entry.display, group.key));
            });
        }

        dropZone.addEventListener('dragover', function(ev) { if (_dcDragType !== 'dcparam') return; ev.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', function(ev) { if (!dropZone.contains(ev.relatedTarget)) dropZone.classList.remove('drag-over'); });
        dropZone.addEventListener('drop', function(ev) { ev.preventDefault(); dropZone.classList.remove('drag-over'); if (_dcDragType === 'dcparam' && _dcDragParamKey) dcAssignParamToGroup(_dcDragParamKey, group.key); });
        card.appendChild(dropZone);

        // Group card DnD for reordering groups
        card.addEventListener('dragstart', function(ev) { if (ev.target !== card) return; ev.dataTransfer.setData('text/plain', group.key); ev.dataTransfer.effectAllowed = 'move'; _dcDragType = 'dcgroup'; _dcDragIndex = groupIndex; card.classList.add('dragging'); });
        card.addEventListener('dragend', function() { _dcDragType = null; _dcDragIndex = null; card.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); }); });
        card.addEventListener('dragover', function(ev) { if (_dcDragType !== 'dcgroup') return; ev.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', function(ev) { if (!card.contains(ev.relatedTarget)) card.classList.remove('drag-over'); });
        card.addEventListener('drop', function(ev) { ev.preventDefault(); ev.stopPropagation(); card.classList.remove('drag-over'); if (_dcDragType === 'dcgroup' && _dcDragIndex !== null) dcSwapGroups(_dcDragIndex, groupIndex); });

        container.appendChild(card);
    });
}

function dcAddChart() {
    if (!_dcConfig.charts) { _dcConfig.charts = []; }
    var nextOrder = _dcConfig.groups.length + _dcConfig.charts.length;
    _dcConfig.charts.push({ key: 'chart_' + _dcConfig.charts.length, label: 'Chart ' + _dcConfig.charts.length, chartType: 'combined', parameterKeys: [], chartHeight: 0, sortOrder: nextOrder });
    dcRenderCharts();
    dcRenderLayoutOrder();
    updatePreview();
}

function dcRemoveChart(chartIndex) {
    _dcConfig.charts.splice(chartIndex, 1);
    dcRenderCharts();
    dcRenderLayoutOrder();
    updatePreview();
}

function dcUpdateChart(chartIndex, field, value) {
    if (_dcConfig.charts && _dcConfig.charts[chartIndex]) { _dcConfig.charts[chartIndex][field] = value; }
    updatePreview();
}

function dcRenderCharts() {
    var container = document.getElementById('dcChartsContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!_dcConfig.charts) { _dcConfig.charts = []; }

    var paramDefs = dcGetCurrentParamDefs();
    var paramDefMap = {};
    paramDefs.forEach(function(pDef) { paramDefMap[pDef.key] = pDef; });

    _dcConfig.charts.forEach(function(chart, chartIndex) {
        var card = document.createElement('div');
        card.className = 'dc-group-card';
        card.style.borderColor = '#f9731644';

        var header = document.createElement('div');
        header.className = 'dc-group-header';
        header.innerHTML =
            '<input type="text" value="' + dcEscapeAttr(chart.key) + '" placeholder="key" style="width:90px;" onchange="dcUpdateChart(' + chartIndex + ',\\'key\\',this.value); dcRenderCharts();">' +
            '<input type="text" value="' + dcEscapeAttr(chart.label || '') + '" placeholder="Label" onchange="dcUpdateChart(' + chartIndex + ',\\'label\\',this.value); dcRenderCharts();">' +
            '<button class="btn-remove" style="position:static;" onclick="dcRemoveChart(' + chartIndex + ');">x</button>';
        card.appendChild(header);

        var configRow = document.createElement('div');
        configRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;padding-left:4px;flex-wrap:wrap;';
        var currentType = chart.chartType || 'combined';
        var currentHeight = chart.chartHeight || 0;
        configRow.innerHTML =
            '<label style="font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Type</label>' +
            '<select style="width:100px;font-size:11px;padding:3px 6px;" onchange="dcUpdateChart(' + chartIndex + ',\\'chartType\\',this.value); dcRenderCharts(); updatePreview();">' +
            '<option value="combined"' + (currentType === 'combined' ? ' selected' : '') + '>Combined</option>' +
            '<option value="cumulative"' + (currentType === 'cumulative' ? ' selected' : '') + '>Cumulative</option>' +
            '<option value="relative"' + (currentType === 'relative' ? ' selected' : '') + '>Relative</option>' +
            '</select>' +
            '<label style="font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin-left:8px;">Height</label>' +
            '<input type="number" min="0" step="10" placeholder="auto" value="' + (currentHeight || '') + '" style="width:60px;font-size:11px;padding:3px 6px;" onchange="dcUpdateChart(' + chartIndex + ',\\'chartHeight\\',parseInt(this.value)||0); updatePreview();">' +
            '<span style="font-size:10px;color:#52525b;">px</span>';
        card.appendChild(configRow);

        // Drop zone with chart param rows
        var dropZone = document.createElement('div');
        dropZone.className = 'dc-drop-zone';
        var selectedKeys = chart.parameterKeys || [];
        if (selectedKeys.length === 0) {
            dropZone.innerHTML = '<div class="dc-drop-zone-empty">Drop params here</div>';
        } else {
            selectedKeys.forEach(function(paramKey) {
                var pDef = paramDefMap[paramKey] || { key: paramKey, label: paramKey };
                dropZone.appendChild(dcBuildChartParamRow(pDef, chartIndex));
            });
        }

        (function(capturedChartIndex) {
            dropZone.addEventListener('dragover', function(ev) { if (_dcDragType !== 'dcparam') return; ev.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone.addEventListener('dragleave', function(ev) { if (!dropZone.contains(ev.relatedTarget)) dropZone.classList.remove('drag-over'); });
            dropZone.addEventListener('drop', function(ev) { ev.preventDefault(); dropZone.classList.remove('drag-over'); if (_dcDragType === 'dcparam' && _dcDragParamKey) dcAddParamToChart(capturedChartIndex, _dcDragParamKey); });
        })(chartIndex);

        card.appendChild(dropZone);
        container.appendChild(card);
    });
}

/* ── Helper Functions ── */

/**
 * Build a param row inside a group drop zone.
 * Shows Graph type, Hidden toggle, and a remove button.
 */
function dcBuildGroupParamRow(paramDef, display, groupKey) {
    var row = document.createElement('div');
    row.className = 'dc-param-row';
    var escapedKey = dcEscapeAttr(paramDef.key);
    row.innerHTML =
        '<span class="dc-param-name">' + dcEscapeHtml(paramDef.label || paramDef.key) + '</span>' +
        '<div class="dc-param-field"><label>Graph</label><select onchange="dcUpdateParam(\\'' + escapedKey + '\\',\\'graphType\\',this.value)">' +
            '<option value="sparkline"' + (display.graphType === 'sparkline' ? ' selected' : '') + '>Sparkline</option>' +
            '<option value="bar"' + (display.graphType === 'bar' ? ' selected' : '') + '>Bar</option>' +
            '<option value="none"' + (display.graphType === 'none' ? ' selected' : '') + '>None</option>' +
        '</select></div>' +
        '<div class="dc-param-field"><label>Hide</label><input type="checkbox"' + (display.hidden ? ' checked' : '') + ' onchange="dcUpdateParam(\\'' + escapedKey + '\\',\\'hidden\\',this.checked)"></div>' +
        '<button class="btn-remove" style="position:static;font-size:10px;" onclick="dcRemoveParamFromGroup(\\'' + escapedKey + '\\')">x</button>';
    return row;
}

/**
 * Build a param row inside a chart drop zone.
 * Shows the param name and a remove button.
 */
function dcBuildChartParamRow(paramDef, chartIndex) {
    var row = document.createElement('div');
    row.className = 'dc-param-row';
    var escapedKey = dcEscapeAttr(paramDef.key);
    row.innerHTML =
        '<span class="dc-param-name" style="flex:1;">' + dcEscapeHtml(paramDef.label || paramDef.key) + '</span>' +
        '<button class="btn-remove" style="position:static;font-size:10px;" onclick="dcRemoveParamFromChart(' + chartIndex + ',\\'' + escapedKey + '\\')">x</button>';
    return row;
}

/**
 * Assign a param to a group (via DnD drop).
 * A param can only belong to one group. Moves it if already in another.
 */
function dcAssignParamToGroup(paramKey, groupKey) {
    var entry = _dcConfig.parameterDisplay.find(function(pd) { return pd.key === paramKey; });
    if (!entry) {
        entry = { key: paramKey, group: '', graphType: 'sparkline', hidden: false, displayOrder: 999 };
        _dcConfig.parameterDisplay.push(entry);
    }
    entry.group = groupKey;
    var maxOrder = 0;
    _dcConfig.parameterDisplay.forEach(function(pd) { if (pd.group === groupKey && pd.displayOrder > maxOrder) maxOrder = pd.displayOrder; });
    entry.displayOrder = maxOrder + 1;
    dcRenderGroupsAndParams();
    updatePreview();
}

/**
 * Remove a param from its group (unassign).
 */
function dcRemoveParamFromGroup(paramKey) {
    var entry = _dcConfig.parameterDisplay.find(function(pd) { return pd.key === paramKey; });
    if (entry) { entry.group = ''; }
    dcRenderGroupsAndParams();
    updatePreview();
}

/**
 * Add a param to a chart (via DnD drop). No-op if already in the chart.
 */
function dcAddParamToChart(chartIndex, paramKey) {
    var chart = _dcConfig.charts[chartIndex];
    if (!chart) return;
    if (chart.parameterKeys.indexOf(paramKey) >= 0) return;
    chart.parameterKeys.push(paramKey);
    dcRenderCharts();
    updatePreview();
}

/**
 * Remove a param from a chart.
 */
function dcRemoveParamFromChart(chartIndex, paramKey) {
    var chart = _dcConfig.charts[chartIndex];
    if (!chart) return;
    var idx = chart.parameterKeys.indexOf(paramKey);
    if (idx >= 0) { chart.parameterKeys.splice(idx, 1); }
    dcRenderCharts();
    updatePreview();
}

/* ── End Helper Functions ── */

/* ── Layout Order ── */
var _dcLayoutDragIndex = null;

function dcRenderLayoutOrder() {
    var container = document.getElementById('dcLayoutOrderContainer');
    if (!container) return;
    container.innerHTML = '';

    // Collect all items: groups + charts
    var items = [];
    (_dcConfig.groups || []).forEach(function(group, groupIndex) {
        items.push({ type: 'group', key: group.key, label: group.label || group.key, sortOrder: group.sortOrder || 0, sourceIndex: groupIndex });
    });
    (_dcConfig.charts || []).forEach(function(chart, chartIndex) {
        items.push({ type: 'chart', key: chart.key, label: chart.label || chart.key, sortOrder: chart.sortOrder || 0, sourceIndex: chartIndex });
    });
    items.sort(function(itemA, itemB) { return itemA.sortOrder - itemB.sortOrder; });

    items.forEach(function(item, visualIndex) {
        var row = document.createElement('div');
        row.draggable = true;
        row.dataset.layoutIndex = visualIndex;
        row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;margin-bottom:2px;border-radius:3px;cursor:grab;border:1px solid ' + (item.type === 'chart' ? '#f9731644' : '#3f3f46') + ';background:#18181b;font-size:11px;';

        var typeTag = document.createElement('span');
        typeTag.style.cssText = 'font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:' + (item.type === 'chart' ? '#f97316' : '#71717a') + ';width:35px;flex-shrink:0;';
        typeTag.textContent = item.type === 'chart' ? 'CHART' : 'GROUP';
        row.appendChild(typeTag);

        var labelSpan = document.createElement('span');
        labelSpan.style.cssText = 'color:#d4d4d8;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        labelSpan.textContent = item.label;
        row.appendChild(labelSpan);

        var orderSpan = document.createElement('span');
        orderSpan.style.cssText = 'font-size:10px;color:#52525b;';
        orderSpan.textContent = '#' + item.sortOrder;
        row.appendChild(orderSpan);

        // DnD
        (function(capturedVisualIndex) {
            row.addEventListener('dragstart', function(ev) {
                ev.dataTransfer.setData('text/plain', String(capturedVisualIndex));
                ev.dataTransfer.effectAllowed = 'move';
                _dcLayoutDragIndex = capturedVisualIndex;
                row.style.opacity = '0.4';
            });
            row.addEventListener('dragend', function() {
                _dcLayoutDragIndex = null;
                row.style.opacity = '1';
                document.querySelectorAll('#dcLayoutOrderContainer > div').forEach(function(el) { el.style.borderTop = ''; el.style.borderBottom = ''; });
            });
            row.addEventListener('dragover', function(ev) {
                if (_dcLayoutDragIndex === null) return;
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'move';
                var rect = row.getBoundingClientRect();
                var midY = rect.top + rect.height / 2;
                if (ev.clientY < midY) {
                    row.style.borderTop = '2px solid #f97316';
                    row.style.borderBottom = '';
                } else {
                    row.style.borderBottom = '2px solid #f97316';
                    row.style.borderTop = '';
                }
            });
            row.addEventListener('dragleave', function() {
                row.style.borderTop = '';
                row.style.borderBottom = '';
            });
            row.addEventListener('drop', function(ev) {
                ev.preventDefault();
                row.style.borderTop = '';
                row.style.borderBottom = '';
                if (_dcLayoutDragIndex === null || _dcLayoutDragIndex === capturedVisualIndex) return;
                var rect = row.getBoundingClientRect();
                var midY = rect.top + rect.height / 2;
                var insertBefore = ev.clientY < midY;

                // Reorder: remove dragged item and insert at new position
                var draggedItem = items[_dcLayoutDragIndex];
                var targetPos = insertBefore ? capturedVisualIndex : capturedVisualIndex + 1;
                if (_dcLayoutDragIndex < targetPos) { targetPos--; }
                items.splice(_dcLayoutDragIndex, 1);
                items.splice(targetPos, 0, draggedItem);

                // Reassign sortOrder based on new visual order
                items.forEach(function(orderedItem, newIndex) {
                    orderedItem.sortOrder = newIndex;
                    if (orderedItem.type === 'group') {
                        _dcConfig.groups[orderedItem.sourceIndex].sortOrder = newIndex;
                    } else {
                        _dcConfig.charts[orderedItem.sourceIndex].sortOrder = newIndex;
                    }
                });
                _dcLayoutDragIndex = null;
                dcRenderLayoutOrder();
                updatePreview();
            });
        })(visualIndex);

        container.appendChild(row);
    });

    if (items.length === 0) {
        container.innerHTML = '<span style="font-size:11px;color:#52525b;">Add groups or charts first</span>';
    }
}

/* ── End Layout Order ── */

/* ── End Chart Management ── */

function dcSwapGroups(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    var moved = _dcConfig.groups.splice(fromIndex, 1)[0];
    _dcConfig.groups.splice(toIndex, 0, moved);
    _dcConfig.groups.forEach(function(groupItem, idx) { groupItem.sortOrder = idx; });
    dcRenderGroupsAndParams();
    updatePreview();
}

function dcEscapeAttr(text) {
    return String(text || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
}

function dcEscapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

/* ── End Display Config ── */

/* ── Card Preview ── */
function renderCardPreview() {
    var container = document.getElementById('cardPreviewContainer');
    if (!container) return;

    var templateData = buildJson();
    var templateName = templateData.name || 'Untitled';
    var templateDesc = templateData.description || '';
    var parameters = templateData.parameters || [];
    var actions = templateData.actions || [];
    var dc = templateData.displayConfig || null;
    var sc = (dc && dc.styleConfig) ? dc.styleConfig : {};

    var cardBg = sc.cardBackground || '#000000';
    var panelBg = sc.panelBackground || '#09090b';
    var borderClr = sc.borderColor || '#18181b';
    var accentClr = sc.accentColor || '#f97316';
    var textPrimary = sc.textPrimary || '#f4f4f5';
    var textValue = sc.textValue || '#d4d4d8';
    var textLabel = sc.textLabel || '#52525b';
    var textSecondary = sc.textSecondary || '#a1a1aa';
    var textMuted = sc.textMuted || '#3f3f46';
    var borderRadius = sc.cardBorderRadius || 0;

    // Compute label column width from longest parameter name (~7.5px per uppercase char at 12px bold)
    var longestLabelLength = parameters.reduce(function(maxLen, param) {
        var labelText = (param.label || param.key || '').toUpperCase();
        return labelText.length > maxLen ? labelText.length : maxLen;
    }, 0);
    var computedLabelWidth = Math.max(60, Math.min(longestLabelLength * 7.5 + 8, 240));

    var cssVars = '--cm-border:' + borderClr + ';--cm-accent:' + accentClr + ';--cm-text-primary:' + textPrimary + ';--cm-text-value:' + textValue + ';--cm-text-label:' + textLabel + ';--cm-text-secondary:' + textSecondary + ';--cm-text-muted:' + textMuted + ';--card-radius:' + borderRadius + 'px;';

    var html = '<div class="card-mock" style="background:' + cardBg + ';' + cssVars + '">';

    // Accent bar
    html += '<div class="cm-accent-bar" style="background:' + accentClr + ';"></div>';

    // Header
    html += '<div class="cm-header" style="background:' + panelBg + ';">';
    html += '<span class="cm-name">' + escapePreviewHtml(templateName) + '</span>';
    html += '<span class="cm-type">TEMPLATE</span>';
    html += '</div>';

    // Description
    if (templateDesc) {
        html += '<div style="background:' + panelBg + '30;">';
        html += '<div class="cm-section-label">INFORMATION</div>';
        html += '<div class="cm-desc">' + escapePreviewHtml(templateDesc.substring(0, 200)) + '</div>';
        html += '</div>';
    }

    // Parameters — grouped or flat
    var hasGroups = dc && dc.groups && dc.groups.length > 0;
    var hasCharts = dc && dc.charts && dc.charts.length > 0;
    if ((hasGroups || hasCharts) && parameters.length > 0) {
        var paramDisplayMap = {};
        (dc.parameterDisplay || []).forEach(function(pd) { paramDisplayMap[pd.key] = pd; });

        var sortedGroups = (dc.groups || []).slice().sort(function(groupA, groupB) { return (groupA.sortOrder || 0) - (groupB.sortOrder || 0); });

        var groupedParams = {};
        sortedGroups.forEach(function(group) { groupedParams[group.key] = []; });
        var ungroupedParams = [];

        parameters.forEach(function(param) {
            var pd = paramDisplayMap[param.key];
            if (pd && pd.hidden) return;
            var targetGroup = pd && pd.group && groupedParams[pd.group] ? pd.group : '';
            if (targetGroup) {
                groupedParams[targetGroup].push(param);
            } else {
                ungroupedParams.push(param);
            }
        });

        // Sort within groups by displayOrder
        Object.keys(groupedParams).forEach(function(groupKey) {
            groupedParams[groupKey].sort(function(paramA, paramB) {
                var orderA = paramDisplayMap[paramA.key] ? (paramDisplayMap[paramA.key].displayOrder || 999) : 999;
                var orderB = paramDisplayMap[paramB.key] ? (paramDisplayMap[paramB.key].displayOrder || 999) : 999;
                return orderA - orderB;
            });
        });

        // Build renderable items list: groups + charts, sorted by sortOrder
        var renderItems = [];
        sortedGroups.forEach(function(group) {
            var groupParams = groupedParams[group.key] || [];
            if (groupParams.length === 0) return;
            renderItems.push({ sortOrder: group.sortOrder || 0, type: 'group', group: group, params: groupParams });
        });
        var dcCharts = (dc.charts || []);
        dcCharts.forEach(function(chart) {
            renderItems.push({ sortOrder: chart.sortOrder || 0, type: 'chart', chart: chart });
        });
        renderItems.sort(function(itemA, itemB) { return itemA.sortOrder - itemB.sortOrder; });

        renderItems.forEach(function(item) {
            if (item.type === 'group') {
                var groupMaxValue = item.params.reduce(function(maxAccum, currentParam) {
                    var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
                    return numVal > maxAccum ? numVal : maxAccum;
                }, 1);
                html += '<div class="cm-section-label">' + escapePreviewHtml(item.group.label).toUpperCase() + '</div>';
                item.params.forEach(function(param) {
                    var paramGraphType = paramDisplayMap[param.key] ? (paramDisplayMap[param.key].graphType || 'sparkline') : 'sparkline';
                    html += buildMockParamRow(param, textLabel, paramGraphType, accentClr, groupMaxValue, computedLabelWidth);
                });
            } else if (item.type === 'chart') {
                var chart = item.chart;
                var chartParams = (chart.parameterKeys || []).map(function(chartParamKey) {
                    return parameters.find(function(parameter) { return parameter.key === chartParamKey; });
                }).filter(Boolean);
                if (chartParams.length === 0) return;
                var chartLabel = chart.label || chart.chartType.toUpperCase();
                html += '<div class="cm-section-label">' + escapePreviewHtml(chartLabel).toUpperCase() + '</div>';
                var chartHeight = chart.chartHeight || (40 + chartParams.length * 20);
                if (chart.chartType === 'combined') {
                    html += buildCombinedChart(chartParams, accentClr, chartHeight);
                } else if (chart.chartType === 'cumulative') {
                    html += buildCumulativeChart(chartParams, accentClr, chartHeight);
                } else if (chart.chartType === 'relative') {
                    var relativeMaxValue = chartParams.reduce(function(maxAccum, currentParam) {
                        var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
                        return numVal > maxAccum ? numVal : maxAccum;
                    }, 1);
                    chartParams.forEach(function(param) {
                        var displayValue = param.defaultValue !== undefined && param.defaultValue !== '' ? String(param.defaultValue) : '0';
                        var numericValue = Math.abs(parseFloat(displayValue) || 0);
                        var fillPercent = Math.min((numericValue / relativeMaxValue) * 100, 100);
                        html += '<div class="cm-row">' +
                            '<div class="cm-graph-bg"><div style="position:absolute;bottom:0;left:0;height:100%;width:' + fillPercent.toFixed(1) + '%;background:' + accentClr + ';opacity:0.15;"></div></div>' +
                            '<span class="cm-row-label" style="width:' + computedLabelWidth + 'px;">' + escapePreviewHtml((param.label || param.key || '').toUpperCase()) + '</span>' +
                            '<span class="cm-row-value">' + escapePreviewHtml(displayValue) + '</span>' +
                            '</div>';
                    });
                }
            }
        });

        if (ungroupedParams.length > 0) {
            var ungroupedMaxValue = ungroupedParams.reduce(function(maxAccum, currentParam) {
                var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
                return numVal > maxAccum ? numVal : maxAccum;
            }, 1);
            html += '<div class="cm-section-label">VARIABLES</div>';
            ungroupedParams.forEach(function(param) {
                var paramGraphType = paramDisplayMap[param.key] ? (paramDisplayMap[param.key].graphType || 'sparkline') : 'sparkline';
                html += buildMockParamRow(param, textLabel, paramGraphType, accentClr, ungroupedMaxValue, computedLabelWidth);
            });
        }
    } else if (parameters.length > 0) {
        var flatMaxValue = parameters.reduce(function(maxAccum, currentParam) {
            var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
            return numVal > maxAccum ? numVal : maxAccum;
        }, 1);
        html += '<div class="cm-section-label">VARIABLES</div>';
        parameters.forEach(function(param) {
            html += buildMockParamRow(param, textLabel, 'sparkline', accentClr, flatMaxValue, computedLabelWidth);
        });
    }

    // Actions
    if (actions.length > 0) {
        html += '<div class="cm-section-label">ACTIONS</div>';
        actions.forEach(function(action) {
            var dotColor = action.enabled !== false ? '#22c55e' : '#ef4444';
            var triggerLabel = (action.trigger || 'onTurnAdvance').replace(/([A-Z])/g, ' $1').trim();
            html += '<div class="cm-action-row">';
            html += '<div class="cm-action-dot" style="background:' + dotColor + ';"></div>';
            html += '<span class="cm-action-label">' + escapePreviewHtml(action.label || action.key || '') + '</span>';
            html += '<span class="cm-action-trigger">' + escapePreviewHtml(triggerLabel) + '</span>';
            html += '</div>';
        });
    }

    // Footer
    html += '<div class="cm-footer" style="background:' + panelBg + ';">Preview — ' + new Date().toLocaleDateString() + '</div>';

    html += '</div>';
    container.innerHTML = html;
}

function buildMockParamRow(param, labelColor, graphType, accentColor, groupMaxValue, labelWidth) {
    var displayValue = param.defaultValue !== undefined && param.defaultValue !== '' ? String(param.defaultValue) : '0';
    var label = (param.label || param.key || '').toUpperCase();
    var graphHtml = '';

    if (graphType && graphType !== 'none') {
        var mockData = generateMockTimeSeries(parseFloat(displayValue) || 0, param.key);
        if (graphType === 'bar') {
            graphHtml = '<div class="cm-graph-bg">' + buildBarGraphSvg(mockData, accentColor) + '</div>';
        } else {
            graphHtml = '<div class="cm-graph-bg">' + buildSparklineSvg(mockData, accentColor) + '</div>';
        }
    }

    var columnWidth = labelWidth || 140;
    return '<div class="cm-row">' +
        graphHtml +
        '<span class="cm-row-label" style="width:' + columnWidth + 'px;">' + escapePreviewHtml(label) + '</span>' +
        '<span class="cm-row-value">' + escapePreviewHtml(displayValue) + '</span>' +
        '</div>';
}

/**
 * Generate deterministic mock time series data from a base value and key.
 * Uses a simple seeded pseudo-random walk so the preview is stable per-param.
 */
function generateMockTimeSeries(baseValue, seedKey) {
    var seed = 0;
    for (var charIndex = 0; charIndex < seedKey.length; charIndex++) {
        seed = ((seed << 5) - seed + seedKey.charCodeAt(charIndex)) | 0;
    }
    var points = [];
    var current = baseValue || 50;
    var amplitude = Math.max(Math.abs(current) * 0.3, 5);
    for (var pointIndex = 0; pointIndex < 12; pointIndex++) {
        seed = (seed * 16807 + 0) % 2147483647;
        var noise = ((seed % 1000) / 1000 - 0.5) * amplitude;
        current = current + noise;
        points.push(current);
    }
    return points;
}

/**
 * Build an inline SVG sparkline (polyline) from data points.
 */
function buildSparklineSvg(dataPoints, strokeColor) {
    if (!dataPoints || dataPoints.length < 2) return '';
    var minVal = Math.min.apply(null, dataPoints);
    var maxVal = Math.max.apply(null, dataPoints);
    var range = maxVal - minVal || 1;
    var points = [];
    for (var pointIndex = 0; pointIndex < dataPoints.length; pointIndex++) {
        var xCoord = (pointIndex / (dataPoints.length - 1)) * 100;
        var yCoord = 100 - ((dataPoints[pointIndex] - minVal) / range) * 100;
        points.push(xCoord.toFixed(1) + ',' + yCoord.toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="' + points.join(' ') + '" fill="none" stroke="' + strokeColor + '" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>';
}

/**
 * Build an inline SVG bar chart from data points.
 * Bars are scaled relative to the min/max range within the data.
 */
function buildBarGraphSvg(dataPoints, fillColor) {
    if (!dataPoints || dataPoints.length < 2) return '';
    var barCount = Math.min(dataPoints.length, 20);
    var recentData = dataPoints.slice(-barCount);
    var minVal = Math.min.apply(null, recentData);
    var maxVal = Math.max.apply(null, recentData);
    var range = maxVal - minVal || 1;
    var barWidth = 100 / barCount;
    var bars = '';
    for (var barIndex = 0; barIndex < recentData.length; barIndex++) {
        var normalizedHeight = ((recentData[barIndex] - minVal) / range) * 80;
        var barX = barIndex * barWidth;
        var barY = 100 - normalizedHeight;
        bars += '<rect x="' + barX.toFixed(1) + '%" y="' + barY.toFixed(1) + '%" width="' + (barWidth * 0.7).toFixed(1) + '%" height="' + normalizedHeight.toFixed(1) + '%" fill="' + fillColor + '" rx="1"/>';
    }
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + bars + '</svg>';
}

/** Color palette for multi-param charts — cycles through distinct hues. */
var CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#ef4444'];

/**
 * Build a combined overlay chart — multiple sparklines on one SVG.
 * Each parameter gets its own colored line, overlaid in one chart area.
 */
function buildCombinedChart(groupParams, accentColor, chartHeight) {
    if (groupParams.length === 0) return '';
    var svgContent = '';
    var legendHtml = '<div class="cm-chart-legend">';

    for (var paramIndex = 0; paramIndex < groupParams.length; paramIndex++) {
        var param = groupParams[paramIndex];
        var color = CHART_COLORS[paramIndex % CHART_COLORS.length];
        var baseValue = parseFloat(param.defaultValue) || 0;
        var mockData = generateMockTimeSeries(baseValue, param.key);
        var minVal = Math.min.apply(null, mockData);
        var maxVal = Math.max.apply(null, mockData);
        var range = maxVal - minVal || 1;
        var points = [];
        for (var pointIdx = 0; pointIdx < mockData.length; pointIdx++) {
            var xCoord = (pointIdx / (mockData.length - 1)) * 100;
            var yCoord = 100 - ((mockData[pointIdx] - minVal) / range) * 100;
            points.push(xCoord.toFixed(1) + ',' + yCoord.toFixed(1));
        }
        svgContent += '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        legendHtml += '<span class="cm-legend-item"><span class="cm-legend-dot" style="background:' + color + ';"></span>' + escapePreviewHtml((param.label || param.key || '').toUpperCase()) + '</span>';
    }

    legendHtml += '</div>';
    return '<div class="cm-group-chart">' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="height:' + chartHeight + 'px;">' + svgContent + '</svg>' +
        legendHtml + '</div>';
}

/**
 * Build a cumulative stacked area chart — each parameter stacks on top of the previous.
 * Areas are filled with transparency so layers are visible.
 */
function buildCumulativeChart(groupParams, accentColor, chartHeight) {
    if (groupParams.length === 0) return '';
    var dataPerParam = [];
    var pointCount = 12;

    for (var paramIndex = 0; paramIndex < groupParams.length; paramIndex++) {
        var baseValue = parseFloat(groupParams[paramIndex].defaultValue) || 0;
        dataPerParam.push(generateMockTimeSeries(baseValue, groupParams[paramIndex].key));
    }

    // Compute cumulative sums per point
    var cumulativeData = [];
    for (var stackIndex = 0; stackIndex < dataPerParam.length; stackIndex++) {
        var stackedRow = [];
        for (var pointIdx = 0; pointIdx < pointCount; pointIdx++) {
            var previousValue = stackIndex > 0 ? cumulativeData[stackIndex - 1][pointIdx] : 0;
            stackedRow.push(previousValue + Math.abs(dataPerParam[stackIndex][pointIdx]));
        }
        cumulativeData.push(stackedRow);
    }

    // Find global max for scaling
    var globalMax = 1;
    for (var stackIdx = 0; stackIdx < cumulativeData.length; stackIdx++) {
        for (var ptIdx = 0; ptIdx < pointCount; ptIdx++) {
            if (cumulativeData[stackIdx][ptIdx] > globalMax) globalMax = cumulativeData[stackIdx][ptIdx];
        }
    }

    // Draw areas from top layer to bottom so earlier layers are behind
    var svgContent = '';
    var legendHtml = '<div class="cm-chart-legend">';

    for (var layerIndex = cumulativeData.length - 1; layerIndex >= 0; layerIndex--) {
        var color = CHART_COLORS[layerIndex % CHART_COLORS.length];
        var areaPoints = '';
        // Top edge (cumulative values)
        for (var fwdIdx = 0; fwdIdx < pointCount; fwdIdx++) {
            var xPos = (fwdIdx / (pointCount - 1)) * 100;
            var yPos = 100 - (cumulativeData[layerIndex][fwdIdx] / globalMax) * 100;
            areaPoints += xPos.toFixed(1) + ',' + yPos.toFixed(1) + ' ';
        }
        // Bottom edge (previous layer or baseline)
        for (var revIdx = pointCount - 1; revIdx >= 0; revIdx--) {
            var xPosRev = (revIdx / (pointCount - 1)) * 100;
            var yPosRev = layerIndex > 0
                ? 100 - (cumulativeData[layerIndex - 1][revIdx] / globalMax) * 100
                : 100;
            areaPoints += xPosRev.toFixed(1) + ',' + yPosRev.toFixed(1) + ' ';
        }
        svgContent += '<polygon points="' + areaPoints.trim() + '" fill="' + color + '" opacity="0.5"/>';
    }

    for (var legendIdx = 0; legendIdx < groupParams.length; legendIdx++) {
        var legendColor = CHART_COLORS[legendIdx % CHART_COLORS.length];
        legendHtml += '<span class="cm-legend-item"><span class="cm-legend-dot" style="background:' + legendColor + ';"></span>' + escapePreviewHtml((groupParams[legendIdx].label || groupParams[legendIdx].key || '').toUpperCase()) + '</span>';
    }

    legendHtml += '</div>';
    return '<div class="cm-group-chart">' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="height:' + chartHeight + 'px;">' + svgContent + '</svg>' +
        legendHtml + '</div>';
}

function escapePreviewHtml(text) {
    var div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}
/* ── End Card Preview ── */

function addParameter() {
    parameterCounter++;
    const parameterId = 'param_' + parameterCounter;
    const container = document.getElementById('parametersContainer');
    const row = document.createElement('div');
    row.className = 'param-row';
    row.id = parameterId;
    row.innerHTML = \`
        <div class="param-key-header" draggable="true" title="Drag to a group or chart in the sidebar">
            <span class="param-drag-icon">&#x2630;</span>
            <input type="text" data-field="key" placeholder="productionRate" oninput="updatePreview(); dcRefreshIfEnabled();" onclick="event.stopPropagation();" draggable="false">
            <button class="btn-remove" onclick="removeElement('\${parameterId}')" draggable="false">X</button>
        </div>
        <div class="param-fields">
            <div class="param-grid">
                <div class="field">
                    <label>Label</label>
                    <input type="text" data-field="label" placeholder="Production Rate" oninput="updatePreview()">
                </div>
                <div class="field">
                    <label>Type</label>
                    <select data-field="valueType" onchange="updatePreview()">
                        <option value="number">number</option>
                        <option value="string">string</option>
                        <option value="boolean">boolean</option>
                    </select>
                </div>
                <div class="field">
                    <label>Default</label>
                    <input type="text" data-field="defaultValue" placeholder="10" oninput="updatePreview()">
                </div>
                <div class="field">
                    <label>Category</label>
                    <input type="text" data-field="category" placeholder="production" oninput="updatePreview()">
                </div>
                <div class="field full-width">
                    <label>Description</label>
                    <input type="text" data-field="description" placeholder="Units produced per turn." oninput="updatePreview()">
                </div>
            </div>
        </div>
    \`;

    var keyHeader = row.querySelector('.param-key-header');
    keyHeader.addEventListener('dragstart', function(ev) {
        var keyInput = row.querySelector('[data-field="key"]');
        var paramKey = keyInput ? keyInput.value.trim() : '';
        if (!paramKey) { ev.preventDefault(); return; }
        ev.dataTransfer.setData('text/plain', paramKey);
        ev.dataTransfer.effectAllowed = 'copy';
        _dcDragType = 'dcparam';
        _dcDragParamKey = paramKey;
        row.classList.add('dragging');
    });
    keyHeader.addEventListener('dragend', function() {
        _dcDragType = null;
        _dcDragParamKey = null;
        row.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
    });

    container.appendChild(row);
    updatePreview();
    dcRefreshIfEnabled();
}

function addAction() {
    actionCounter++;
    const actionId = 'action_' + actionCounter;
    const container = document.getElementById('actionsContainer');
    const row = document.createElement('div');
    row.className = 'action-row';
    row.id = actionId;
    row.innerHTML = \`
        <button class="btn-remove" onclick="removeElement('\${actionId}')">X</button>
        <div class="action-grid">
            <div class="field">
                <label>Key</label>
                <input type="text" data-field="key" placeholder="produceGoods" oninput="updatePreview()">
            </div>
            <div class="field">
                <label>Label</label>
                <input type="text" data-field="label" placeholder="Produce Goods" oninput="updatePreview()">
            </div>
            <div class="field">
                <label>Trigger</label>
                <select data-field="trigger" onchange="updatePreview()">
                    <option value="onTurnAdvance">onTurnAdvance</option>
                    <option value="onManual">onManual</option>
                    <option value="onCreate">onCreate</option>
                    <option value="onDestroy">onDestroy</option>
                </select>
            </div>
            <div class="field">
                <label>Priority</label>
                <input type="number" data-field="priority" placeholder="10" value="10" oninput="updatePreview()">
            </div>
            <div class="field full-width">
                <label>Description</label>
                <input type="text" data-field="description" placeholder="Converts raw materials." oninput="updatePreview()">
            </div>
            <div class="field full-width checkbox-field">
                <input type="checkbox" data-field="enabled" checked onchange="updatePreview()">
                <label>Enabled</label>
            </div>
            <div class="field full-width">
                <label>Expressions</label>
                <div class="expression-list" data-field="expressions">
                    <div class="expression-row">
                        <input type="text" placeholder="output += rate  or  @Mine.ore -= 5" oninput="updatePreview()">
                        <button class="btn-expr-remove" onclick="removeExpression(this)">-</button>
                    </div>
                </div>
                <button class="btn-expr-add" onclick="addExpression(this.previousElementSibling)">+ expression</button>
            </div>
        </div>
    \`;
    container.appendChild(row);
    updatePreview();
}

function addExpression(expressionList) {
    const row = document.createElement('div');
    row.className = 'expression-row';
    row.innerHTML = '<input type="text" placeholder="variable += value  or  @Template.param -= value" oninput="updatePreview()"><button class="btn-expr-remove" onclick="removeExpression(this)">-</button>';
    expressionList.appendChild(row);
    updatePreview();
}

function removeExpression(button) {
    const row = button.parentElement;
    const list = row.parentElement;
    if (list.children.length > 1) {
        row.remove();
        updatePreview();
    }
}

function removeElement(elementId) {
    document.getElementById(elementId).remove();
    updatePreview();
    dcRefreshIfEnabled();
}

function castDefaultValue(rawValue, valueType) {
    if (valueType === 'number') {
        const parsed = Number(rawValue);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (valueType === 'boolean') {
        return rawValue === 'true' || rawValue === '1';
    }
    return rawValue;
}

function buildJson() {
    const templateObject = {};

    const nameValue = document.getElementById('templateName').value.trim();
    if (nameValue) templateObject.name = nameValue;

    const descriptionValue = document.getElementById('templateDescription').value.trim();
    if (descriptionValue) templateObject.description = descriptionValue;

    const parameterRows = document.querySelectorAll('.param-row');
    if (parameterRows.length > 0) {
        templateObject.parameters = [];
        parameterRows.forEach(function(row) {
            const parameter = {};
            const keyInput = row.querySelector('[data-field="key"]');
            const labelInput = row.querySelector('[data-field="label"]');
            const typeSelect = row.querySelector('[data-field="valueType"]');
            const defaultInput = row.querySelector('[data-field="defaultValue"]');
            const categoryInput = row.querySelector('[data-field="category"]');
            const descInput = row.querySelector('[data-field="description"]');

            parameter.key = keyInput ? keyInput.value.trim() : '';
            parameter.label = labelInput ? labelInput.value.trim() : '';
            parameter.valueType = typeSelect ? typeSelect.value : 'number';
            parameter.defaultValue = castDefaultValue(
                defaultInput ? defaultInput.value.trim() : '0',
                parameter.valueType
            );
            const categoryValue = categoryInput ? categoryInput.value.trim() : '';
            if (categoryValue) parameter.category = categoryValue;
            const descValue = descInput ? descInput.value.trim() : '';
            if (descValue) parameter.description = descValue;

            templateObject.parameters.push(parameter);
        });
    }

    const actionRows = document.querySelectorAll('.action-row');
    if (actionRows.length > 0) {
        templateObject.actions = [];
        actionRows.forEach(function(row) {
            const action = {};
            const keyInput = row.querySelector('[data-field="key"]');
            const labelInput = row.querySelector('[data-field="label"]');
            const triggerSelect = row.querySelector('[data-field="trigger"]');
            const priorityInput = row.querySelector('[data-field="priority"]');
            const descInput = row.querySelector('[data-field="description"]');
            const enabledCheck = row.querySelector('[data-field="enabled"]');
            const expressionInputs = row.querySelectorAll('.expression-list input');

            action.key = keyInput ? keyInput.value.trim() : '';
            action.label = labelInput ? labelInput.value.trim() : '';
            action.trigger = triggerSelect ? triggerSelect.value : 'onTurnAdvance';
            action.priority = priorityInput ? parseInt(priorityInput.value, 10) || 0 : 0;
            const descValue = descInput ? descInput.value.trim() : '';
            if (descValue) action.description = descValue;
            action.enabled = enabledCheck ? enabledCheck.checked : true;
            action.expressions = [];
            expressionInputs.forEach(function(input) {
                const expressionValue = input.value.trim();
                if (expressionValue) action.expressions.push(expressionValue);
            });

            templateObject.actions.push(action);
        });
    }

    if (_dcConfig) {
        var dcOut = {};
        if (_dcConfig.groups && _dcConfig.groups.length > 0) { dcOut.groups = _dcConfig.groups; }
        if (_dcConfig.parameterDisplay && _dcConfig.parameterDisplay.length > 0) { dcOut.parameterDisplay = _dcConfig.parameterDisplay; }
        if (_dcConfig.styleConfig && Object.keys(_dcConfig.styleConfig).length > 0) { dcOut.styleConfig = _dcConfig.styleConfig; }
        if (_dcConfig.charts && _dcConfig.charts.length > 0) { dcOut.charts = _dcConfig.charts; }
        if (Object.keys(dcOut).length > 0) { templateObject.displayConfig = dcOut; }
    }

    return templateObject;
}

function validate(templateObject) {
    const errors = [];
    if (!templateObject.name) errors.push('Name is required.');
    if (!templateObject.parameters || templateObject.parameters.length === 0) {
        errors.push('At least one parameter is required.');
    } else {
        const keySet = new Set();
        templateObject.parameters.forEach(function(parameter, index) {
            if (!parameter.key) errors.push('Parameter ' + (index + 1) + ': key is required.');
            else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(parameter.key)) errors.push('Parameter "' + parameter.key + '": key must be a valid identifier.');
            if (keySet.has(parameter.key)) errors.push('Parameter "' + parameter.key + '": duplicate key.');
            keySet.add(parameter.key);
            if (!parameter.label) errors.push('Parameter ' + (index + 1) + ': label is required.');
        });
    }
    if (templateObject.actions) {
        const actionKeySet = new Set();
        templateObject.actions.forEach(function(action, index) {
            if (!action.key) errors.push('Action ' + (index + 1) + ': key is required.');
            if (actionKeySet.has(action.key)) errors.push('Action "' + action.key + '": duplicate key.');
            actionKeySet.add(action.key);
            if (!action.label) errors.push('Action ' + (index + 1) + ': label is required.');
            if (!action.expressions || action.expressions.length === 0) errors.push('Action "' + (action.key || index + 1) + '": needs at least one expression.');
        });
    }
    return errors;
}

function updatePreview() {
    const templateObject = buildJson();
    const preview = document.getElementById('jsonPreview');
    preview.textContent = JSON.stringify(templateObject, null, 2);

    const messagesContainer = document.getElementById('validationMessages');
    const errors = validate(templateObject);
    if (errors.length === 0) {
        messagesContainer.innerHTML = '<div class="validation-ok">Valid template.</div>';
    } else {
        messagesContainer.innerHTML = errors.map(function(error) {
            return '<div class="validation-error">' + error + '</div>';
        }).join('');
    }

    renderCardPreview();
}

function copyJson() {
    const templateObject = buildJson();
    navigator.clipboard.writeText(JSON.stringify(templateObject, null, 2)).then(function() {
        const copyButton = document.querySelector('.btn-copy');
        copyButton.textContent = 'Copied!';
        setTimeout(function() { copyButton.textContent = 'Copy'; }, 1500);
    });
}

function downloadJson() {
    const templateObject = buildJson();
    const fileName = (templateObject.name || 'template').toLowerCase().replace(/[^a-z0-9]/g, '_') + '.json';
    const blob = new Blob([JSON.stringify(templateObject, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
}

function uploadJson(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(readEvent) {
        try {
            const parsed = JSON.parse(readEvent.target.result);
            loadFromJson(parsed);
        } catch(error) {
            alert('Invalid JSON file: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function loadFromJson(templateObject) {
    document.getElementById('templateName').value = templateObject.name || '';
    document.getElementById('templateDescription').value = templateObject.description || '';

    // Load display config from uploaded JSON into inline editor
    if (templateObject.displayConfig && typeof templateObject.displayConfig === 'object') {
        _dcConfig = {
            groups: templateObject.displayConfig.groups || [],
            parameterDisplay: templateObject.displayConfig.parameterDisplay || [],
            charts: templateObject.displayConfig.charts || [],
            styleConfig: templateObject.displayConfig.styleConfig || {}
        };
    } else {
        _dcConfig = { groups: [], parameterDisplay: [], charts: [], styleConfig: {} };
    }

    document.getElementById('parametersContainer').innerHTML = '';
    parameterCounter = 0;
    if (templateObject.parameters) {
        templateObject.parameters.forEach(function(parameter) {
            addParameter();
            const row = document.getElementById('param_' + parameterCounter);
            row.querySelector('[data-field="key"]').value = parameter.key || '';
            row.querySelector('[data-field="label"]').value = parameter.label || '';
            row.querySelector('[data-field="valueType"]').value = parameter.valueType || 'number';
            row.querySelector('[data-field="defaultValue"]').value = String(parameter.defaultValue ?? '');
            row.querySelector('[data-field="category"]').value = parameter.category || '';
            row.querySelector('[data-field="description"]').value = parameter.description || '';
        });
    }

    document.getElementById('actionsContainer').innerHTML = '';
    actionCounter = 0;
    if (templateObject.actions) {
        templateObject.actions.forEach(function(action) {
            addAction();
            const row = document.getElementById('action_' + actionCounter);
            row.querySelector('[data-field="key"]').value = action.key || '';
            row.querySelector('[data-field="label"]').value = action.label || '';
            row.querySelector('[data-field="trigger"]').value = action.trigger || 'onTurnAdvance';
            row.querySelector('[data-field="priority"]').value = action.priority ?? 10;
            row.querySelector('[data-field="description"]').value = action.description || '';
            row.querySelector('[data-field="enabled"]').checked = action.enabled !== false;

            const expressionList = row.querySelector('.expression-list');
            expressionList.innerHTML = '';
            const expressions = action.expressions || [];
            if (expressions.length === 0) expressions.push('');
            expressions.forEach(function(expression) {
                const expressionRow = document.createElement('div');
                expressionRow.className = 'expression-row';
                expressionRow.innerHTML = '<input type="text" placeholder="variable += value  or  @Template.param -= value" oninput="updatePreview()" value="' + expression.replace(/"/g, '&quot;') + '"><button class="btn-expr-remove" onclick="removeExpression(this)">-</button>';
                expressionList.appendChild(expressionRow);
            });
        });
    }

    dcRenderAll();
    updatePreview();
}

/** Cached template data fetched from the server. */
let cachedAvailableTemplates = [];

/**
 * Fetch templates from the server for the given game UID.
 * Populates the available cross-references panel.
 */
function fetchTemplates() {
    const gameUidInput = document.getElementById('gameUid');
    const gameUidValue = gameUidInput.value.trim();
    if (!gameUidValue) {
        alert('Enter a Game UID first.');
        return;
    }

    const fetchButton = document.querySelector('.btn-fetch');
    fetchButton.classList.add('loading');
    fetchButton.textContent = 'Loading...';

    fetch('/api/templates?gameUid=' + encodeURIComponent(gameUidValue))
    .then(function(response) { return response.json(); })
    .then(function(result) {
        fetchButton.classList.remove('loading');
        fetchButton.textContent = 'Load Templates';

        if (result.error) {
            alert('Server error: ' + result.error);
            return;
        }

        cachedAvailableTemplates = result.templates || [];
        renderRefsPanel(cachedAvailableTemplates);
    })
    .catch(function(fetchError) {
        fetchButton.classList.remove('loading');
        fetchButton.textContent = 'Load Templates';
        alert('Failed to fetch templates: ' + fetchError.message);
    });
}

/**
 * Render the available cross-references panel from fetched template data.
 * @param {Array} templates Array of template summaries.
 */
function renderRefsPanel(templates) {
    const panel = document.getElementById('availableRefsPanel');
    const listContainer = document.getElementById('refsList');

    if (!templates || templates.length === 0) {
        panel.style.display = 'block';
        listContainer.innerHTML = '<span class="ref-no-params">No templates found for this game.</span>';
        return;
    }

    panel.style.display = 'block';
    var html = '';

    templates.forEach(function(template) {
        html += '<div class="ref-template-group">';
        html += '<div class="ref-template-name">' + template.name + '</div>';

        var numericParams = template.parameters.filter(function(parameter) {
            return parameter.valueType === 'number';
        });

        if (numericParams.length > 0) {
            numericParams.forEach(function(parameter) {
                var refText = '@' + template.name + '.' + parameter.key;
                html += '<span class="ref-param-tag" title="Click to insert: ' + refText + ' (' + (parameter.label || parameter.key) + ')" onclick="insertRefAtCursor(\\'' + refText + '\\')">' + refText + '</span>';
            });
        } else {
            html += '<span class="ref-no-params">No numeric parameters</span>';
        }
        html += '</div>';
    });

    listContainer.innerHTML = html;
}

/** Tracks the last focused expression input element. */
let lastFocusedExpressionInput = null;

/**
 * Track focus on expression inputs.
 * Attaches to document-level focusin to catch dynamically added inputs.
 */
document.addEventListener('focusin', function(event) {
    var target = event.target;
    if (target.tagName === 'INPUT' && target.closest('.expression-row')) {
        lastFocusedExpressionInput = target;
    }
});

/**
 * Insert a reference string at the cursor position of the last focused expression input.
 * If no expression input was focused, does nothing.
 * @param {string} refText The reference string to insert (e.g., '@Mine.oreOutput').
 */
function insertRefAtCursor(refText) {
    if (!lastFocusedExpressionInput) {
        // Try to find the first expression input as fallback
        var firstExprInput = document.querySelector('.expression-row input');
        if (firstExprInput) {
            lastFocusedExpressionInput = firstExprInput;
        } else {
            return;
        }
    }

    var input = lastFocusedExpressionInput;
    var cursorStart = input.selectionStart || 0;
    var cursorEnd = input.selectionEnd || 0;
    var currentValue = input.value;

    input.value = currentValue.substring(0, cursorStart) + refText + currentValue.substring(cursorEnd);
    var newCursorPosition = cursorStart + refText.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
    updatePreview();
}

/** Currently visible autocomplete dropdown element, or null. */
let activeAutocompleteDropdown = null;

/** Currently selected autocomplete index for keyboard navigation. */
let autocompleteSelectedIndex = -1;

/**
 * Build autocomplete suggestions from cached templates.
 * @param {string} filterText Text after '@' to filter by.
 * @returns {Array} Array of { refText, templateName, paramKey, paramLabel }.
 */
function buildAutocompleteSuggestions(filterText) {
    var suggestions = [];
    var lowerFilter = filterText.toLowerCase();

    cachedAvailableTemplates.forEach(function(template) {
        var numericParams = (template.parameters || []).filter(function(parameter) {
            return parameter.valueType === 'number';
        });

        numericParams.forEach(function(parameter) {
            var refText = '@' + template.name + '.' + parameter.key;
            if (refText.toLowerCase().indexOf(lowerFilter) >= 0 || lowerFilter === '') {
                suggestions.push({
                    refText: refText,
                    templateName: template.name,
                    paramKey: parameter.key,
                    paramLabel: parameter.label || parameter.key
                });
            }
        });
    });

    return suggestions;
}

/**
 * Show the autocomplete dropdown below the given input element.
 * @param {HTMLInputElement} inputElement The expression input.
 * @param {Array} suggestions Array of suggestion objects.
 * @param {number} atSignPosition Position of the '@' character in the input value.
 */
function showAutocompleteDropdown(inputElement, suggestions, atSignPosition) {
    dismissAutocomplete();

    if (suggestions.length === 0) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    autocompleteSelectedIndex = -1;

    suggestions.forEach(function(suggestion, index) {
        var item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('data-index', index);
        item.innerHTML = '<span class="ac-template-label">' + suggestion.templateName + '</span>.' + suggestion.paramKey + '<span class="ac-param-label">(' + suggestion.paramLabel + ')</span>';

        item.addEventListener('mousedown', function(event) {
            event.preventDefault();
            acceptAutocompleteSuggestion(inputElement, suggestion.refText, atSignPosition);
        });

        dropdown.appendChild(item);
    });

    // Position below the input
    var inputRect = inputElement.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (inputRect.bottom + 2) + 'px';
    dropdown.style.left = inputRect.left + 'px';
    dropdown.style.minWidth = Math.max(inputRect.width, 240) + 'px';

    document.body.appendChild(dropdown);
    activeAutocompleteDropdown = dropdown;
}

/**
 * Accept a selected autocomplete suggestion, inserting it at the @ position.
 * @param {HTMLInputElement} inputElement The expression input.
 * @param {string} refText The full reference text (e.g., '@Mine.oreOutput').
 * @param {number} atSignPosition Position of the '@' in the input.
 */
function acceptAutocompleteSuggestion(inputElement, refText, atSignPosition) {
    var currentValue = inputElement.value;
    var cursorPosition = inputElement.selectionStart || currentValue.length;

    // Replace from @ to current cursor with the full ref
    inputElement.value = currentValue.substring(0, atSignPosition) + refText + currentValue.substring(cursorPosition);
    var newCursorPosition = atSignPosition + refText.length;
    inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    inputElement.focus();
    dismissAutocomplete();
    updatePreview();
}

/**
 * Remove the autocomplete dropdown from the DOM.
 */
function dismissAutocomplete() {
    if (activeAutocompleteDropdown) {
        activeAutocompleteDropdown.remove();
        activeAutocompleteDropdown = null;
        autocompleteSelectedIndex = -1;
    }
}

/**
 * Handle keyboard events on expression inputs for autocomplete navigation.
 */
document.addEventListener('keydown', function(event) {
    if (!activeAutocompleteDropdown) return;

    var items = activeAutocompleteDropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, items.length - 1);
        highlightAutocompleteItem(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, 0);
        highlightAutocompleteItem(items);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
        if (autocompleteSelectedIndex >= 0 && autocompleteSelectedIndex < items.length) {
            event.preventDefault();
            items[autocompleteSelectedIndex].dispatchEvent(new MouseEvent('mousedown'));
        }
    } else if (event.key === 'Escape') {
        dismissAutocomplete();
    }
});

/**
 * Highlight the currently selected autocomplete item.
 * @param {NodeList} items All autocomplete item elements.
 */
function highlightAutocompleteItem(items) {
    items.forEach(function(item, index) {
        if (index === autocompleteSelectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * Handle input events on expression inputs to trigger autocomplete.
 */
document.addEventListener('input', function(event) {
    var target = event.target;
    if (target.tagName !== 'INPUT' || !target.closest('.expression-row')) return;
    if (cachedAvailableTemplates.length === 0) {
        dismissAutocomplete();
        return;
    }

    var cursorPosition = target.selectionStart || 0;
    var textBeforeCursor = target.value.substring(0, cursorPosition);

    // Look for the last '@' before cursor that starts a reference
    var lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex < 0) {
        dismissAutocomplete();
        return;
    }

    // The text after '@' must be a partial identifier or empty (no spaces)
    var partialRef = textBeforeCursor.substring(lastAtIndex + 1);
    if (/\\s/.test(partialRef)) {
        dismissAutocomplete();
        return;
    }

    var suggestions = buildAutocompleteSuggestions(partialRef);
    showAutocompleteDropdown(target, suggestions, lastAtIndex);
});

// Dismiss autocomplete when clicking outside
document.addEventListener('click', function(event) {
    if (activeAutocompleteDropdown && !activeAutocompleteDropdown.contains(event.target)) {
        dismissAutocomplete();
    }
});

/**
 * Validate on server. Uses context-aware validation when a game UID is provided.
 * Falls back to basic /api/validate if no game UID.
 */
function validateOnServer() {
    const templateObject = buildJson();
    const validateButton = document.querySelector('.btn-validate');
    const serverMessages = document.getElementById('serverValidationMessages');
    const gameUidValue = document.getElementById('gameUid').value.trim();

    validateButton.classList.add('loading');
    validateButton.textContent = 'Checking...';
    serverMessages.innerHTML = '';

    var apiUrl = '/api/validate';
    var requestPayload = templateObject;

    if (gameUidValue) {
        apiUrl = '/api/validate-context';
        requestPayload = { gameUid: gameUidValue, template: templateObject };
    }

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        validateButton.classList.remove('loading');
        validateButton.textContent = 'Validate';

        var html = '<div class="server-validation-header">Server Validation</div>';

        if (result.valid) {
            html += '<div class="validation-ok">All checks passed. Template and expressions are valid.</div>';
        } else {
            if (result.structuralErrors && result.structuralErrors.length > 0) {
                result.structuralErrors.forEach(function(error) {
                    html += '<div class="validation-error">[Structure] ' + error + '</div>';
                });
            }
            if (result.expressionErrors && result.expressionErrors.length > 0) {
                result.expressionErrors.forEach(function(exprError) {
                    exprError.errors.forEach(function(message) {
                        html += '<div class="validation-error">[Expression] Action "' + exprError.actionKey + '" #' + (exprError.expressionIndex + 1) + ': ' + message + '</div>';
                    });
                });
            }
            if (result.crossReferenceErrors && result.crossReferenceErrors.length > 0) {
                result.crossReferenceErrors.forEach(function(crossError) {
                    var locationLabel = crossError.expressionIndex >= 0
                        ? 'Action "' + crossError.actionKey + '" expr #' + (crossError.expressionIndex + 1)
                        : 'Action "' + crossError.actionKey + '" target';
                    html += '<div class="validation-warning">[CrossRef] ' + locationLabel + ': ' + crossError.reference + ' — ' + crossError.error + '</div>';
                });
            }
        }

        // Update available templates if returned from context validation
        if (result.availableTemplates) {
            cachedAvailableTemplates = result.availableTemplates.map(function(templateRef) {
                return {
                    name: templateRef.name,
                    parameters: templateRef.numericParameters.map(function(paramKey) {
                        return { key: paramKey, valueType: 'number', label: paramKey };
                    })
                };
            });
            renderRefsPanel(cachedAvailableTemplates);
        }

        serverMessages.innerHTML = html;
    })
    .catch(function(fetchError) {
        validateButton.classList.remove('loading');
        validateButton.textContent = 'Validate';
        serverMessages.innerHTML = '<div class="validation-error">Server unreachable: ' + fetchError.message + '</div>';
    });
}

updatePreview();
dcRenderAll();
`;
}
