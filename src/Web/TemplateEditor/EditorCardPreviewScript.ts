export function BuildCardPreviewScript(): string {
    return `
/* ── Card Preview ── */
function renderCardPreview() {
    var container = document.getElementById('cardPreviewContainer');
    if (!container) return;

    var templateData = buildJson();
    var templateName = templateData.name || 'Untitled';
    var templateDesc = templateData.description || '';
    var parameters = templateData.parameters || [];
    var actions = templateData.actions || [];
    var dc = templateData.displayConfig || null;
    var sc = (dc && dc.styleConfig) ? dc.styleConfig : {};

    var cardBg = sc.cardBackground || '#000000';
    var panelBg = sc.panelBackground || '#09090b';
    var borderClr = sc.borderColor || '#18181b';
    var accentClr = sc.accentColor || '#f97316';
    var textPrimary = sc.textPrimary || '#f4f4f5';
    var textValue = sc.textValue || '#d4d4d8';
    var textLabel = sc.textLabel || '#52525b';
    var textSecondary = sc.textSecondary || '#a1a1aa';
    var textMuted = sc.textMuted || '#3f3f46';
    var borderRadius = sc.cardBorderRadius || 0;

    var longestLabelLength = parameters.reduce(function(maxLen, param) {
        var labelText = (param.label || param.key || '').toUpperCase();
        return labelText.length > maxLen ? labelText.length : maxLen;
    }, 0);
    var computedLabelWidth = Math.max(60, Math.min(longestLabelLength * 7.5 + 8, 240));

    var cssVars = '--cm-border:' + borderClr + ';--cm-accent:' + accentClr + ';--cm-text-primary:' + textPrimary + ';--cm-text-value:' + textValue + ';--cm-text-label:' + textLabel + ';--cm-text-secondary:' + textSecondary + ';--cm-text-muted:' + textMuted + ';--card-radius:' + borderRadius + 'px;';

    var html = '<div class="card-mock" style="background:' + cardBg + ';' + cssVars + '">';

    html += '<div class="cm-accent-bar" style="background:' + accentClr + ';"></div>';

    html += '<div class="cm-header" style="background:' + panelBg + ';">';
    html += '<span class="cm-name">' + escapePreviewHtml(templateName) + '</span>';
    html += '<span class="cm-type">TEMPLATE</span>';
    html += '</div>';

    if (templateDesc) {
        html += '<div style="background:' + panelBg + '30;">';
        html += '<div class="cm-section-label">INFORMATION</div>';
        html += '<div class="cm-desc">' + escapePreviewHtml(templateDesc.substring(0, 200)) + '</div>';
        html += '</div>';
    }

    var hasGroups = dc && dc.groups && dc.groups.length > 0;
    var hasCharts = dc && dc.charts && dc.charts.length > 0;
    if ((hasGroups || hasCharts) && parameters.length > 0) {
        var paramDisplayMap = {};
        (dc.parameterDisplay || []).forEach(function(pd) { paramDisplayMap[pd.key] = pd; });

        var sortedGroups = (dc.groups || []).slice().sort(function(groupA, groupB) { return (groupA.sortOrder || 0) - (groupB.sortOrder || 0); });

        var groupedParams = {};
        sortedGroups.forEach(function(group) { groupedParams[group.key] = []; });
        var ungroupedParams = [];

        parameters.forEach(function(param) {
            var pd = paramDisplayMap[param.key];
            if (pd && pd.hidden) return;
            var targetGroup = pd && pd.group && groupedParams[pd.group] ? pd.group : '';
            if (targetGroup) {
                groupedParams[targetGroup].push(param);
            } else {
                ungroupedParams.push(param);
            }
        });

        Object.keys(groupedParams).forEach(function(groupKey) {
            groupedParams[groupKey].sort(function(paramA, paramB) {
                var orderA = paramDisplayMap[paramA.key] ? (paramDisplayMap[paramA.key].displayOrder || 999) : 999;
                var orderB = paramDisplayMap[paramB.key] ? (paramDisplayMap[paramB.key].displayOrder || 999) : 999;
                return orderA - orderB;
            });
        });

        var renderItems = [];
        sortedGroups.forEach(function(group) {
            var groupParams = groupedParams[group.key] || [];
            if (groupParams.length === 0) return;
            renderItems.push({ sortOrder: group.sortOrder || 0, type: 'group', group: group, params: groupParams });
        });
        var dcCharts = (dc.charts || []);
        dcCharts.forEach(function(chart) {
            renderItems.push({ sortOrder: chart.sortOrder || 0, type: 'chart', chart: chart });
        });
        renderItems.sort(function(itemA, itemB) { return itemA.sortOrder - itemB.sortOrder; });

        renderItems.forEach(function(item) {
            if (item.type === 'group') {
                var groupMaxValue = item.params.reduce(function(maxAccum, currentParam) {
                    var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
                    return numVal > maxAccum ? numVal : maxAccum;
                }, 1);
                html += '<div class="cm-section-label">' + escapePreviewHtml(item.group.label).toUpperCase() + '</div>';
                item.params.forEach(function(param) {
                    var paramGraphType = paramDisplayMap[param.key] ? (paramDisplayMap[param.key].graphType || 'sparkline') : 'sparkline';
                    html += buildMockParamRow(param, textLabel, paramGraphType, accentClr, groupMaxValue, computedLabelWidth);
                });
            } else if (item.type === 'chart') {
                var chart = item.chart;
                var chartParams = (chart.parameterKeys || []).map(function(chartParamKey) {
                    return parameters.find(function(parameter) { return parameter.key === chartParamKey; });
                }).filter(Boolean);
                if (chartParams.length === 0) return;
                var chartLabel = chart.label || chart.chartType.toUpperCase();
                html += '<div class="cm-section-label">' + escapePreviewHtml(chartLabel).toUpperCase() + '</div>';
                var chartHeight = chart.chartHeight || (40 + chartParams.length * 20);
                if (chart.chartType === 'combined') {
                    html += buildCombinedChart(chartParams, accentClr, chartHeight);
                } else if (chart.chartType === 'cumulative') {
                    html += buildCumulativeChart(chartParams, accentClr, chartHeight);
                } else if (chart.chartType === 'relative') {
                    var relativeMaxValue = chartParams.reduce(function(maxAccum, currentParam) {
                        var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
                        return numVal > maxAccum ? numVal : maxAccum;
                    }, 1);
                    chartParams.forEach(function(param) {
                        var displayValue = param.defaultValue !== undefined && param.defaultValue !== '' ? String(param.defaultValue) : '0';
                        var numericValue = Math.abs(parseFloat(displayValue) || 0);
                        var fillPercent = Math.min((numericValue / relativeMaxValue) * 100, 100);
                        html += '<div class="cm-row">' +
                            '<div class="cm-graph-bg"><div style="position:absolute;bottom:0;left:0;height:100%;width:' + fillPercent.toFixed(1) + '%;background:' + accentClr + ';opacity:0.15;"></div></div>' +
                            '<span class="cm-row-label" style="width:' + computedLabelWidth + 'px;">' + escapePreviewHtml((param.label || param.key || '').toUpperCase()) + '</span>' +
                            '<span class="cm-row-value">' + escapePreviewHtml(displayValue) + '</span>' +
                            '</div>';
                    });
                }
            }
        });

        if (ungroupedParams.length > 0) {
            var ungroupedMaxValue = ungroupedParams.reduce(function(maxAccum, currentParam) {
                var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
                return numVal > maxAccum ? numVal : maxAccum;
            }, 1);
            html += '<div class="cm-section-label">VARIABLES</div>';
            ungroupedParams.forEach(function(param) {
                var paramGraphType = paramDisplayMap[param.key] ? (paramDisplayMap[param.key].graphType || 'sparkline') : 'sparkline';
                html += buildMockParamRow(param, textLabel, paramGraphType, accentClr, ungroupedMaxValue, computedLabelWidth);
            });
        }
    } else if (parameters.length > 0) {
        var flatMaxValue = parameters.reduce(function(maxAccum, currentParam) {
            var numVal = Math.abs(parseFloat(currentParam.defaultValue) || 0);
            return numVal > maxAccum ? numVal : maxAccum;
        }, 1);
        html += '<div class="cm-section-label">VARIABLES</div>';
        parameters.forEach(function(param) {
            html += buildMockParamRow(param, textLabel, 'sparkline', accentClr, flatMaxValue, computedLabelWidth);
        });
    }

    if (actions.length > 0) {
        html += '<div class="cm-section-label">ACTIONS</div>';
        actions.forEach(function(action) {
            var dotColor = action.enabled !== false ? '#22c55e' : '#ef4444';
            var triggerLabel = (action.trigger || 'onTurnAdvance').replace(/([A-Z])/g, ' $1').trim();
            html += '<div class="cm-action-row">';
            html += '<div class="cm-action-dot" style="background:' + dotColor + ';"></div>';
            html += '<span class="cm-action-label">' + escapePreviewHtml(action.label || action.key || '') + '</span>';
            html += '<span class="cm-action-trigger">' + escapePreviewHtml(triggerLabel) + '</span>';
            html += '</div>';
        });
    }

    html += '<div class="cm-footer" style="background:' + panelBg + ';">Preview — ' + new Date().toLocaleDateString() + '</div>';

    html += '</div>';
    container.innerHTML = html;
}

function buildMockParamRow(param, labelColor, graphType, accentColor, groupMaxValue, labelWidth) {
    var displayValue = param.defaultValue !== undefined && param.defaultValue !== '' ? String(param.defaultValue) : '0';
    var label = (param.label || param.key || '').toUpperCase();
    var graphHtml = '';

    if (graphType && graphType !== 'none') {
        var mockData = generateMockTimeSeries(parseFloat(displayValue) || 0, param.key);
        if (graphType === 'bar') {
            graphHtml = '<div class="cm-graph-bg">' + buildBarGraphSvg(mockData, accentColor) + '</div>';
        } else {
            graphHtml = '<div class="cm-graph-bg">' + buildSparklineSvg(mockData, accentColor) + '</div>';
        }
    }

    var columnWidth = labelWidth || 140;
    return '<div class="cm-row">' +
        graphHtml +
        '<span class="cm-row-label" style="width:' + columnWidth + 'px;">' + escapePreviewHtml(label) + '</span>' +
        '<span class="cm-row-value">' + escapePreviewHtml(displayValue) + '</span>' +
        '</div>';
}

function generateMockTimeSeries(baseValue, seedKey) {
    var seed = 0;
    for (var charIndex = 0; charIndex < seedKey.length; charIndex++) {
        seed = ((seed << 5) - seed + seedKey.charCodeAt(charIndex)) | 0;
    }
    var points = [];
    var current = baseValue || 50;
    var amplitude = Math.max(Math.abs(current) * 0.3, 5);
    for (var pointIndex = 0; pointIndex < 12; pointIndex++) {
        seed = (seed * 16807 + 0) % 2147483647;
        var noise = ((seed % 1000) / 1000 - 0.5) * amplitude;
        current = current + noise;
        points.push(current);
    }
    return points;
}

function buildSparklineSvg(dataPoints, strokeColor) {
    if (!dataPoints || dataPoints.length < 2) return '';
    var minVal = Math.min.apply(null, dataPoints);
    var maxVal = Math.max.apply(null, dataPoints);
    var range = maxVal - minVal || 1;
    var points = [];
    for (var pointIndex = 0; pointIndex < dataPoints.length; pointIndex++) {
        var xCoord = (pointIndex / (dataPoints.length - 1)) * 100;
        var yCoord = 100 - ((dataPoints[pointIndex] - minVal) / range) * 100;
        points.push(xCoord.toFixed(1) + ',' + yCoord.toFixed(1));
    }
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="' + points.join(' ') + '" fill="none" stroke="' + strokeColor + '" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>';
}

function buildBarGraphSvg(dataPoints, fillColor) {
    if (!dataPoints || dataPoints.length < 2) return '';
    var barCount = Math.min(dataPoints.length, 20);
    var recentData = dataPoints.slice(-barCount);
    var minVal = Math.min.apply(null, recentData);
    var maxVal = Math.max.apply(null, recentData);
    var range = maxVal - minVal || 1;
    var barWidth = 100 / barCount;
    var bars = '';
    for (var barIndex = 0; barIndex < recentData.length; barIndex++) {
        var normalizedHeight = ((recentData[barIndex] - minVal) / range) * 80;
        var barX = barIndex * barWidth;
        var barY = 100 - normalizedHeight;
        bars += '<rect x="' + barX.toFixed(1) + '%" y="' + barY.toFixed(1) + '%" width="' + (barWidth * 0.7).toFixed(1) + '%" height="' + normalizedHeight.toFixed(1) + '%" fill="' + fillColor + '" rx="1"/>';
    }
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none">' + bars + '</svg>';
}

var CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#ef4444'];

function buildCombinedChart(groupParams, accentColor, chartHeight) {
    if (groupParams.length === 0) return '';
    var svgContent = '';
    var legendHtml = '<div class="cm-chart-legend">';

    for (var paramIndex = 0; paramIndex < groupParams.length; paramIndex++) {
        var param = groupParams[paramIndex];
        var color = CHART_COLORS[paramIndex % CHART_COLORS.length];
        var baseValue = parseFloat(param.defaultValue) || 0;
        var mockData = generateMockTimeSeries(baseValue, param.key);
        var minVal = Math.min.apply(null, mockData);
        var maxVal = Math.max.apply(null, mockData);
        var range = maxVal - minVal || 1;
        var points = [];
        for (var pointIdx = 0; pointIdx < mockData.length; pointIdx++) {
            var xCoord = (pointIdx / (mockData.length - 1)) * 100;
            var yCoord = 100 - ((mockData[pointIdx] - minVal) / range) * 100;
            points.push(xCoord.toFixed(1) + ',' + yCoord.toFixed(1));
        }
        svgContent += '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke"/>';
        legendHtml += '<span class="cm-legend-item"><span class="cm-legend-dot" style="background:' + color + ';"></span>' + escapePreviewHtml((param.label || param.key || '').toUpperCase()) + '</span>';
    }

    legendHtml += '</div>';
    return '<div class="cm-group-chart">' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="height:' + chartHeight + 'px;">' + svgContent + '</svg>' +
        legendHtml + '</div>';
}

function buildCumulativeChart(groupParams, accentColor, chartHeight) {
    if (groupParams.length === 0) return '';
    var dataPerParam = [];
    var pointCount = 12;

    for (var paramIndex = 0; paramIndex < groupParams.length; paramIndex++) {
        var baseValue = parseFloat(groupParams[paramIndex].defaultValue) || 0;
        dataPerParam.push(generateMockTimeSeries(baseValue, groupParams[paramIndex].key));
    }

    var cumulativeData = [];
    for (var stackIndex = 0; stackIndex < dataPerParam.length; stackIndex++) {
        var stackedRow = [];
        for (var pointIdx = 0; pointIdx < pointCount; pointIdx++) {
            var previousValue = stackIndex > 0 ? cumulativeData[stackIndex - 1][pointIdx] : 0;
            stackedRow.push(previousValue + Math.abs(dataPerParam[stackIndex][pointIdx]));
        }
        cumulativeData.push(stackedRow);
    }

    var globalMax = 1;
    for (var stackIdx = 0; stackIdx < cumulativeData.length; stackIdx++) {
        for (var ptIdx = 0; ptIdx < pointCount; ptIdx++) {
            if (cumulativeData[stackIdx][ptIdx] > globalMax) globalMax = cumulativeData[stackIdx][ptIdx];
        }
    }

    var svgContent = '';
    var legendHtml = '<div class="cm-chart-legend">';

    for (var layerIndex = cumulativeData.length - 1; layerIndex >= 0; layerIndex--) {
        var color = CHART_COLORS[layerIndex % CHART_COLORS.length];
        var areaPoints = '';
        for (var fwdIdx = 0; fwdIdx < pointCount; fwdIdx++) {
            var xPos = (fwdIdx / (pointCount - 1)) * 100;
            var yPos = 100 - (cumulativeData[layerIndex][fwdIdx] / globalMax) * 100;
            areaPoints += xPos.toFixed(1) + ',' + yPos.toFixed(1) + ' ';
        }
        for (var revIdx = pointCount - 1; revIdx >= 0; revIdx--) {
            var xPosRev = (revIdx / (pointCount - 1)) * 100;
            var yPosRev = layerIndex > 0
                ? 100 - (cumulativeData[layerIndex - 1][revIdx] / globalMax) * 100
                : 100;
            areaPoints += xPosRev.toFixed(1) + ',' + yPosRev.toFixed(1) + ' ';
        }
        svgContent += '<polygon points="' + areaPoints.trim() + '" fill="' + color + '" opacity="0.5"/>';
    }

    for (var legendIdx = 0; legendIdx < groupParams.length; legendIdx++) {
        var legendColor = CHART_COLORS[legendIdx % CHART_COLORS.length];
        legendHtml += '<span class="cm-legend-item"><span class="cm-legend-dot" style="background:' + legendColor + ';"></span>' + escapePreviewHtml((groupParams[legendIdx].label || groupParams[legendIdx].key || '').toUpperCase()) + '</span>';
    }

    legendHtml += '</div>';
    return '<div class="cm-group-chart">' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="height:' + chartHeight + 'px;">' + svgContent + '</svg>' +
        legendHtml + '</div>';
}

function escapePreviewHtml(text) {
    var div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}
/* ── End Card Preview ── */
`;
}
