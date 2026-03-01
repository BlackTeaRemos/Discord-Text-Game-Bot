export function BuildProjectionStyleScript(): string {
    return `
var _projDisplayConfigs = {};
var _projStyleFields = [
    { key: 'cardBackground', label: 'Card BG', type: 'color' },
    { key: 'panelBackground', label: 'Panel BG', type: 'color' },
    { key: 'borderColor', label: 'Border', type: 'color' },
    { key: 'accentColor', label: 'Accent', type: 'color' },
    { key: 'accentFill', label: 'Accent Fill', type: 'color' },
    { key: 'textPrimary', label: 'Text Primary', type: 'color' },
    { key: 'textValue', label: 'Text Value', type: 'color' },
    { key: 'textLabel', label: 'Text Label', type: 'color' },
    { key: 'textSecondary', label: 'Text Sec', type: 'color' },
    { key: 'textMuted', label: 'Text Muted', type: 'color' },
    { key: 'cardBorderRadius', label: 'Radius', type: 'number' }
];

function projGetBaseGroups() {
    if (typeof _dcConfig !== 'undefined' && _dcConfig && _dcConfig.groups) {
        return _dcConfig.groups;
    }
    return [];
}

function projGetBaseParamDisplay() {
    if (typeof _dcConfig !== 'undefined' && _dcConfig && _dcConfig.parameterDisplay) {
        return _dcConfig.parameterDisplay;
    }
    return [];
}

function projSaveOpenState() {
    var openState = {};
    var detailsElements = document.querySelectorAll('[data-proj-id]');
    detailsElements.forEach(function(element) {
        if (element.tagName === 'DETAILS') {
            openState[element.getAttribute('data-proj-id')] = element.open;
        }
    });
    return openState;
}

function projRestoreOpenState(openState) {
    var detailsElements = document.querySelectorAll('[data-proj-id]');
    detailsElements.forEach(function(element) {
        if (element.tagName === 'DETAILS') {
            var stateKey = element.getAttribute('data-proj-id');
            if (openState[stateKey] !== undefined) {
                element.open = openState[stateKey];
            }
        }
    });
}

function projRenderAll() {
    var container = document.getElementById('projStyleContainer');
    if (!container) { return; }

    var openState = projSaveOpenState();
    container.innerHTML = '';

    var profileNames = Object.keys(_projDisplayConfigs);
    profileNames.forEach(function(profileName) {
        var profileSection = projBuildProfileSection(profileName);
        container.appendChild(profileSection);
    });

    var addRow = document.createElement('div');
    addRow.style.marginTop = '8px';
    addRow.style.display = 'flex';
    addRow.style.gap = '4px';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'HOSTILE';
    nameInput.style.flex = '1';
    nameInput.style.fontSize = '11px';
    nameInput.id = 'projNewProfileName';
    addRow.appendChild(nameInput);

    var addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.style.fontSize = '11px';
    addBtn.textContent = '+ Profile';
    addBtn.addEventListener('click', function() {
        var name = nameInput.value.trim().toUpperCase();
        if (!name) { return; }
        if (_projDisplayConfigs[name]) { return; }
        _projDisplayConfigs[name] = { groups: [] };
        projRenderAll();
        updatePreview();
    });
    addRow.appendChild(addBtn);
    container.appendChild(addRow);

    projRestoreOpenState(openState);
}

function projBuildProfileSection(profileName) {
    var profile = _projDisplayConfigs[profileName];
    var section = document.createElement('details');
    section.className = 'proj-style-section';
    section.style.marginBottom = '6px';
    section.setAttribute('data-proj-id', 'profile_' + profileName);

    var summary = document.createElement('summary');
    summary.className = 'proj-style-summary';
    summary.style.display = 'flex';
    summary.style.justifyContent = 'space-between';
    summary.style.alignItems = 'center';
    summary.innerHTML = '<span>' + profileName + '</span>';

    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.style.fontSize = '10px';
    removeBtn.style.marginLeft = '8px';
    removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        delete _projDisplayConfigs[profileName];
        projRenderAll();
        updatePreview();
    });
    summary.appendChild(removeBtn);
    section.appendChild(summary);

    var groupsHeader = document.createElement('div');
    groupsHeader.style.display = 'flex';
    groupsHeader.style.justifyContent = 'space-between';
    groupsHeader.style.alignItems = 'center';
    groupsHeader.style.marginBottom = '4px';
    groupsHeader.innerHTML = '<strong style="font-size:11px;">Groups</strong>';

    var addGroupBtn = document.createElement('button');
    addGroupBtn.className = 'btn-add';
    addGroupBtn.style.fontSize = '10px';
    addGroupBtn.textContent = '+ Group';
    addGroupBtn.addEventListener('click', function() {
        profile.groups.push({ key: '', linked: true });
        projRenderAll();
        updatePreview();
    });
    groupsHeader.appendChild(addGroupBtn);
    section.appendChild(groupsHeader);

    profile.groups.forEach(function(groupEntry, groupIndex) {
        var groupRow = projBuildGroupRow(profileName, groupEntry, groupIndex);
        section.appendChild(groupRow);
    });

    var chartsDetails = document.createElement('details');
    chartsDetails.style.marginTop = '6px';
    chartsDetails.setAttribute('data-proj-id', 'charts_' + profileName);
    var chartsSummary = document.createElement('summary');
    chartsSummary.style.fontSize = '11px';
    chartsSummary.style.cursor = 'pointer';
    chartsSummary.textContent = 'Charts' + (profile.charts ? ' (custom)' : ' (inherit)');
    chartsDetails.appendChild(chartsSummary);

    var chartsContent = projBuildChartsSection(profileName, profile);
    chartsDetails.appendChild(chartsContent);
    section.appendChild(chartsDetails);

    var styleDetails = document.createElement('details');
    styleDetails.style.marginTop = '6px';
    styleDetails.setAttribute('data-proj-id', 'style_' + profileName);
    var styleSummary = document.createElement('summary');
    styleSummary.style.fontSize = '11px';
    styleSummary.style.cursor = 'pointer';
    styleSummary.textContent = 'Style Override';
    styleDetails.appendChild(styleSummary);

    var styleGrid = projBuildStyleGrid(profileName, profile.styleConfig || {});
    styleDetails.appendChild(styleGrid);
    section.appendChild(styleDetails);

    return section;
}

function projBuildStyleGrid(profileName, styleData) {
    var grid = document.createElement('div');
    grid.className = 'dc-style-grid';

    _projStyleFields.forEach(function(field) {
        var fieldDiv = document.createElement('div');
        fieldDiv.className = 'dc-style-field';

        var label = document.createElement('label');
        label.textContent = field.label;
        fieldDiv.appendChild(label);

        var input;
        if (field.type === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = '24';
            input.style.width = '50px';
            input.value = styleData[field.key] !== undefined ? String(styleData[field.key]) : '';
        } else {
            input = document.createElement('input');
            input.type = 'color';
            input.value = styleData[field.key] || '#000000';
            if (!styleData[field.key]) {
                input.style.opacity = '0.3';
            }
        }

        input.addEventListener('change', function() {
            if (!_projDisplayConfigs[profileName].styleConfig) {
                _projDisplayConfigs[profileName].styleConfig = {};
            }
            var styleObj = _projDisplayConfigs[profileName].styleConfig;

            if (field.type === 'number') {
                var numericValue = parseInt(this.value, 10);
                if (isNaN(numericValue)) {
                    delete styleObj[field.key];
                } else {
                    styleObj[field.key] = numericValue;
                }
            } else {
                styleObj[field.key] = this.value;
                this.style.opacity = '1';
            }

            if (Object.keys(styleObj).length === 0) {
                delete _projDisplayConfigs[profileName].styleConfig;
            }
            updatePreview();
        });

        fieldDiv.appendChild(input);
        grid.appendChild(fieldDiv);
    });

    return grid;
}

function projStyleCollect() {
    var result = {};
    var hasContent = false;

    Object.keys(_projDisplayConfigs).forEach(function(profileName) {
        var profile = _projDisplayConfigs[profileName];
        var outProfile = {};

        if (profile.groups && profile.groups.length > 0) {
            outProfile.groups = profile.groups.map(function(groupEntry) {
                var outGroup = { key: groupEntry.key, linked: groupEntry.linked };
                if (!groupEntry.linked) {
                    if (groupEntry.label) { outGroup.label = groupEntry.label; }
                    if (groupEntry.iconUrl) { outGroup.iconUrl = groupEntry.iconUrl; }
                    if (groupEntry.sortOrder !== undefined) { outGroup.sortOrder = groupEntry.sortOrder; }
                    if (groupEntry.parameterDisplay && groupEntry.parameterDisplay.length > 0) {
                        outGroup.parameterDisplay = groupEntry.parameterDisplay;
                    }
                }
                return outGroup;
            });
        } else {
            outProfile.groups = [];
        }

        if (profile.charts && profile.charts.length > 0) {
            outProfile.charts = profile.charts;
        }

        if (profile.styleConfig && Object.keys(profile.styleConfig).length > 0) {
            outProfile.styleConfig = profile.styleConfig;
        }

        result[profileName] = outProfile;
        hasContent = true;
    });

    return hasContent ? result : null;
}

function projStyleLoad(configMap) {
    _projDisplayConfigs = {};
    if (configMap && typeof configMap === 'object') {
        Object.keys(configMap).forEach(function(profileName) {
            var profile = configMap[profileName];
            _projDisplayConfigs[profileName] = {
                groups: (profile.groups || []).map(function(groupEntry) {
                    var entry = {
                        key: groupEntry.key || '',
                        linked: groupEntry.linked !== false
                    };
                    if (!entry.linked) {
                        if (groupEntry.label) { entry.label = groupEntry.label; }
                        if (groupEntry.iconUrl) { entry.iconUrl = groupEntry.iconUrl; }
                        if (groupEntry.sortOrder !== undefined) { entry.sortOrder = groupEntry.sortOrder; }
                        if (groupEntry.parameterDisplay) {
                            entry.parameterDisplay = groupEntry.parameterDisplay;
                        }
                    }
                    return entry;
                })
            };
            if (profile.charts) {
                _projDisplayConfigs[profileName].charts = profile.charts;
            }
            if (profile.styleConfig) {
                _projDisplayConfigs[profileName].styleConfig =
                    Object.assign({}, profile.styleConfig);
            }
        });
    }
    projRenderAll();
}
`;
}
