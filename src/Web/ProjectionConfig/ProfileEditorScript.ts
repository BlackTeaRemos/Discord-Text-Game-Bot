export function BuildProfileEditorScript(): string {
    return `
var _openProfiles = {};

function renderProfiles() {
    var container = document.getElementById('profilesContainer');
    if (!container) { return; }
    container.innerHTML = '';

    Object.keys(_projConfigs).forEach(function(profileName) {
        var card = buildProfileCard(profileName, _projConfigs[profileName]);
        container.appendChild(card);
    });

    var addRow = document.createElement('div');
    addRow.style.cssText = 'display:flex;gap:8px;margin-top:8px;';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'HOSTILE';
    nameInput.style.cssText = 'flex:1;font-size:13px;';
    nameInput.id = 'newProfileName';
    addRow.appendChild(nameInput);

    var addBtn = document.createElement('button');
    addBtn.className = 'btn-add';
    addBtn.textContent = '+ Profile';
    addBtn.addEventListener('click', function() {
        var name = nameInput.value.trim().toUpperCase();
        if (!name || _projConfigs[name]) { return; }
        _projConfigs[name] = { groups: [] };
        _openProfiles[name] = true;
        renderProfiles();
    });
    addRow.appendChild(addBtn);
    container.appendChild(addRow);
}

function buildProfileCard(profileName, profile) {
    var card = document.createElement('div');
    card.className = 'profile-card';

    var header = document.createElement('div');
    header.className = 'profile-header';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'profile-name';
    nameSpan.textContent = profileName;
    header.appendChild(nameSpan);

    var headerRight = document.createElement('div');
    headerRight.style.cssText = 'display:flex;gap:6px;align-items:center;';

    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', function(ev) {
        ev.stopPropagation();
        delete _projConfigs[profileName];
        delete _openProfiles[profileName];
        renderProfiles();
    });
    headerRight.appendChild(removeBtn);

    var expandSpan = document.createElement('span');
    expandSpan.style.cssText = 'color:#52525b;font-size:18px;';
    expandSpan.textContent = _openProfiles[profileName] ? '−' : '+';
    headerRight.appendChild(expandSpan);
    header.appendChild(headerRight);

    header.addEventListener('click', function() {
        _openProfiles[profileName] = !_openProfiles[profileName];
        renderProfiles();
    });

    card.appendChild(header);

    if (!_openProfiles[profileName]) {
        return card;
    }

    var body = document.createElement('div');
    body.className = 'profile-body';

    body.appendChild(buildGroupsSection(profileName, profile));
    body.appendChild(buildChartsSection(profileName, profile));
    body.appendChild(buildStyleSection(profileName, profile));

    card.appendChild(body);
    return card;
}

function collectConfigs() {
    var result = {};
    Object.keys(_projConfigs).forEach(function(profileName) {
        var profile = _projConfigs[profileName];
        var outProfile = {};

        outProfile.groups = (profile.groups || []).map(function(groupEntry) {
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

        if (Array.isArray(profile.charts) && profile.charts.length > 0) {
            outProfile.charts = profile.charts;
        }

        if (profile.styleConfig && Object.keys(profile.styleConfig).length > 0) {
            outProfile.styleConfig = profile.styleConfig;
        }

        result[profileName] = outProfile;
    });
    return result;
}
`;
}
