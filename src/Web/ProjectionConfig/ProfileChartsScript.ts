export function BuildProfileChartsScript(): string {
    return `
function buildChartsSection(profileName, profile) {
    var section = document.createElement('div');
    section.style.marginBottom = '12px';

    var hasCustomCharts = Array.isArray(profile.charts);

    var sectionHeader = document.createElement('div');
    sectionHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';

    var titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;gap:8px;align-items:center;';

    var title = document.createElement('h3');
    title.textContent = 'Charts';
    titleRow.appendChild(title);

    var toggleCb = document.createElement('input');
    toggleCb.type = 'checkbox';
    toggleCb.checked = hasCustomCharts;
    toggleCb.style.width = 'auto';
    toggleCb.title = 'Override base charts';
    toggleCb.addEventListener('change', function() {
        if (this.checked) {
            profile.charts = [];
        } else {
            delete profile.charts;
        }
        renderProfiles();
    });
    titleRow.appendChild(toggleCb);

    var modeLabel = document.createElement('span');
    modeLabel.style.cssText = 'font-size:10px;color:' + (hasCustomCharts ? '#f97316' : '#22c55e') + ';';
    modeLabel.textContent = hasCustomCharts ? 'custom' : 'inherit';
    titleRow.appendChild(modeLabel);

    sectionHeader.appendChild(titleRow);

    if (hasCustomCharts) {
        var addChartBtn = document.createElement('button');
        addChartBtn.className = 'btn-add';
        addChartBtn.textContent = '+ Chart';
        addChartBtn.addEventListener('click', function() {
            var nextOrder = profile.charts.length;
            profile.charts.push({
                key: 'chart_' + nextOrder,
                label: 'Chart ' + nextOrder,
                chartType: 'combined',
                parameterKeys: [],
                chartHeight: 0,
                sortOrder: nextOrder
            });
            renderProfiles();
        });
        sectionHeader.appendChild(addChartBtn);
    }

    section.appendChild(sectionHeader);

    if (!hasCustomCharts) { return section; }

    profile.charts.forEach(function(chart, chartIndex) {
        var chartDiv = buildChartEntry(profile, chart, chartIndex);
        section.appendChild(chartDiv);
    });

    return section;
}

function buildChartEntry(profile, chart, chartIndex) {
    var entryDiv = document.createElement('div');
    entryDiv.className = 'chart-entry';

    var headerRow = document.createElement('div');
    headerRow.className = 'chart-entry-header';

    var keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'chart_key';
    keyInput.value = chart.key || '';
    keyInput.style.cssText = 'width:100px;font-size:12px;padding:4px 8px;';
    keyInput.addEventListener('input', function() {
        chart.key = this.value.trim();
    });
    headerRow.appendChild(keyInput);

    var labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Label';
    labelInput.value = chart.label || '';
    labelInput.style.cssText = 'flex:1;font-size:12px;padding:4px 8px;';
    labelInput.addEventListener('input', function() {
        chart.label = this.value.trim();
    });
    headerRow.appendChild(labelInput);

    var typeSelect = document.createElement('select');
    typeSelect.style.cssText = 'font-size:11px;padding:3px 6px;width:auto;';
    ['combined', 'cumulative', 'relative'].forEach(function(chartType) {
        var opt = document.createElement('option');
        opt.value = chartType;
        opt.textContent = chartType;
        if (chartType === (chart.chartType || 'combined')) { opt.selected = true; }
        typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', function() {
        chart.chartType = this.value;
    });
    headerRow.appendChild(typeSelect);

    var removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'X';
    removeBtn.addEventListener('click', function() {
        profile.charts.splice(chartIndex, 1);
        renderProfiles();
    });
    headerRow.appendChild(removeBtn);
    entryDiv.appendChild(headerRow);

    var configRow = document.createElement('div');
    configRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:4px;font-size:11px;';

    var heightLabel = document.createElement('span');
    heightLabel.style.color = '#71717a';
    heightLabel.textContent = 'Height';
    configRow.appendChild(heightLabel);

    var heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.min = '0';
    heightInput.step = '10';
    heightInput.placeholder = 'auto';
    heightInput.value = chart.chartHeight ? String(chart.chartHeight) : '';
    heightInput.style.cssText = 'width:60px;font-size:11px;padding:3px 6px;';
    heightInput.addEventListener('change', function() {
        chart.chartHeight = parseInt(this.value, 10) || 0;
    });
    configRow.appendChild(heightInput);

    var orderLabel = document.createElement('span');
    orderLabel.style.color = '#71717a';
    orderLabel.textContent = 'Order';
    configRow.appendChild(orderLabel);

    var orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.min = '0';
    orderInput.placeholder = '0';
    orderInput.value = chart.sortOrder !== undefined ? String(chart.sortOrder) : '';
    orderInput.style.cssText = 'width:50px;font-size:11px;padding:3px 6px;';
    orderInput.addEventListener('change', function() {
        chart.sortOrder = parseInt(this.value, 10) || 0;
    });
    configRow.appendChild(orderInput);
    entryDiv.appendChild(configRow);

    var keysDiv = buildChartKeysSection(chart);
    entryDiv.appendChild(keysDiv);

    return entryDiv;
}

function buildChartKeysSection(chart) {
    if (!chart.parameterKeys) { chart.parameterKeys = []; }

    var wrapper = document.createElement('div');
    wrapper.className = 'chart-keys';

    var keysHeader = document.createElement('div');
    keysHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;';

    var keysLabel = document.createElement('span');
    keysLabel.style.cssText = 'font-size:10px;color:#a1a1aa;';
    keysLabel.textContent = 'Parameter Keys';
    keysHeader.appendChild(keysLabel);

    var addKeyBtn = document.createElement('button');
    addKeyBtn.className = 'btn-add';
    addKeyBtn.style.fontSize = '10px';
    addKeyBtn.textContent = '+';
    addKeyBtn.addEventListener('click', function() {
        chart.parameterKeys.push('');
        renderProfiles();
    });
    keysHeader.appendChild(addKeyBtn);
    wrapper.appendChild(keysHeader);

    var allParams = _currentTemplate ? (_currentTemplate.parameters || []) : [];

    chart.parameterKeys.forEach(function(paramKey, keyIndex) {
        var keyRow = document.createElement('div');
        keyRow.style.cssText = 'display:flex;gap:4px;align-items:center;margin-bottom:2px;';

        var keySelect = document.createElement('select');
        keySelect.style.cssText = 'flex:1;font-size:11px;padding:3px 6px;';

        var emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- select --';
        keySelect.appendChild(emptyOpt);

        allParams.forEach(function(paramDef) {
            var opt = document.createElement('option');
            opt.value = paramDef.key;
            opt.textContent = (paramDef.label || paramDef.key);
            if (paramDef.key === paramKey) { opt.selected = true; }
            keySelect.appendChild(opt);
        });

        keySelect.addEventListener('change', function() {
            chart.parameterKeys[keyIndex] = this.value;
        });
        keyRow.appendChild(keySelect);

        var removeKeyBtn = document.createElement('button');
        removeKeyBtn.className = 'btn-remove';
        removeKeyBtn.style.fontSize = '10px';
        removeKeyBtn.textContent = 'X';
        removeKeyBtn.addEventListener('click', function() {
            chart.parameterKeys.splice(keyIndex, 1);
            renderProfiles();
        });
        keyRow.appendChild(removeKeyBtn);
        wrapper.appendChild(keyRow);
    });

    return wrapper;
}
`;
}
