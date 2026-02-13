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
<div class="container">
    <h1>Game Object Template Editor</h1>

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
        </div>
    </div>
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1a1a2e;
    color: #e0e0e0;
    line-height: 1.5;
}
.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
h1 {
    text-align: center;
    margin-bottom: 20px;
    color: #7c83ff;
}
h2 {
    font-size: 1.1rem;
    margin-bottom: 12px;
    color: #a0a8ff;
    display: flex;
    align-items: center;
    gap: 10px;
}
.editor-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}
@media (max-width: 900px) {
    .editor-layout { grid-template-columns: 1fr; }
}
.form-panel, .preview-panel {
    background: #16213e;
    border-radius: 8px;
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
    border-bottom: 1px solid #2a2a4a;
    padding-bottom: 16px;
}
.section:last-child { border-bottom: none; }
.field {
    margin-bottom: 10px;
}
.field label {
    display: block;
    font-size: 0.85rem;
    color: #8888aa;
    margin-bottom: 3px;
}
input, textarea, select {
    width: 100%;
    padding: 8px 10px;
    background: #0f3460;
    border: 1px solid #2a2a6a;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 0.9rem;
    font-family: inherit;
}
input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #7c83ff;
}
.param-row, .action-row {
    background: #0d1b3e;
    border: 1px solid #1a2a5e;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 10px;
    position: relative;
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
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    padding: 2px 8px;
    font-size: 0.8rem;
}
.btn-remove:hover { background: #c0392b; }
.btn-add {
    background: #2ecc71;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 0.85rem;
}
.btn-add:hover { background: #27ae60; }
.btn-copy, .btn-download, .btn-upload, .btn-validate {
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 14px;
    cursor: pointer;
    font-size: 0.85rem;
}
.btn-copy:hover, .btn-download:hover, .btn-upload:hover { background: #2980b9; }
.btn-validate {
    background: #9b59b6;
}
.btn-validate:hover { background: #8e44ad; }
.btn-validate.loading {
    opacity: 0.6;
    cursor: wait;
}
.json-preview {
    background: #0a0a1e;
    border: 1px solid #1a1a4a;
    border-radius: 6px;
    padding: 16px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.85rem;
    white-space: pre-wrap;
    word-break: break-word;
    color: #a8e6cf;
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
    font-size: 0.85rem;
}
.validation-error {
    color: #e74c3c;
    padding: 4px 0;
}
.validation-ok {
    color: #2ecc71;
    padding: 4px 0;
}
.validation-warning {
    color: #f39c12;
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
    background: #555;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    padding: 2px 6px;
    font-size: 0.8rem;
}
.btn-expr-add {
    background: #555;
    color: #aaa;
    border: 1px dashed #666;
    border-radius: 3px;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 0.8rem;
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
/* Docs panel styles */
.docs-panel {
    background: #16213e;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #2a2a5e;
}
.docs-toggle {
    padding: 14px 20px;
    cursor: pointer;
    color: #a0a8ff;
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
    font-size: 0.9rem;
    line-height: 1.7;
}
.docs-content h3 {
    color: #7c83ff;
    margin: 16px 0 8px;
    font-size: 1rem;
}
.docs-content h3:first-child { margin-top: 0; }
.docs-content code {
    background: #0a0a1e;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.85rem;
    color: #a8e6cf;
}
.docs-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
}
.docs-content th, .docs-content td {
    border: 1px solid #2a2a5e;
    padding: 6px 10px;
    text-align: left;
}
.docs-content th {
    background: #0f3460;
    color: #a0a8ff;
    font-weight: 600;
}
.docs-content td { background: #0d1b3e; }
.docs-content .example-block {
    background: #0a0a1e;
    border: 1px solid #1a1a4a;
    border-radius: 4px;
    padding: 10px 14px;
    margin: 8px 0;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.85rem;
    color: #a8e6cf;
    white-space: pre-wrap;
}
/* Server validation results */
.server-validation-header {
    color: #a0a8ff;
    font-weight: 600;
    margin-bottom: 6px;
}
/* Game context bar */
.game-context-bar {
    background: #16213e;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 20px;
    border: 1px solid #2a2a5e;
}
.context-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}
.context-field { flex: 1; margin-bottom: 0; }
.btn-fetch {
    background: #e67e22;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 18px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
    height: 36px;
}
.btn-fetch:hover { background: #d35400; }
.btn-fetch.loading { opacity: 0.6; cursor: wait; }
/* Available cross-references panel */
.refs-panel {
    margin-top: 14px;
    border-top: 1px solid #2a2a5e;
    padding-top: 12px;
}
.refs-panel h3 {
    color: #a0a8ff;
    font-size: 0.95rem;
    margin-bottom: 8px;
}
.refs-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.ref-template-group {
    background: #0d1b3e;
    border: 1px solid #1a2a5e;
    border-radius: 6px;
    padding: 10px;
    min-width: 180px;
    max-width: 300px;
}
.ref-template-name {
    color: #7c83ff;
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 6px;
}
.ref-param-tag {
    display: inline-block;
    background: #0f3460;
    border: 1px solid #2a2a6a;
    border-radius: 3px;
    padding: 2px 8px;
    margin: 2px;
    font-size: 0.8rem;
    font-family: 'Fira Code', 'Consolas', monospace;
    color: #a8e6cf;
    cursor: pointer;
    user-select: all;
    transition: border-color 0.15s;
}
.ref-param-tag:hover { border-color: #7c83ff; }
.ref-no-params {
    color: #666;
    font-size: 0.8rem;
    font-style: italic;
}
/* Autocomplete dropdown */
.autocomplete-dropdown {
    position: absolute;
    z-index: 100;
    background: #0d1b3e;
    border: 1px solid #7c83ff;
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
    font-size: 0.85rem;
    color: #a8e6cf;
    border-bottom: 1px solid #1a2a5e;
}
.autocomplete-item:last-child { border-bottom: none; }
.autocomplete-item:hover,
.autocomplete-item.selected {
    background: #0f3460;
}
.autocomplete-item .ac-template-label {
    color: #7c83ff;
    font-weight: 600;
}
.autocomplete-item .ac-param-label {
    color: #888;
    margin-left: 6px;
    font-size: 0.78rem;
}
/* Docs subheadings */
.docs-content h4 {
    color: #8888cc;
    margin: 12px 0 6px;
    font-size: 0.92rem;
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

function addParameter() {
    parameterCounter++;
    const parameterId = 'param_' + parameterCounter;
    const container = document.getElementById('parametersContainer');
    const row = document.createElement('div');
    row.className = 'param-row';
    row.id = parameterId;
    row.innerHTML = \`
        <button class="btn-remove" onclick="removeElement('\${parameterId}')">X</button>
        <div class="param-grid">
            <div class="field">
                <label>Key</label>
                <input type="text" data-field="key" placeholder="productionRate" oninput="updatePreview()">
            </div>
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
    \`;
    container.appendChild(row);
    updatePreview();
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
`;
}
