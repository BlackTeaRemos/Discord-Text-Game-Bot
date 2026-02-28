import { BuildEditorStyles } from './TemplateEditor/EditorStyles.js';
import { BuildEditorDocs } from './TemplateEditor/EditorDocs.js';
import { BuildDisplayConfigScript } from './TemplateEditor/EditorDisplayConfigScript.js';
import { BuildCardPreviewScript } from './TemplateEditor/EditorCardPreviewScript.js';
import { BuildFormScript } from './TemplateEditor/EditorFormScript.js';
import { BuildApiScript } from './TemplateEditor/EditorApiScript.js';

export function BuildTemplateEditorHtml(): string {
    const styles = BuildEditorStyles();
    const docs = BuildEditorDocs();
    const script = __GetScript();

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Game Object Template Editor</title>
<style>
${styles}
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
${docs}
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
${script}
</script>
</body>
</html>`;
}

function __GetScript(): string {
    const displayConfigScript = BuildDisplayConfigScript();
    const cardPreviewScript = BuildCardPreviewScript();
    const formScript = BuildFormScript();
    const apiScript = BuildApiScript();

    return `
let parameterCounter = 0;
let actionCounter = 0;

${displayConfigScript}

${cardPreviewScript}

${formScript}

${apiScript}

updatePreview();
dcRenderAll();
`;
}
