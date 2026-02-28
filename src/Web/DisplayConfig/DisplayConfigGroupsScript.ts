export function BuildDisplayConfigGroupsScript(): string {
    return `
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
    renderStyleFields();
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

    var paramMap = {};
    (currentConfig.parameterDisplay || []).forEach(function(pd) { paramMap[pd.key] = pd; });

    var groupOptions = '<option value="">(none)</option>' +
        currentConfig.groups.map(function(g) { return '<option value="' + escapeHtml(g.key) + '">' + escapeHtml(g.label) + '</option>'; }).join('');

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

    Object.keys(groupedParams).forEach(function(gKey) {
        groupedParams[gKey].sort(function(a, b) { return (a.display.displayOrder || 999) - (b.display.displayOrder || 999); });
    });
    ungrouped.sort(function(a, b) { return (a.display.displayOrder || 999) - (b.display.displayOrder || 999); });

    currentConfig.groups.forEach(function(group, groupIndex) {
        var card = document.createElement('div');
        card.className = 'group-card';
        card.draggable = true;
        card.dataset.groupIndex = groupIndex;
        card.dataset.dragType = 'group';

        var header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML =
            '<span class="drag-handle" title="Drag to reorder group">\\u2630</span>' +
            '<input type="text" value="' + escapeHtml(group.key) + '" placeholder="key" onchange="updateGroup(' + groupIndex + ', \\'key\\', this.value); renderGroupsAndParams();" style="width:100px;" onclick="event.stopPropagation();">' +
            '<input type="text" value="' + escapeHtml(group.label) + '" placeholder="Label" onchange="updateGroup(' + groupIndex + ', \\'label\\', this.value); renderGroupsAndParams();" onclick="event.stopPropagation();">' +
            '<input type="text" value="' + escapeHtml(group.iconUrl || '') + '" placeholder="Icon URL" onchange="updateGroup(' + groupIndex + ', \\'iconUrl\\', this.value);" style="width:120px;" onclick="event.stopPropagation();">' +
            '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); removeGroup(' + groupIndex + ');">x</button>';
        card.appendChild(header);

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
        '<span class="drag-handle" title="Drag to reorder or move to another group">\\u2807</span>' +
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
`;
}
