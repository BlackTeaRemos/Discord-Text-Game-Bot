export function BuildDisplayConfigActionsScript(): string {
    return `
function __swapGroups(fromIndex, toIndex) {
    if (fromIndex === toIndex || !currentConfig) return;
    var groups = currentConfig.groups;
    var moved = groups.splice(fromIndex, 1)[0];
    groups.splice(toIndex, 0, moved);
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
    var dragEntry = currentConfig.parameterDisplay.find(function(pd) { return pd.key === draggedKey; });
    if (!dragEntry) {
        dragEntry = { key: draggedKey, group: groupKey, graphType: 'sparkline', hidden: false, displayOrder: 999 };
        currentConfig.parameterDisplay.push(dragEntry);
    }
    dragEntry.group = groupKey;

    var groupParams = currentConfig.parameterDisplay
        .filter(function(pd) { return (pd.group || '') === groupKey; })
        .sort(function(a, b) { return (a.displayOrder || 999) - (b.displayOrder || 999); });

    var filtered = groupParams.filter(function(pd) { return pd.key !== draggedKey; });
    var targetIndex = filtered.findIndex(function(pd) { return pd.key === targetKey; });
    if (targetIndex === -1) { filtered.push(dragEntry); }
    else { filtered.splice(targetIndex, 0, dragEntry); }

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
