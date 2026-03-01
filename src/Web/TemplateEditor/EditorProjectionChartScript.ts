export function BuildProjectionChartScript(): string {
    return `
function projBuildChartsSection(profileName, profile) {
    var wrapper = document.createElement('div');
    wrapper.style.padding = '4px 0';

    var hasCustomCharts = Array.isArray(profile.charts);

    var toggleRow = document.createElement('div');
    toggleRow.style.display = 'flex';
    toggleRow.style.gap = '6px';
    toggleRow.style.alignItems = 'center';
    toggleRow.style.marginBottom = '4px';

    var toggleCheckbox = document.createElement('input');
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.checked = hasCustomCharts;
    toggleCheckbox.title = 'Use custom charts instead of inheriting from base';
    toggleCheckbox.addEventListener('change', function() {
        if (this.checked) {
            profile.charts = [];
        } else {
            delete profile.charts;
        }
        projRenderAll();
        updatePreview();
    });
    toggleRow.appendChild(toggleCheckbox);

    var toggleLabel = document.createElement('span');
    toggleLabel.style.fontSize = '10px';
    toggleLabel.style.color = hasCustomCharts ? '#f97316' : '#22c55e';
    toggleLabel.textContent = hasCustomCharts ? 'Custom charts' : 'Inheriting base charts';
    toggleRow.appendChild(toggleLabel);
    wrapper.appendChild(toggleRow);

    if (!hasCustomCharts) {
        return wrapper;
    }

    profile.charts.forEach(function(chart, chartIndex) {
        var chartCard = projBuildChartCard(profile, chart, chartIndex);
        wrapper.appendChild(chartCard);
    });

    var addChartBtn = document.createElement('button');
    addChartBtn.className = 'btn-add';
    addChartBtn.style.fontSize = '10px';
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
        projRenderAll();
        updatePreview();
    });
    wrapper.appendChild(addChartBtn);

    return wrapper;
}

function projBuildChartCard(profile, chart, chartIndex) {
    var chartCard = document.createElement('div');
    chartCard.style.border = '1px solid #f9731644';
    chartCard.style.borderRadius = '4px';
    chartCard.style.padding = '4px';
    chartCard.style.marginBottom = '4px';
    chartCard.style.fontSize = '11px';

    var headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.gap = '4px';
    headerRow.style.alignItems = 'center';

    var keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'chart_key';
    keyInput.value = chart.key || '';
    keyInput.style.width = '80px';
    keyInput.style.fontSize = '11px';
    keyInput.addEventListener('input', function() {
        chart.key = this.value.trim();
        updatePreview();
    });
    headerRow.appendChild(keyInput);

    var labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Label';
    labelInput.value = chart.label || '';
    labelInput.style.flex = '1';
    labelInput.style.fontSize = '11px';
    labelInput.addEventListener('input', function() {
        chart.label = this.value.trim();
        updatePreview();
    });
    headerRow.appendChild(labelInput);

    var removeChartBtn = document.createElement('button');
    removeChartBtn.className = 'btn-remove';
    removeChartBtn.style.fontSize = '10px';
    removeChartBtn.textContent = 'X';
    removeChartBtn.addEventListener('click', function() {
        profile.charts.splice(chartIndex, 1);
        projRenderAll();
        updatePreview();
    });
    headerRow.appendChild(removeChartBtn);
    chartCard.appendChild(headerRow);

    var configRow = projBuildChartConfigRow(chart);
    chartCard.appendChild(configRow);

    var keysSection = projBuildChartKeysSection(chart);
    chartCard.appendChild(keysSection);

    return chartCard;
}

function projBuildChartConfigRow(chart) {
    var configRow = document.createElement('div');
    configRow.style.display = 'flex';
    configRow.style.gap = '4px';
    configRow.style.alignItems = 'center';
    configRow.style.marginTop = '2px';

    var typeSelect = document.createElement('select');
    typeSelect.style.fontSize = '10px';
    ['combined', 'cumulative', 'relative'].forEach(function(chartType) {
        var opt = document.createElement('option');
        opt.value = chartType;
        opt.textContent = chartType;
        if (chartType === (chart.chartType || 'combined')) { opt.selected = true; }
        typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener('change', function() {
        chart.chartType = this.value;
        updatePreview();
    });
    configRow.appendChild(typeSelect);

    var heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.min = '0';
    heightInput.step = '10';
    heightInput.placeholder = 'auto';
    heightInput.value = chart.chartHeight ? String(chart.chartHeight) : '';
    heightInput.style.width = '50px';
    heightInput.style.fontSize = '10px';
    heightInput.addEventListener('change', function() {
        chart.chartHeight = parseInt(this.value, 10) || 0;
        updatePreview();
    });
    configRow.appendChild(heightInput);

    var pxLabel = document.createElement('span');
    pxLabel.style.fontSize = '9px';
    pxLabel.style.color = '#52525b';
    pxLabel.textContent = 'px';
    configRow.appendChild(pxLabel);

    var orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.min = '0';
    orderInput.placeholder = 'order';
    orderInput.value = chart.sortOrder !== undefined ? String(chart.sortOrder) : '';
    orderInput.style.width = '40px';
    orderInput.style.fontSize = '10px';
    orderInput.addEventListener('change', function() {
        chart.sortOrder = parseInt(this.value, 10) || 0;
        updatePreview();
    });
    configRow.appendChild(orderInput);

    return configRow;
}

function projBuildChartKeysSection(chart) {
    var keysSection = document.createElement('div');
    keysSection.style.marginTop = '2px';
    keysSection.style.paddingLeft = '8px';
    keysSection.style.borderLeft = '2px solid #f9731644';

    var keysLabel = document.createElement('span');
    keysLabel.style.fontSize = '10px';
    keysLabel.style.color = '#a1a1aa';
    keysLabel.textContent = 'Param keys';
    keysSection.appendChild(keysLabel);

    if (!chart.parameterKeys) { chart.parameterKeys = []; }

    chart.parameterKeys.forEach(function(paramKey, paramKeyIndex) {
        var keyRow = document.createElement('div');
        keyRow.style.display = 'flex';
        keyRow.style.gap = '3px';
        keyRow.style.alignItems = 'center';
        keyRow.style.marginTop = '1px';

        var paramInput = document.createElement('input');
        paramInput.type = 'text';
        paramInput.value = paramKey;
        paramInput.style.flex = '1';
        paramInput.style.fontSize = '10px';
        paramInput.addEventListener('input', function() {
            chart.parameterKeys[paramKeyIndex] = this.value.trim();
            updatePreview();
        });
        keyRow.appendChild(paramInput);

        var removeKeyBtn = document.createElement('button');
        removeKeyBtn.className = 'btn-remove';
        removeKeyBtn.style.fontSize = '9px';
        removeKeyBtn.textContent = 'X';
        removeKeyBtn.addEventListener('click', function() {
            chart.parameterKeys.splice(paramKeyIndex, 1);
            projRenderAll();
            updatePreview();
        });
        keyRow.appendChild(removeKeyBtn);
        keysSection.appendChild(keyRow);
    });

    var addKeyBtn = document.createElement('button');
    addKeyBtn.className = 'btn-add';
    addKeyBtn.style.fontSize = '9px';
    addKeyBtn.style.marginTop = '2px';
    addKeyBtn.textContent = '+ Key';
    addKeyBtn.addEventListener('click', function() {
        chart.parameterKeys.push('');
        projRenderAll();
        updatePreview();
    });
    keysSection.appendChild(addKeyBtn);

    return keysSection;
}
`;
}
