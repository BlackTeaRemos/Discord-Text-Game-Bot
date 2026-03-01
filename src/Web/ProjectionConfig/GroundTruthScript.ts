export function BuildGroundTruthScript(): string {
    return `
function renderGroundTruth() {
    var container = document.getElementById('groundTruthContainer');
    if (!container || !_currentTemplate) { return; }
    container.innerHTML = '';

    var parameters = _currentTemplate.parameters || [];
    var displayConfig = _currentTemplate.displayConfig || {};
    var groups = displayConfig.groups || [];
    var paramDisplay = displayConfig.parameterDisplay || [];

    var paramDisplayMap = {};
    paramDisplay.forEach(function(pd) { paramDisplayMap[pd.key] = pd; });

    var assignedKeys = new Set();
    paramDisplay.forEach(function(pd) {
        if (pd.group) { assignedKeys.add(pd.key); }
    });

    if (groups.length > 0) {
        groups.forEach(function(group) {
            var groupDiv = document.createElement('div');
            groupDiv.className = 'gt-group';

            var header = document.createElement('div');
            header.className = 'gt-group-header';
            header.textContent = (group.label || group.key) + ' [' + group.key + ']';
            groupDiv.appendChild(header);

            var groupParams = paramDisplay.filter(function(pd) {
                return pd.group === group.key;
            });

            groupParams.forEach(function(pd) {
                var paramDef = parameters.find(function(parameter) {
                    return parameter.key === pd.key;
                });
                if (paramDef) {
                    groupDiv.appendChild(buildGroundTruthParamRow(paramDef, pd));
                }
            });

            if (groupParams.length === 0) {
                var emptyNote = document.createElement('div');
                emptyNote.style.cssText = 'font-size:11px;color:#3f3f46;padding:4px 8px;';
                emptyNote.textContent = 'No parameters assigned';
                groupDiv.appendChild(emptyNote);
            }

            container.appendChild(groupDiv);
        });
    }

    var ungrouped = parameters.filter(function(parameter) {
        return !assignedKeys.has(parameter.key);
    });

    if (ungrouped.length > 0) {
        var unDiv = document.createElement('div');
        unDiv.className = 'gt-group';

        var unHeader = document.createElement('div');
        unHeader.className = 'gt-group-header';
        unHeader.textContent = 'Ungrouped';
        unDiv.appendChild(unHeader);

        ungrouped.forEach(function(paramDef) {
            unDiv.appendChild(buildGroundTruthParamRow(paramDef, null));
        });

        container.appendChild(unDiv);
    }

    if (parameters.length === 0) {
        container.innerHTML = '<div style="color:#3f3f46;font-size:12px;">No parameters defined</div>';
    }
}

function buildGroundTruthParamRow(paramDef, paramDisplay) {
    var row = document.createElement('div');
    row.className = 'gt-param';

    var keySpan = document.createElement('span');
    keySpan.className = 'gt-param-key';
    keySpan.textContent = (paramDef.label || paramDef.key);
    row.appendChild(keySpan);

    var typeSpan = document.createElement('span');
    typeSpan.className = 'gt-param-type';
    var typeText = paramDef.valueType;
    if (paramDisplay && paramDisplay.hidden) { typeText += ' [hidden]'; }
    if (paramDisplay && paramDisplay.graphType) { typeText += ' ' + paramDisplay.graphType; }
    typeSpan.textContent = typeText;
    row.appendChild(typeSpan);

    return row;
}

function getBaseGroups() {
    if (_currentTemplate && _currentTemplate.displayConfig && _currentTemplate.displayConfig.groups) {
        return _currentTemplate.displayConfig.groups;
    }
    return [];
}

function getBaseParamDisplay() {
    if (_currentTemplate && _currentTemplate.displayConfig && _currentTemplate.displayConfig.parameterDisplay) {
        return _currentTemplate.displayConfig.parameterDisplay;
    }
    return [];
}
`;
}
