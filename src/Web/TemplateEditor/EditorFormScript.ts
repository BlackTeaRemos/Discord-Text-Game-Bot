export function BuildFormScript(): string {
    return `
function addParameter() {
    parameterCounter++;
    const parameterId = 'param_' + parameterCounter;
    const container = document.getElementById('parametersContainer');
    const row = document.createElement('div');
    row.className = 'param-row';
    row.id = parameterId;
    row.innerHTML = \\\`
        <div class="param-key-header" draggable="true" title="Drag to a group or chart in the sidebar">
            <span class="param-drag-icon">&#x2630;</span>
            <input type="text" data-field="key" placeholder="productionRate" oninput="updatePreview(); dcRefreshIfEnabled();" onclick="event.stopPropagation();" draggable="false">
            <button class="btn-remove" onclick="removeElement('\\\${parameterId}')" draggable="false">X</button>
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
    \\\`;

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
    row.innerHTML = \\\`
        <button class="btn-remove" onclick="removeElement('\\\${actionId}')">X</button>
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
    \\\`;
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

let cachedAvailableTemplates = [];
`;
}
