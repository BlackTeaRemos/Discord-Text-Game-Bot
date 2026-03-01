import { BuildDisplayConfigGroupsScript, BuildDisplayConfigActionsScript } from './DisplayConfig/index.js';

export function BuildDisplayConfigPageHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Card Display Configuration</title>
<style>
${__GetStyles()}
</style>
</head>
<body>
<div class="container">
    <h1>Card Display Configuration</h1>
    <nav style="display:flex;gap:12px;margin-bottom:16px;">
        <a href="/editor" style="color:#a0a8ff;text-decoration:none;font-size:13px;padding:4px 10px;border:1px solid #3f3f46;border-radius:4px;">Back to Editor</a>
        <a href="/projections" style="color:#a0a8ff;text-decoration:none;font-size:13px;padding:4px 10px;border:1px solid #3f3f46;border-radius:4px;">Projections</a>
    </nav>

    <section class="context-bar">
        <div class="context-row">
            <div class="field">
                <label for="gameUid">Game UID</label>
                <input type="text" id="gameUid" placeholder="game_abc123">
            </div>
            <button class="btn" onclick="loadTemplates()">Load Templates</button>
        </div>
        <div class="context-row" id="templateRow" style="display:none;">
            <div class="field">
                <label for="templateSelect">Template</label>
                <select id="templateSelect" onchange="loadDisplayConfig()">
                    <option value="">Select template...</option>
                </select>
            </div>
        </div>
    </section>

    <div id="configPanel" style="display:none;">
        <section class="panel">
            <h2>Style Configuration</h2>
            <div class="style-grid" id="styleGrid">
                <div class="style-field">
                    <label>Card Background</label>
                    <input type="color" id="style_cardBackground" value="#000000" onchange="updateStyle('cardBackground', this.value)">
                </div>
                <div class="style-field">
                    <label>Panel Background</label>
                    <input type="color" id="style_panelBackground" value="#09090b" onchange="updateStyle('panelBackground', this.value)">
                </div>
                <div class="style-field">
                    <label>Border Color</label>
                    <input type="color" id="style_borderColor" value="#18181b" onchange="updateStyle('borderColor', this.value)">
                </div>
                <div class="style-field">
                    <label>Accent Color</label>
                    <input type="color" id="style_accentColor" value="#f97316" onchange="updateStyle('accentColor', this.value)">
                </div>
                <div class="style-field">
                    <label>Accent Fill</label>
                    <input type="color" id="style_accentFill" value="#7c2d12" onchange="updateStyle('accentFill', this.value)">
                </div>
                <div class="style-field">
                    <label>Text Primary</label>
                    <input type="color" id="style_textPrimary" value="#f4f4f5" onchange="updateStyle('textPrimary', this.value)">
                </div>
                <div class="style-field">
                    <label>Text Value</label>
                    <input type="color" id="style_textValue" value="#d4d4d8" onchange="updateStyle('textValue', this.value)">
                </div>
                <div class="style-field">
                    <label>Text Label</label>
                    <input type="color" id="style_textLabel" value="#52525b" onchange="updateStyle('textLabel', this.value)">
                </div>
                <div class="style-field">
                    <label>Text Secondary</label>
                    <input type="color" id="style_textSecondary" value="#a1a1aa" onchange="updateStyle('textSecondary', this.value)">
                </div>
                <div class="style-field">
                    <label>Text Muted</label>
                    <input type="color" id="style_textMuted" value="#3f3f46" onchange="updateStyle('textMuted', this.value)">
                </div>
                <div class="style-field">
                    <label>Border Radius</label>
                    <input type="number" id="style_cardBorderRadius" value="0" min="0" max="24" style="width:60px;" onchange="updateStyle('cardBorderRadius', parseInt(this.value))">
                </div>
            </div>
            <button class="btn btn-sm" onclick="resetStyleDefaults()" style="margin-top:8px;">Reset Defaults</button>
        </section>

        <section class="panel">
            <h2>Groups & Parameters</h2>
            <p style="font-size:12px;color:#52525b;margin-bottom:12px;">Drag groups to reorder. Drag parameters between groups to reassign.</p>
            <div id="groupsParamsContainer"></div>
            <button class="btn btn-sm" onclick="addGroup()" style="margin-top:8px;">+ Add Group</button>
        </section>

        <section class="panel">
            <h2>Charts</h2>
            <p style="font-size:12px;color:#52525b;margin-bottom:12px;">Standalone charts rendered as separate display items. Select parameters to include.</p>
            <div id="chartsContainer"></div>
            <button class="btn btn-sm" onclick="addChart()" style="margin-top:8px;">+ Add Chart</button>
        </section>

        <section class="panel">
            <h2>Layout Order</h2>
            <p style="font-size:12px;color:#52525b;margin-bottom:12px;">Drag to set rendering order of groups and charts.</p>
            <div id="layoutOrderContainer"></div>
        </section>

        <div class="actions-bar">
            <button class="btn btn-primary" onclick="saveConfig()">Save Configuration</button>
            <button class="btn" onclick="previewCard()">Preview Card</button>
            <label class="btn" style="cursor:pointer;">
                Import JSON
                <input type="file" accept=".json" onchange="importDisplayConfigJson(event)" hidden>
            </label>
            <button class="btn" onclick="exportDisplayConfigJson()">Export JSON</button>
        </div>

        <section class="panel" id="previewPanel" style="display:none;">
            <h2>Card Preview</h2>
            <div id="previewContainer" class="preview-container"></div>
        </section>
    </div>

    <div id="statusBar" class="status-bar"></div>
