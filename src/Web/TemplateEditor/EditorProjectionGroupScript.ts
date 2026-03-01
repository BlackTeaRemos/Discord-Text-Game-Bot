export function BuildProjectionGroupScript(): string {
    return `
function projBuildGroupRow(profileName, groupEntry, groupIndex) {
    var row = document.createElement('div');
    row.style.border = '1px solid #27272a';
    row.style.borderRadius = '4px';
    row.style.padding = '4px';
    row.style.marginBottom = '4px';
    row.style.fontSize = '11px';

    var topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.gap = '4px';
    topRow.style.alignItems = 'center';

    var linkedCheckbox = document.createElement('input');
    linkedCheckbox.type = 'checkbox';
    linkedCheckbox.checked = groupEntry.linked;
    linkedCheckbox.title = 'Linked to base';
    linkedCheckbox.addEventListener('change', function() {
        groupEntry.linked = this.checked;
        projRenderAll();
        updatePreview();
    });
    topRow.appendChild(linkedCheckbox);

    if (groupEntry.linked) {
        var baseGroups = projGetBaseGroups();
        var keySelect = document.createElement('select');
        keySelect.style.flex = '1';
        keySelect.style.fontSize = '11px';

        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- select base group --';
        keySelect.appendChild(emptyOpt);

        baseGroups.forEach(function(baseGroup) {
            var opt = document.createElement('option');
            opt.value = baseGroup.key;
            opt.textContent = baseGroup.label || baseGroup.key;
            if (baseGroup.key === groupEntry.key) { opt.selected = true; }
            keySelect.appendChild(opt);
        });

        keySelect.addEventListener('change', function() {
            groupEntry.key = this.value;
            updatePreview();
        });
        topRow.appendChild(keySelect);

        var linkedLabel = document.createElement('span');
        linkedLabel.style.color = '#22c55e';
        linkedLabel.style.fontSize = '10px';
        linkedLabel.textContent = 'linked';
        topRow.appendChild(linkedLabel);
    } else {
        var keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'group_key';
        keyInput.value = groupEntry.key || '';
        keyInput.style.width = '80px';
        keyInput.style.fontSize = '11px';
        keyInput.addEventListener('input', function() {
            groupEntry.key = this.value.trim();
            updatePreview();
        });
        topRow.appendChild(keyInput);

        var labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.placeholder = 'Label';
        labelInput.value = groupEntry.label || '';
        labelInput.style.flex = '1';
        labelInput.style.fontSize = '11px';
        labelInput.addEventListener('input', function() {
            groupEntry.label = this.value.trim();
            updatePreview();
        });
        topRow.appendChild(labelInput);

        var customLabel = document.createElement('span');
        customLabel.style.color = '#f97316';
        customLabel.style.fontSize = '10px';
        customLabel.textContent = 'custom';
        topRow.appendChild(customLabel);
    }

    var removeGroupBtn = document.createElement('button');
    removeGroupBtn.className = 'btn-remove';
    removeGroupBtn.style.fontSize = '10px';
    removeGroupBtn.textContent = 'X';
    removeGroupBtn.addEventListener('click', function() {
        _projDisplayConfigs[profileName].groups.splice(groupIndex, 1);
        projRenderAll();
        updatePreview();
    });
    topRow.appendChild(removeGroupBtn);
    row.appendChild(topRow);

    if (!groupEntry.linked) {
        var paramSection = projBuildCustomParamSection(groupEntry);
        row.appendChild(paramSection);
    }

    return row;
}

function projBuildCustomParamSection(groupEntry) {
    if (!groupEntry.parameterDisplay) {
        groupEntry.parameterDisplay = [];
    }

    var wrapper = document.createElement('div');
    wrapper.style.marginTop = '4px';
    wrapper.style.paddingLeft = '12px';
    wrapper.style.borderLeft = '2px solid #f97316';

    var paramHeader = document.createElement('div');
    paramHeader.style.display = 'flex';
    paramHeader.style.justifyContent = 'space-between';
    paramHeader.style.alignItems = 'center';

    var paramLabel = document.createElement('span');
    paramLabel.style.fontSize = '10px';
    paramLabel.style.color = '#a1a1aa';
    paramLabel.textContent = 'Parameters';
    paramHeader.appendChild(paramLabel);

    var addParamBtn = document.createElement('button');
    addParamBtn.className = 'btn-add';
    addParamBtn.style.fontSize = '10px';
    addParamBtn.textContent = '+';
    addParamBtn.addEventListener('click', function() {
        groupEntry.parameterDisplay.push({
            key: '',
            group: groupEntry.key,
            graphType: 'sparkline',
            hidden: false,
            displayOrder: groupEntry.parameterDisplay.length
        });
        projRenderAll();
        updatePreview();
    });
    paramHeader.appendChild(addParamBtn);
    wrapper.appendChild(paramHeader);

    groupEntry.parameterDisplay.forEach(function(paramConfig, paramIndex) {
        var paramRow = document.createElement('div');
        paramRow.style.display = 'flex';
        paramRow.style.gap = '3px';
        paramRow.style.alignItems = 'center';
        paramRow.style.marginTop = '2px';

        var keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'paramKey';
        keyInput.value = paramConfig.key || '';
        keyInput.style.width = '80px';
        keyInput.style.fontSize = '10px';
        keyInput.addEventListener('input', function() {
            paramConfig.key = this.value.trim();
            paramConfig.group = groupEntry.key;
            updatePreview();
        });
        paramRow.appendChild(keyInput);

        var graphSelect = document.createElement('select');
        graphSelect.style.fontSize = '10px';
        ['sparkline', 'bar', 'none'].forEach(function(graphType) {
            var opt = document.createElement('option');
            opt.value = graphType;
            opt.textContent = graphType;
            if (graphType === paramConfig.graphType) { opt.selected = true; }
            graphSelect.appendChild(opt);
        });
        graphSelect.addEventListener('change', function() {
            paramConfig.graphType = this.value;
            updatePreview();
        });
        paramRow.appendChild(graphSelect);

        var hiddenCheckbox = document.createElement('input');
        hiddenCheckbox.type = 'checkbox';
        hiddenCheckbox.checked = paramConfig.hidden;
        hiddenCheckbox.title = 'Hidden';
        hiddenCheckbox.addEventListener('change', function() {
            paramConfig.hidden = this.checked;
            updatePreview();
        });
        paramRow.appendChild(hiddenCheckbox);

        var removeParamBtn = document.createElement('button');
        removeParamBtn.className = 'btn-remove';
        removeParamBtn.style.fontSize = '9px';
        removeParamBtn.textContent = 'X';
        removeParamBtn.addEventListener('click', function() {
            groupEntry.parameterDisplay.splice(paramIndex, 1);
            projRenderAll();
            updatePreview();
        });
        paramRow.appendChild(removeParamBtn);
        wrapper.appendChild(paramRow);
    });

    return wrapper;
}
`;
}
