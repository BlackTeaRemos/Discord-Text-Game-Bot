export function BuildProfileStyleScript(): string {
    return `
var _styleFields = [
    { key: 'cardBackground', label: 'Card BG', type: 'color' },
    { key: 'panelBackground', label: 'Panel BG', type: 'color' },
    { key: 'borderColor', label: 'Border', type: 'color' },
    { key: 'accentColor', label: 'Accent', type: 'color' },
    { key: 'accentFill', label: 'Accent Fill', type: 'color' },
    { key: 'textPrimary', label: 'Text Primary', type: 'color' },
    { key: 'textValue', label: 'Text Value', type: 'color' },
    { key: 'textLabel', label: 'Text Label', type: 'color' },
    { key: 'textSecondary', label: 'Text Secondary', type: 'color' },
    { key: 'textMuted', label: 'Text Muted', type: 'color' },
    { key: 'cardBorderRadius', label: 'Border Radius', type: 'number' }
];

function buildStyleSection(profileName, profile) {
    var section = document.createElement('div');
    section.style.marginBottom = '12px';

    var hasCustomStyle = !!profile.styleConfig;

    var sectionHeader = document.createElement('div');
    sectionHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';

    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;gap:8px;align-items:center;';

    var title = document.createElement('h3');
    title.textContent = 'Style';
    titleRow.appendChild(title);

    var toggleCb = document.createElement('input');
    toggleCb.type = 'checkbox';
    toggleCb.checked = hasCustomStyle;
    toggleCb.style.width = 'auto';
    toggleCb.title = 'Override base style';
    toggleCb.addEventListener('change', function() {
        if (this.checked) {
            profile.styleConfig = {};
        } else {
            delete profile.styleConfig;
        }
        renderProfiles();
    });
    titleRow.appendChild(toggleCb);

    var modeLabel = document.createElement('span');
    modeLabel.style.cssText = 'font-size:10px;color:' + (hasCustomStyle ? '#f97316' : '#22c55e') + ';';
    modeLabel.textContent = hasCustomStyle ? 'custom' : 'inherit';
    titleRow.appendChild(modeLabel);

    sectionHeader.appendChild(titleRow);
    section.appendChild(sectionHeader);

    if (!hasCustomStyle) { return section; }

    var grid = document.createElement('div');
    grid.className = 'style-grid';

    _styleFields.forEach(function(fieldDef) {
        var fieldWrap = document.createElement('div');
        fieldWrap.className = 'style-field';

        var fieldLabel = document.createElement('label');
        fieldLabel.textContent = fieldDef.label;
        fieldWrap.appendChild(fieldLabel);

        if (fieldDef.type === 'color') {
            var colorRow = document.createElement('div');
            colorRow.style.cssText = 'display:flex;gap:4px;align-items:center;';

            var colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = profile.styleConfig[fieldDef.key] || '#000000';
            colorInput.style.cssText = 'width:32px;height:24px;padding:0;border:1px solid #3f3f46;cursor:pointer;';
            colorInput.addEventListener('change', function() {
                profile.styleConfig[fieldDef.key] = this.value;
                textInput.value = this.value;
            });
            colorRow.appendChild(colorInput);

            var textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.placeholder = '#000000';
            textInput.value = profile.styleConfig[fieldDef.key] || '';
            textInput.style.cssText = 'flex:1;font-size:11px;padding:3px 6px;';
            textInput.addEventListener('change', function() {
                var val = this.value.trim();
                if (val) {
                    profile.styleConfig[fieldDef.key] = val;
                    if (val.match(/^#[0-9a-fA-F]{6}$/)) {
                        colorInput.value = val;
                    }
                } else {
                    delete profile.styleConfig[fieldDef.key];
                }
            });
            colorRow.appendChild(textInput);

            var clearBtn = document.createElement('button');
            clearBtn.className = 'btn-remove';
            clearBtn.style.fontSize = '10px';
            clearBtn.textContent = 'X';
            clearBtn.addEventListener('click', function() {
                delete profile.styleConfig[fieldDef.key];
                renderProfiles();
            });
            colorRow.appendChild(clearBtn);

            fieldWrap.appendChild(colorRow);
        } else {
            var numInput = document.createElement('input');
            numInput.type = 'number';
            numInput.min = '0';
            numInput.step = '1';
            numInput.placeholder = 'inherit';
            numInput.value = profile.styleConfig[fieldDef.key] !== undefined
                ? String(profile.styleConfig[fieldDef.key])
                : '';
            numInput.style.cssText = 'width:80px;font-size:11px;padding:3px 6px;';
            numInput.addEventListener('change', function() {
                var val = parseInt(this.value, 10);
                if (!isNaN(val)) {
                    profile.styleConfig[fieldDef.key] = val;
                } else {
                    delete profile.styleConfig[fieldDef.key];
                }
            });
            fieldWrap.appendChild(numInput);
        }

        grid.appendChild(fieldWrap);
    });

    section.appendChild(grid);
    return section;
}
`;
}