</div>
<script>
${__GetScript()}
</script>
<script>
// Auto-load displayConfig from localStorage if transferred from the template editor
(function() {
    try {
        var pending = localStorage.getItem('mpg_pending_display_config');
        if (pending) {
            currentConfig = JSON.parse(pending);
            localStorage.removeItem('mpg_pending_display_config');
            showStatus('Display config imported from template editor. Select a template to apply it.', 'success');
        }
    } catch(importError) {
        console.warn('Failed to import pending displayConfig:', importError);
    }
})();
</script>
</body>
</html>`;
}

/** Dark theme CSS matching the existing template editor aesthetic. */
function __GetStyles(): string {
    return `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #09090b;
    color: #f4f4f5;
    padding: 24px;
    line-height: 1.5;
}
.container { max-width: 900px; margin: 0 auto; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #f97316; }
h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; }
.context-bar, .panel { background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.context-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 8px; }
.field { display: flex; flex-direction: column; flex: 1; }
.field label { font-size: 12px; color: #71717a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
input, select { background: #09090b; border: 1px solid #3f3f46; color: #f4f4f5; padding: 8px 12px; border-radius: 4px; font-size: 14px; width: 100%; }
input:focus, select:focus { outline: none; border-color: #f97316; }
.btn { background: #27272a; border: 1px solid #3f3f46; color: #f4f4f5; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; white-space: nowrap; }
.btn:hover { background: #3f3f46; }
.btn-primary { background: #7c2d12; border-color: #f97316; }
.btn-primary:hover { background: #9a3412; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-danger { background: #7f1d1d; border-color: #ef4444; }
.btn-danger:hover { background: #991b1b; }
.radio-group { display: flex; gap: 16px; }
.radio-group label { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #d4d4d8; }
.group-card { background: #09090b; border: 1px solid #27272a; border-radius: 4px; padding: 12px; margin-bottom: 8px; }
.group-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.group-header input { flex: 1; }
.group-header .sort-order { width: 60px; }
.param-row { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #18181b; }
.param-row:last-child { border-bottom: none; }
.param-name { width: 180px; font-weight: 600; color: #d4d4d8; font-size: 13px; }
.param-field { display: flex; flex-direction: column; }
.param-field label { font-size: 10px; color: #52525b; }
.param-field select, .param-field input { padding: 4px 8px; font-size: 12px; }
.actions-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.style-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.style-field { display: flex; flex-direction: column; gap: 4px; }
.style-field label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
.style-field input[type="color"] { width: 100%; height: 32px; padding: 2px; background: #09090b; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer; }
.style-field input[type="number"] { background: #09090b; border: 1px solid #3f3f46; color: #f4f4f5; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
.preview-container { display: flex; justify-content: center; padding: 16px; background: #09090b; border-radius: 4px; }
.preview-container img { max-width: 100%; border-radius: 2px; }
.status-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 24px; background: #18181b; border-top: 1px solid #27272a; font-size: 13px; color: #71717a; text-align: center; transition: opacity 0.3s; }
.status-bar.success { color: #22c55e; }
.status-bar.error { color: #ef4444; }
.drag-handle { cursor: grab; color: #52525b; user-select: none; }
.dragging { opacity: 0.4; }
.drag-over { border-color: #f97316 !important; background: #18181b !important; }
.drop-indicator { height: 2px; background: #f97316; margin: -1px 0; border-radius: 1px; transition: opacity 0.15s; }
.group-card[draggable="true"] { cursor: grab; transition: opacity 0.15s, border-color 0.15s; }
.group-card[draggable="true"]:active { cursor: grabbing; }
.param-row[draggable="true"] { cursor: grab; transition: opacity 0.15s, background 0.15s; }
.param-row[draggable="true"]:active { cursor: grabbing; }
.group-drop-zone { min-height: 32px; border: 1px dashed #27272a; border-radius: 4px; margin-top: 4px; padding: 4px; transition: border-color 0.15s, background 0.15s; }
.group-drop-zone.drag-over { border-color: #f97316; background: #09090b; }
.group-drop-zone-empty { padding: 12px; text-align: center; color: #3f3f46; font-size: 12px; }
`;
}

function __GetScript(): string {
    return `
let currentTemplateUid = null;
let currentConfig = null;
let templates = [];
${BuildDisplayConfigGroupsScript()}
${BuildDisplayConfigActionsScript()}
`;
}

