/**
 * Build the full HTML document string for the display configuration page.
 * Serves at /display-config on the template editor server.
 *
 * @returns string Complete HTML document.
 *
 * @example
 * const html = BuildDisplayConfigPageHtml();
 * response.end(html);
 */
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

/** Client-side JavaScript for the display config page. */
function __GetScript(): string {
    return `
let currentTemplateUid = null;
let currentConfig = null;
let templates = [];

function showStatus(message, type) {
    const bar = document.getElementById('statusBar');
    bar.textContent = message;
    bar.className = 'status-bar ' + (type || '');
    setTimeout(() => { bar.textContent = ''; bar.className = 'status-bar'; }, 4000);
}

async function loadTemplates() {
    const gameUid = document.getElementById('gameUid').value.trim();
    if (!gameUid) { showStatus('Enter a Game UID first.', 'error'); return; }
    try {
        const response = await fetch('/api/templates?gameUid=' + encodeURIComponent(gameUid));
        const data = await response.json();
        templates = data.templates || [];
        const select = document.getElementById('templateSelect');
        select.innerHTML = '<option value="">Select template...</option>';
        templates.forEach(function(template) {
            const option = document.createElement('option');
            option.value = template.uid;
            option.textContent = template.name + ' (' + template.parameters.length + ' params)';
            select.appendChild(option);
        });
        document.getElementById('templateRow').style.display = 'flex';
        showStatus('Loaded ' + templates.length + ' templates.', 'success');
    } catch(fetchError) {
        showStatus('Failed to load templates: ' + fetchError.message, 'error');
    }
}

async function loadDisplayConfig() {
    const templateUid = document.getElementById('templateSelect').value;
    if (!templateUid) { document.getElementById('configPanel').style.display = 'none'; return; }
    currentTemplateUid = templateUid;
    try {
        const response = await fetch('/api/display-config?templateUid=' + encodeURIComponent(templateUid));
        const data = await response.json();
        currentConfig = data.config;
        renderConfigUI(data.parameters);
        document.getElementById('configPanel').style.display = 'block';
        showStatus('Config loaded for ' + data.templateName, 'success');
    } catch(fetchError) {
        showStatus('Failed to load config: ' + fetchError.message, 'error');
    }
}

function renderConfigUI(parameterDefinitions) {
    // Style config
    renderStyleFields();

    // Unified groups + params
    _lastParamDefs = parameterDefinitions || [];
    renderGroupsAndParams();
    renderCharts();
    renderLayoutOrder();
}

var _lastParamDefs = [];
var _dragType = null;
var _dragIndex = null;
var _dragParamKey = null;
var _dragSourceGroup = null;

function renderGroupsAndParams() {
    var container = document.getElementById('groupsParamsContainer');
    container.innerHTML = '';
    if (!currentConfig) return;

    // Build param display map
    var paramMap = {};
    (currentConfig.parameterDisplay || []).forEach(function(pd) { paramMap[pd.key] = pd; });

    // Build group options for the select dropdowns
    var groupOptions = '<option value="">(none)</option>' +
        currentConfig.groups.map(function(g) { return '<option value="' + escapeHtml(g.key) + '">' + escapeHtml(g.label) + '</option>'; }).join('');

    // Assign params to groups
    var groupedParams = {};
    currentConfig.groups.forEach(function(g) { groupedParams[g.key] = []; });
    var ungrouped = [];

    _lastParamDefs.forEach(function(paramDef) {
        var pd = paramMap[paramDef.key] || { key: paramDef.key, group: '', graphType: 'sparkline', hidden: false, displayOrder: 999 };
        var target = pd.group && groupedParams[pd.group] ? pd.group : '';
        if (target) {
            groupedParams[target].push({ def: paramDef, display: pd });
        } else {
            ungrouped.push({ def: paramDef, display: pd });
        }
    });

    // Sort within groups
    Object.keys(groupedParams).forEach(function(gKey) {
        groupedParams[gKey].sort(function(a, b) { return (a.display.displayOrder || 999) - (b.display.displayOrder || 999); });
    });
    ungrouped.sort(function(a, b) { return (a.display.displayOrder || 999) - (b.display.displayOrder || 999); });

    // Render each group as a draggable card with a drop zone for params
    currentConfig.groups.forEach(function(group, groupIndex) {
        var card = document.createElement('div');
        card.className = 'group-card';
        card.draggable = true;
        card.dataset.groupIndex = groupIndex;
        card.dataset.dragType = 'group';

        // Group header
        var header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML =
            '<span class="drag-handle" title="Drag to reorder group">☰</span>' +
            '<input type="text" value="' + escapeHtml(group.key) + '" placeholder="key" onchange="updateGroup(' + groupIndex + ', \\'key\\', this.value); renderGroupsAndParams();" style="width:100px;" onclick="event.stopPropagation();">' +
            '<input type="text" value="' + escapeHtml(group.label) + '" placeholder="Label" onchange="updateGroup(' + groupIndex + ', \\'label\\', this.value); renderGroupsAndParams();" onclick="event.stopPropagation();">' +
            '<input type="text" value="' + escapeHtml(group.iconUrl || '') + '" placeholder="Icon URL" onchange="updateGroup(' + groupIndex + ', \\'iconUrl\\', this.value);" style="width:120px;" onclick="event.stopPropagation();">' +
            '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); removeGroup(' + groupIndex + ');">x</button>';
        card.appendChild(header);

        // Drop zone for parameters
        var dropZone = document.createElement('div');
        dropZone.className = 'group-drop-zone';
        dropZone.dataset.groupKey = group.key;

        var params = groupedParams[group.key] || [];
        if (params.length === 0) {
            dropZone.innerHTML = '<div class="group-drop-zone-empty">Drop parameters here</div>';
        } else {
            params.forEach(function(entry, paramIndex) {
                dropZone.appendChild(__buildParamRow(entry.def, entry.display, groupOptions, group.key, paramIndex));
            });
        }

        // DnD events for the drop zone (parameter drops)
        dropZone.addEventListener('dragover', function(ev) {
            if (_dragType !== 'param') return;
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', function(ev) {
            if (!dropZone.contains(ev.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });
        dropZone.addEventListener('drop', function(ev) {
            ev.preventDefault();
            dropZone.classList.remove('drag-over');
            if (_dragType !== 'param' || !_dragParamKey) return;
            __moveParamToGroup(_dragParamKey, group.key);
        });

        card.appendChild(dropZone);

        // Group DnD events
        card.addEventListener('dragstart', function(ev) {
            if (ev.target !== card) return;
            _dragType = 'group';
            _dragIndex = groupIndex;
            card.classList.add('dragging');
            ev.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', function() {
            _dragType = null;
            _dragIndex = null;
            card.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
        });
        card.addEventListener('dragover', function(ev) {
            if (_dragType !== 'group') return;
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', function(ev) {
            if (!card.contains(ev.relatedTarget)) {
                card.classList.remove('drag-over');
            }
        });
        card.addEventListener('drop', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            card.classList.remove('drag-over');
            if (_dragType !== 'group' || _dragIndex === null) return;
            __swapGroups(_dragIndex, groupIndex);
        });

        container.appendChild(card);
    });

    // Always show ungrouped/unassigned section as drop target
    var ungroupedCard = document.createElement('div');
    ungroupedCard.className = 'group-card';
    ungroupedCard.style.borderStyle = 'dashed';
    ungroupedCard.innerHTML = '<div class="group-header"><span style="color:#71717a;font-size:12px;font-weight:600;">UNASSIGNED PARAMETERS</span></div>';

    var ungroupedZone = document.createElement('div');
    ungroupedZone.className = 'group-drop-zone';
    ungroupedZone.dataset.groupKey = '';

    if (ungrouped.length === 0) {
        ungroupedZone.innerHTML = '<div style="color:#52525b;font-size:11px;padding:8px;text-align:center;">Drop params here to unassign</div>';
    } else {
        ungrouped.forEach(function(entry, paramIndex) {
            ungroupedZone.appendChild(__buildParamRow(entry.def, entry.display, groupOptions, '', paramIndex));
        });
    }

    ungroupedZone.addEventListener('dragover', function(ev) {
        if (_dragType !== 'param') return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        ungroupedZone.classList.add('drag-over');
    });
    ungroupedZone.addEventListener('dragleave', function(ev) {
        if (!ungroupedZone.contains(ev.relatedTarget)) {
            ungroupedZone.classList.remove('drag-over');
        }
    });
    ungroupedZone.addEventListener('drop', function(ev) {
        ev.preventDefault();
        ungroupedZone.classList.remove('drag-over');
        if (_dragType !== 'param' || !_dragParamKey) return;
        __moveParamToGroup(_dragParamKey, '');
    });

    ungroupedCard.appendChild(ungroupedZone);
    container.appendChild(ungroupedCard);
}

function __buildParamRow(paramDef, display, groupOptions, currentGroupKey, rowIndex) {
    var row = document.createElement('div');
    row.className = 'param-row';
    row.draggable = true;
    row.dataset.paramKey = paramDef.key;
    row.dataset.dragType = 'param';

    row.innerHTML =
        '<span class="drag-handle" title="Drag to reorder or move to another group">⠿</span>' +
        '<span class="param-name">' + escapeHtml(paramDef.label || paramDef.key) + '</span>' +
        '<div class="param-field">' +
            '<label>Graph</label>' +
            '<select onchange="updateParam(\\'' + escapeHtml(paramDef.key) + '\\', \\'graphType\\', this.value)">' +
                '<option value="sparkline"' + (display.graphType === 'sparkline' ? ' selected' : '') + '>Sparkline</option>' +
                '<option value="bar"' + (display.graphType === 'bar' ? ' selected' : '') + '>Bar</option>' +
                '<option value="none"' + (display.graphType === 'none' ? ' selected' : '') + '>None</option>' +
            '</select>' +
        '</div>' +
        '<div class="param-field">' +
            '<label>Hidden</label>' +
            '<input type="checkbox"' + (display.hidden ? ' checked' : '') + ' onchange="updateParam(\\'' + escapeHtml(paramDef.key) + '\\', \\'hidden\\', this.checked)">' +
        '</div>';

    row.addEventListener('dragstart', function(ev) {
        ev.stopPropagation();
        _dragType = 'param';
        _dragParamKey = paramDef.key;
        _dragSourceGroup = currentGroupKey;
        row.classList.add('dragging');
        ev.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', function() {
        _dragType = null;
        _dragParamKey = null;
        _dragSourceGroup = null;
        row.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(function(el) { el.classList.remove('drag-over'); });
    });

    // Param-over-param reordering within same zone
    row.addEventListener('dragover', function(ev) {
        if (_dragType !== 'param') return;
        ev.preventDefault();
        ev.stopPropagation();
        ev.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('drop', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        if (_dragType !== 'param' || !_dragParamKey) return;
        __reorderParamBefore(_dragParamKey, paramDef.key, currentGroupKey);
    });

    return row;
}

function __swapGroups(fromIndex, toIndex) {
    if (fromIndex === toIndex || !currentConfig) return;
    var groups = currentConfig.groups;
    var moved = groups.splice(fromIndex, 1)[0];
    groups.splice(toIndex, 0, moved);
    // Re-assign sortOrder sequentially
    groups.forEach(function(g, idx) { g.sortOrder = idx; });
    renderGroupsAndParams();
    showStatus('Group reordered.', 'success');
}

function __moveParamToGroup(paramKey, targetGroupKey) {
    if (!currentConfig) return;
    var entry = currentConfig.parameterDisplay.find(function(pd) { return pd.key === paramKey; });
    if (!entry) {
        entry = { key: paramKey, group: '', graphType: 'sparkline', hidden: false, displayOrder: 999 };
        currentConfig.parameterDisplay.push(entry);
    }
    if (entry.group === targetGroupKey) return;
    entry.group = targetGroupKey;
    // Set displayOrder to end of target group
    var maxOrder = 0;
    currentConfig.parameterDisplay.forEach(function(pd) {
        if (pd.group === targetGroupKey && pd.displayOrder > maxOrder) { maxOrder = pd.displayOrder; }
    });
    entry.displayOrder = maxOrder + 1;
    renderGroupsAndParams();
    showStatus('Parameter moved to ' + (targetGroupKey || 'unassigned') + '.', 'success');
}

function __reorderParamBefore(draggedKey, targetKey, groupKey) {
    if (draggedKey === targetKey || !currentConfig) return;
    // First, ensure dragged param is in the correct group
    var dragEntry = currentConfig.parameterDisplay.find(function(pd) { return pd.key === draggedKey; });
    if (!dragEntry) {
        dragEntry = { key: draggedKey, group: groupKey, graphType: 'sparkline', hidden: false, displayOrder: 999 };
        currentConfig.parameterDisplay.push(dragEntry);
    }
    dragEntry.group = groupKey;

    // Get all params in this group, sorted by displayOrder
    var groupParams = currentConfig.parameterDisplay
        .filter(function(pd) { return (pd.group || '') === groupKey; })
        .sort(function(a, b) { return (a.displayOrder || 999) - (b.displayOrder || 999); });

    // Remove dragged from list and insert before target
    var filtered = groupParams.filter(function(pd) { return pd.key !== draggedKey; });
    var targetIndex = filtered.findIndex(function(pd) { return pd.key === targetKey; });
    if (targetIndex === -1) { filtered.push(dragEntry); }
    else { filtered.splice(targetIndex, 0, dragEntry); }

    // Re-assign displayOrder
    filtered.forEach(function(pd, idx) { pd.displayOrder = idx; });

    renderGroupsAndParams();
}

function updateGroup(groupIndex, field, value) {
    if (currentConfig && currentConfig.groups[groupIndex]) {
        currentConfig.groups[groupIndex][field] = value;
    }
}

function removeGroup(groupIndex) {
    if (currentConfig) {
        var removedKey = currentConfig.groups[groupIndex].key;
        currentConfig.groups.splice(groupIndex, 1);
        // Unassign parameters that belonged to the removed group
        currentConfig.parameterDisplay.forEach(function(pd) {
            if (pd.group === removedKey) { pd.group = ''; }
        });
        renderGroupsAndParams();
        renderLayoutOrder();
    }
}

function addGroup() {
    if (!currentConfig) return;
    const nextOrder = currentConfig.groups.length + (currentConfig.charts ? currentConfig.charts.length : 0);
    currentConfig.groups.push({ key: 'group_' + currentConfig.groups.length, label: 'Group ' + currentConfig.groups.length, sortOrder: nextOrder });
    renderGroupsAndParams();
    renderLayoutOrder();
}

function addChart() {
    if (!currentConfig) return;
    if (!currentConfig.charts) { currentConfig.charts = []; }
    var nextOrder = currentConfig.groups.length + currentConfig.charts.length;
    currentConfig.charts.push({ key: 'chart_' + currentConfig.charts.length, label: 'Chart ' + currentConfig.charts.length, chartType: 'combined', parameterKeys: [], sortOrder: nextOrder });
    renderCharts();
    renderLayoutOrder();
}

function removeChart(chartIndex) {
    if (!currentConfig || !currentConfig.charts) return;
    currentConfig.charts.splice(chartIndex, 1);
    renderCharts();
    renderLayoutOrder();
}

function updateChart(chartIndex, field, value) {
    if (!currentConfig || !currentConfig.charts || !currentConfig.charts[chartIndex]) return;
    currentConfig.charts[chartIndex][field] = value;
}

function toggleChartParam(chartIndex, paramKey) {
    if (!currentConfig || !currentConfig.charts || !currentConfig.charts[chartIndex]) return;
    var chart = currentConfig.charts[chartIndex];
    if (!chart.parameterKeys) { chart.parameterKeys = []; }
    var existingIndex = chart.parameterKeys.indexOf(paramKey);
    if (existingIndex >= 0) {
        chart.parameterKeys.splice(existingIndex, 1);
    } else {
        chart.parameterKeys.push(paramKey);
    }
    renderCharts();
}

function renderCharts() {
    var container = document.getElementById('chartsContainer');
    if (!container || !currentConfig) return;
    if (!currentConfig.charts) { currentConfig.charts = []; }
    container.innerHTML = '';

    currentConfig.charts.forEach(function(chart, chartIndex) {
        var card = document.createElement('div');
        card.className = 'group-card';
        card.style.cssText = 'border-left:3px solid #f97316;';

        var header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML =
            '<input type="text" value="' + escapeHtml(chart.key) + '" placeholder="key" onchange="updateChart(' + chartIndex + ', \\'key\\', this.value);" style="width:100px;">' +
            '<input type="text" value="' + escapeHtml(chart.label || '') + '" placeholder="Label" onchange="updateChart(' + chartIndex + ', \\'label\\', this.value);">' +
            '<button class="btn btn-sm btn-danger" onclick="removeChart(' + chartIndex + ');">x</button>';
        card.appendChild(header);

        var configRow = document.createElement('div');
        configRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;padding:0 8px;';
        var currentType = chart.chartType || 'combined';
        var currentHeight = chart.chartHeight || 0;
        configRow.innerHTML =
            '<label style="font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">Type</label>' +
            '<select style="flex:1;font-size:12px;padding:4px 6px;" onchange="updateChart(' + chartIndex + ',\\'chartType\\',this.value); renderCharts();">' +
            '<option value="combined"' + (currentType === 'combined' ? ' selected' : '') + '>Combined</option>' +
            '<option value="cumulative"' + (currentType === 'cumulative' ? ' selected' : '') + '>Cumulative</option>' +
            '<option value="relative"' + (currentType === 'relative' ? ' selected' : '') + '>Relative</option>' +
            '</select>' +
            '<label style="font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin-left:8px;">Height</label>' +
            '<input type="number" min="0" step="10" placeholder="auto" value="' + (currentHeight || '') + '" style="width:70px;font-size:12px;padding:4px 6px;" onchange="updateChart(' + chartIndex + ',\\'chartHeight\\',parseInt(this.value)||0);">' +
            '<span style="font-size:10px;color:#52525b;">px</span>';
        card.appendChild(configRow);

        var paramList = document.createElement('div');
        paramList.style.cssText = 'padding:4px 8px;display:flex;flex-wrap:wrap;gap:4px;';
        var selectedKeys = chart.parameterKeys || [];
        _lastParamDefs.forEach(function(paramDef) {
            var isSelected = selectedKeys.indexOf(paramDef.key) >= 0;
            var tag = document.createElement('span');
            tag.style.cssText = 'font-size:11px;padding:2px 8px;border-radius:3px;cursor:pointer;border:1px solid ' + (isSelected ? '#f97316' : '#3f3f46') + ';background:' + (isSelected ? '#7c2d1233' : 'transparent') + ';color:' + (isSelected ? '#f97316' : '#a1a1aa') + ';';
            tag.textContent = paramDef.label || paramDef.key;
            tag.onclick = function() { toggleChartParam(chartIndex, paramDef.key); };
            paramList.appendChild(tag);
        });

        // Accept dropped params — toggle inclusion in chart
        (function(capturedChartIndex) {
            paramList.addEventListener('dragover', function(ev) {
                if (_dragType !== 'param') return;
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'copy';
                paramList.style.outline = '1px dashed #f97316';
            });
            paramList.addEventListener('dragleave', function(ev) {
                if (!paramList.contains(ev.relatedTarget)) { paramList.style.outline = ''; }
            });
            paramList.addEventListener('drop', function(ev) {
                ev.preventDefault();
                paramList.style.outline = '';
                if (_dragType !== 'param' || !_dragParamKey) return;
                toggleChartParam(capturedChartIndex, _dragParamKey);
            });
        })(chartIndex);

        card.appendChild(paramList);

        container.appendChild(card);
    });
}

var _layoutDragIndex = null;

function renderLayoutOrder() {
    var container = document.getElementById('layoutOrderContainer');
    if (!container || !currentConfig) return;
    container.innerHTML = '';

    var items = [];
    (currentConfig.groups || []).forEach(function(group, groupIndex) {
        items.push({ type: 'group', key: group.key, label: group.label || group.key, sortOrder: group.sortOrder || 0, sourceIndex: groupIndex });
    });
    (currentConfig.charts || []).forEach(function(chart, chartIndex) {
        items.push({ type: 'chart', key: chart.key, label: chart.label || chart.key, sortOrder: chart.sortOrder || 0, sourceIndex: chartIndex });
    });
    items.sort(function(itemA, itemB) { return itemA.sortOrder - itemB.sortOrder; });

    items.forEach(function(item, visualIndex) {
        var row = document.createElement('div');
        row.draggable = true;
        row.dataset.layoutIndex = visualIndex;
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:2px;border-radius:4px;cursor:grab;border:1px solid ' + (item.type === 'chart' ? '#f9731644' : '#3f3f46') + ';background:#18181b;font-size:12px;';

        var typeTag = document.createElement('span');
        typeTag.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:' + (item.type === 'chart' ? '#f97316' : '#71717a') + ';width:40px;flex-shrink:0;';
        typeTag.textContent = item.type === 'chart' ? 'CHART' : 'GROUP';
        row.appendChild(typeTag);

        var labelSpan = document.createElement('span');
        labelSpan.style.cssText = 'color:#d4d4d8;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        labelSpan.textContent = item.label;
        row.appendChild(labelSpan);

        (function(capturedVisualIndex) {
            row.addEventListener('dragstart', function(ev) {
                _layoutDragIndex = capturedVisualIndex;
                row.style.opacity = '0.4';
                ev.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragend', function() {
                _layoutDragIndex = null;
                row.style.opacity = '1';
                document.querySelectorAll('#layoutOrderContainer > div').forEach(function(el) { el.style.borderTop = ''; el.style.borderBottom = ''; });
            });
            row.addEventListener('dragover', function(ev) {
                if (_layoutDragIndex === null) return;
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
                if (_layoutDragIndex === null || _layoutDragIndex === capturedVisualIndex) return;
                var rect = row.getBoundingClientRect();
                var midY = rect.top + rect.height / 2;
                var insertBefore = ev.clientY < midY;
                var draggedItem = items[_layoutDragIndex];
                var targetPos = insertBefore ? capturedVisualIndex : capturedVisualIndex + 1;
                if (_layoutDragIndex < targetPos) { targetPos--; }
                items.splice(_layoutDragIndex, 1);
                items.splice(targetPos, 0, draggedItem);
                items.forEach(function(orderedItem, newIndex) {
                    orderedItem.sortOrder = newIndex;
                    if (orderedItem.type === 'group') {
                        currentConfig.groups[orderedItem.sourceIndex].sortOrder = newIndex;
                    } else {
                        currentConfig.charts[orderedItem.sourceIndex].sortOrder = newIndex;
                    }
                });
                _layoutDragIndex = null;
                renderLayoutOrder();
            });
        })(visualIndex);

        container.appendChild(row);
    });

    if (items.length === 0) {
        container.innerHTML = '<span style="font-size:12px;color:#52525b;">Add groups or charts first</span>';
    }
}

var STYLE_DEFAULTS = {
    cardBackground: '#000000',
    panelBackground: '#09090b',
    borderColor: '#18181b',
    accentColor: '#f97316',
    accentFill: '#7c2d12',
    textPrimary: '#f4f4f5',
    textValue: '#d4d4d8',
    textLabel: '#52525b',
    textSecondary: '#a1a1aa',
    textMuted: '#3f3f46',
    cardBorderRadius: 0,
};

function updateStyle(field, value) {
    if (!currentConfig) return;
    if (!currentConfig.styleConfig) { currentConfig.styleConfig = {}; }
    currentConfig.styleConfig[field] = value;
}

function renderStyleFields() {
    if (!currentConfig) return;
    var styleConfig = currentConfig.styleConfig || {};
    var colorFields = ['cardBackground', 'panelBackground', 'borderColor', 'accentColor', 'accentFill', 'textPrimary', 'textValue', 'textLabel', 'textSecondary', 'textMuted'];
    colorFields.forEach(function(field) {
        var input = document.getElementById('style_' + field);
        if (input) { input.value = styleConfig[field] || STYLE_DEFAULTS[field]; }
    });
    var radiusInput = document.getElementById('style_cardBorderRadius');
    if (radiusInput) { radiusInput.value = styleConfig.cardBorderRadius !== undefined ? styleConfig.cardBorderRadius : STYLE_DEFAULTS.cardBorderRadius; }
}

function resetStyleDefaults() {
    if (!currentConfig) return;
    currentConfig.styleConfig = {};
    renderStyleFields();
    showStatus('Style reset to defaults.', 'success');
}

function updateParam(paramKey, field, value) {
    if (!currentConfig) return;
    let entry = currentConfig.parameterDisplay.find(function(paramDisplay) { return paramDisplay.key === paramKey; });
    if (!entry) {
        entry = { key: paramKey, group: '', graphType: 'sparkline', hidden: false, displayOrder: 999 };
        currentConfig.parameterDisplay.push(entry);
    }
    entry[field] = value;
}

function importDisplayConfigJson(event) {
    var fileInput = event.target;
    if (!fileInput.files || !fileInput.files.length) return;
    var reader = new FileReader();
    reader.onload = function(loadEvent) {
        try {
            var parsed = JSON.parse(loadEvent.target.result);
            var imported = parsed.displayConfig ? parsed.displayConfig : parsed;
            if (!imported.groups || !imported.parameterDisplay) {
                showStatus('Invalid displayConfig: missing groups or parameterDisplay.', 'error');
                return;
            }
            currentConfig = imported;
            // Re-render UI if template params are loaded
            var templateUid = document.getElementById('templateSelect').value;
            if (templateUid) {
                var template = templates.find(function(tpl) { return tpl.uid === templateUid; });
                if (template) { renderConfigUI(template.parameters); }
            } else {
                renderGroupsAndParams();
            }
            showStatus('Display config imported from JSON file.', 'success');
        } catch(parseError) {
            showStatus('Failed to parse JSON: ' + parseError.message, 'error');
        }
        fileInput.value = '';
    };
    reader.readAsText(fileInput.files[0]);
}

function exportDisplayConfigJson() {
    if (!currentConfig) { showStatus('No config to export.', 'error'); return; }
    var blob = new Blob([JSON.stringify(currentConfig, null, 2)], { type: 'application/json' });
    var anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = (currentTemplateUid || 'display-config') + '.displayConfig.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(anchor.href);
    showStatus('Config exported.', 'success');
}

async function saveConfig() {
    if (!currentTemplateUid || !currentConfig) { showStatus('No config to save.', 'error'); return; }
    try {
        const response = await fetch('/api/display-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateUid: currentTemplateUid, config: currentConfig }),
        });
        const data = await response.json();
        if (data.success) {
            showStatus('Configuration saved.', 'success');
        } else {
            showStatus('Save failed: ' + (data.error || JSON.stringify(data.details)), 'error');
        }
    } catch(saveError) {
        showStatus('Save failed: ' + saveError.message, 'error');
    }
}

async function previewCard() {
    if (!currentTemplateUid) { showStatus('Select a template first.', 'error'); return; }
    try {
        showStatus('Rendering preview...', '');
        const response = await fetch('/api/card-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateUid: currentTemplateUid, config: currentConfig }),
        });
        if (response.ok) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            const container = document.getElementById('previewContainer');
            container.innerHTML = '<img src="' + imageUrl + '" alt="Card Preview">';
            document.getElementById('previewPanel').style.display = 'block';
            showStatus('Preview rendered.', 'success');
        } else {
            const data = await response.json();
            showStatus('Preview failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch(previewError) {
        showStatus('Preview failed: ' + previewError.message, 'error');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
`;
}
