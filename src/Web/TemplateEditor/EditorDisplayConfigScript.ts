export function BuildDisplayConfigScript(): string {
    return `
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

function dcBuildChartParamRow(paramDef, chartIndex) {
    var row = document.createElement('div');
    row.className = 'dc-param-row';
    var escapedKey = dcEscapeAttr(paramDef.key);
    row.innerHTML =
        '<span class="dc-param-name" style="flex:1;">' + dcEscapeHtml(paramDef.label || paramDef.key) + '</span>' +
        '<button class="btn-remove" style="position:static;font-size:10px;" onclick="dcRemoveParamFromChart(' + chartIndex + ',\\'' + escapedKey + '\\')">x</button>';
    return row;
}

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

function dcRemoveParamFromGroup(paramKey) {
    var entry = _dcConfig.parameterDisplay.find(function(pd) { return pd.key === paramKey; });
    if (entry) { entry.group = ''; }
    dcRenderGroupsAndParams();
    updatePreview();
}

function dcAddParamToChart(chartIndex, paramKey) {
    var chart = _dcConfig.charts[chartIndex];
    if (!chart) return;
    if (chart.parameterKeys.indexOf(paramKey) >= 0) return;
    chart.parameterKeys.push(paramKey);
    dcRenderCharts();
    updatePreview();
}

function dcRemoveParamFromChart(chartIndex, paramKey) {
    var chart = _dcConfig.charts[chartIndex];
    if (!chart) return;
    var idx = chart.parameterKeys.indexOf(paramKey);
    if (idx >= 0) { chart.parameterKeys.splice(idx, 1); }
    dcRenderCharts();
    updatePreview();
}

var _dcLayoutDragIndex = null;

function dcRenderLayoutOrder() {
    var container = document.getElementById('dcLayoutOrderContainer');
    if (!container) return;
    container.innerHTML = '';

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

                var draggedItem = items[_dcLayoutDragIndex];
                var targetPos = insertBefore ? capturedVisualIndex : capturedVisualIndex + 1;
                if (_dcLayoutDragIndex < targetPos) { targetPos--; }
                items.splice(_dcLayoutDragIndex, 1);
                items.splice(targetPos, 0, draggedItem);

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
`;
}
