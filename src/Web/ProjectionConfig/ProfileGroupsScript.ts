export function BuildProfileGroupsScript(): string {
    return `
function buildGroupsSection(profileName, profile) {
    var section = document.createElement('div');
    section.style.marginBottom = '12px';

    var sectionHeader = document.createElement('div');
    sectionHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';

    var title = document.createElement('h3');
    title.textContent = 'Groups';
    sectionHeader.appendChild(title);

    var addGroupBtn = document.createElement('button');
    addGroupBtn.className = 'btn-add';
    addGroupBtn.textContent = '+ Group';
    addGroupBtn.addEventListener('click', function() {
        if (!profile.groups) { profile.groups = []; }
        profile.groups.push({ key: '', linked: true });
        renderProfiles();
    });
    sectionHeader.appendChild(addGroupBtn);
    section.appendChild(sectionHeader);

    if (!profile.groups) { profile.groups = []; }

    profile.groups.forEach(function(groupEntry, groupIndex) {
        var entryDiv = buildGroupEntry(profileName, profile, groupEntry, groupIndex);
        section.appendChild(entryDiv);
    });

    if (profile.groups.length === 0) {
        var emptyNote = document.createElement('div');
        emptyNote.style.cssText = 'font-size:11px;color:#3f3f46;padding:6px;';
        emptyNote.textContent = 'No groups defined - will inherit all base groups';
        section.appendChild(emptyNote);
    }

    return section;
}

function buildGroupEntry(profileName, profile, groupEntry, groupIndex) {
    var entryDiv = document.createElement('div');
    entryDiv.className = 'group-entry';

    var headerRow = document.createElement('div');
    headerRow.className = 'group-entry-header';

    var linkedCheckbox = document.createElement('input');
    linkedCheckbox.type = 'checkbox';
    linkedCheckbox.checked = groupEntry.linked;
    linkedCheckbox.title = 'Link to base group';
    linkedCheckbox.style.width = 'auto';
    linkedCheckbox.addEventListener('change', function() {
        groupEntry.linked = this.checked;
        if (this.checked) {
            delete groupEntry.label;
            delete groupEntry.parameterDisplay;
        }
        renderProfiles();
    });
    headerRow.appendChild(linkedCheckbox);

    if (groupEntry.linked) {
        var baseGroups = getBaseGroups();
        var keySelect = document.createElement('select');
        keySelect.style.cssText = 'flex:1;font-size:12px;padding:4px 8px;';

        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- select base group --';
        keySelect.appendChild(emptyOpt);

        baseGroups.forEach(function(baseGroup) {
            var opt = document.createElement('option');
            opt.value = baseGroup.key;
            opt.textContent = (baseGroup.label || baseGroup.key);
            if (baseGroup.key === groupEntry.key) { opt.selected = true; }
            keySelect.appendChild(opt);
        });

        keySelect.addEventListener('change', function() {
            groupEntry.key = this.value;
        });
        headerRow.appendChild(keySelect);

        var badge = document.createElement('span');
        badge.className = 'badge-linked';
        badge.textContent = 'LINKED';
        headerRow.appendChild(badge);
    } else {
        var keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.placeholder = 'group_key';
        keyInput.value = groupEntry.key || '';
        keyInput.style.cssText = 'width:100px;font-size:12px;padding:4px 8px;';
        keyInput.addEventListener('input', function() {
            groupEntry.key = this.value.trim();
        });
        headerRow.appendChild(keyInput);

        var labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.placeholder = 'Label';
        labelInput.value = groupEntry.label || '';
        labelInput.style.cssText = 'flex:1;font-size:12px;padding:4px 8px;';
        labelInput.addEventListener('input', function() {
            groupEntry.label = this.value.trim();
        });
        headerRow.appendChild(labelInput);

        var badge = document.createElement('span');
        badge.className = 'badge-custom';
        badge.textContent = 'CUSTOM';
        headerRow.appendChild(badge);
    }

    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', function() {
        profile.groups.splice(groupIndex, 1);
        renderProfiles();
    });
    headerRow.appendChild(removeBtn);
    entryDiv.appendChild(headerRow);

    if (!groupEntry.linked) {
        var paramsDiv = buildCustomGroupParams(groupEntry);
        entryDiv.appendChild(paramsDiv);
    }

    return entryDiv;
}

function buildCustomGroupParams(groupEntry) {
    if (!groupEntry.parameterDisplay) { groupEntry.parameterDisplay = []; }

    var wrapper = document.createElement('div');
    wrapper.className = 'custom-params';

    var paramHeader = document.createElement('div');
    paramHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';

    var paramLabel = document.createElement('span');
    paramLabel.style.cssText = 'font-size:11px;color:#a1a1aa;';
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
        renderProfiles();
    });
    paramHeader.appendChild(addParamBtn);
    wrapper.appendChild(paramHeader);

    var allParams = _currentTemplate ? (_currentTemplate.parameters || []) : [];

    groupEntry.parameterDisplay.forEach(function(paramConfig, paramIndex) {
        var paramRow = document.createElement('div');
        paramRow.style.cssText = 'display:flex;gap:4px;align-items:center;margin-bottom:3px;';

        var keySelect = document.createElement('select');
        keySelect.style.cssText = 'flex:1;font-size:11px;padding:3px 6px;';

        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- param --';
        keySelect.appendChild(emptyOpt);

        allParams.forEach(function(paramDef) {
            var opt = document.createElement('option');
            opt.value = paramDef.key;
            opt.textContent = (paramDef.label || paramDef.key);
            if (paramDef.key === paramConfig.key) { opt.selected = true; }
            keySelect.appendChild(opt);
        });

        keySelect.addEventListener('change', function() {
            paramConfig.key = this.value;
            paramConfig.group = groupEntry.key;
        });
        paramRow.appendChild(keySelect);

        var graphSelect = document.createElement('select');
        graphSelect.style.cssText = 'font-size:11px;padding:3px 6px;width:auto;';
        ['sparkline', 'bar', 'none'].forEach(function(graphType) {
            var opt = document.createElement('option');
            opt.value = graphType;
            opt.textContent = graphType;
            if (graphType === paramConfig.graphType) { opt.selected = true; }
            graphSelect.appendChild(opt);
        });
        graphSelect.addEventListener('change', function() {
            paramConfig.graphType = this.value;
        });
        paramRow.appendChild(graphSelect);

        var hiddenCb = document.createElement('input');
        hiddenCb.type = 'checkbox';
        hiddenCb.checked = paramConfig.hidden;
        hiddenCb.title = 'Hidden';
        hiddenCb.style.width = 'auto';
        hiddenCb.addEventListener('change', function() {
            paramConfig.hidden = this.checked;
        });
        paramRow.appendChild(hiddenCb);

        var removeParamBtn = document.createElement('button');
        removeParamBtn.className = 'btn-remove';
        removeParamBtn.style.fontSize = '10px';
        removeParamBtn.textContent = 'X';
        removeParamBtn.addEventListener('click', function() {
            groupEntry.parameterDisplay.splice(paramIndex, 1);
            renderProfiles();
        });
        paramRow.appendChild(removeParamBtn);
        wrapper.appendChild(paramRow);
    });

    return wrapper;
}
`;
}
