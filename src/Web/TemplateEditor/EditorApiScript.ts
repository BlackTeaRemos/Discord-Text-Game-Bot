export function BuildApiScript(): string {
    return `
function fetchTemplates() {
    const gameUidInput = document.getElementById('gameUid');
    const gameUidValue = gameUidInput.value.trim();
    if (!gameUidValue) {
        alert('Enter a Game UID first.');
        return;
    }

    const fetchButton = document.querySelector('.btn-fetch');
    fetchButton.classList.add('loading');
    fetchButton.textContent = 'Loading...';

    fetch('/api/templates?gameUid=' + encodeURIComponent(gameUidValue))
    .then(function(response) { return response.json(); })
    .then(function(result) {
        fetchButton.classList.remove('loading');
        fetchButton.textContent = 'Load Templates';

        if (result.error) {
            alert('Server error: ' + result.error);
            return;
        }

        cachedAvailableTemplates = result.templates || [];
        renderRefsPanel(cachedAvailableTemplates);
    })
    .catch(function(fetchError) {
        fetchButton.classList.remove('loading');
        fetchButton.textContent = 'Load Templates';
        alert('Failed to fetch templates: ' + fetchError.message);
    });
}

function renderRefsPanel(templates) {
    const panel = document.getElementById('availableRefsPanel');
    const listContainer = document.getElementById('refsList');

    if (!templates || templates.length === 0) {
        panel.style.display = 'block';
        listContainer.innerHTML = '<span class="ref-no-params">No templates found for this game.</span>';
        return;
    }

    panel.style.display = 'block';
    var html = '';

    templates.forEach(function(template) {
        html += '<div class="ref-template-group">';
        html += '<div class="ref-template-name">' + template.name + '</div>';

        var numericParams = template.parameters.filter(function(parameter) {
            return parameter.valueType === 'number';
        });

        if (numericParams.length > 0) {
            numericParams.forEach(function(parameter) {
                var refText = '@' + template.name + '.' + parameter.key;
                html += '<span class="ref-param-tag" title="Click to insert: ' + refText + ' (' + (parameter.label || parameter.key) + ')" onclick="insertRefAtCursor(\\'' + refText + '\\')">' + refText + '</span>';
            });
        } else {
            html += '<span class="ref-no-params">No numeric parameters</span>';
        }
        html += '</div>';
    });

    listContainer.innerHTML = html;
}

let lastFocusedExpressionInput = null;

document.addEventListener('focusin', function(event) {
    var target = event.target;
    if (target.tagName === 'INPUT' && target.closest('.expression-row')) {
        lastFocusedExpressionInput = target;
    }
});

function insertRefAtCursor(refText) {
    if (!lastFocusedExpressionInput) {
        var firstExprInput = document.querySelector('.expression-row input');
        if (firstExprInput) {
            lastFocusedExpressionInput = firstExprInput;
        } else {
            return;
        }
    }

    var input = lastFocusedExpressionInput;
    var cursorStart = input.selectionStart || 0;
    var cursorEnd = input.selectionEnd || 0;
    var currentValue = input.value;

    input.value = currentValue.substring(0, cursorStart) + refText + currentValue.substring(cursorEnd);
    var newCursorPosition = cursorStart + refText.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    input.focus();
    updatePreview();
}

let activeAutocompleteDropdown = null;
let autocompleteSelectedIndex = -1;

function buildAutocompleteSuggestions(filterText) {
    var suggestions = [];
    var lowerFilter = filterText.toLowerCase();

    cachedAvailableTemplates.forEach(function(template) {
        var numericParams = (template.parameters || []).filter(function(parameter) {
            return parameter.valueType === 'number';
        });

        numericParams.forEach(function(parameter) {
            var refText = '@' + template.name + '.' + parameter.key;
            if (refText.toLowerCase().indexOf(lowerFilter) >= 0 || lowerFilter === '') {
                suggestions.push({
                    refText: refText,
                    templateName: template.name,
                    paramKey: parameter.key,
                    paramLabel: parameter.label || parameter.key
                });
            }
        });
    });

    return suggestions;
}

function showAutocompleteDropdown(inputElement, suggestions, atSignPosition) {
    dismissAutocomplete();

    if (suggestions.length === 0) return;

    var dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    autocompleteSelectedIndex = -1;

    suggestions.forEach(function(suggestion, index) {
        var item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('data-index', index);
        item.innerHTML = '<span class="ac-template-label">' + suggestion.templateName + '</span>.' + suggestion.paramKey + '<span class="ac-param-label">(' + suggestion.paramLabel + ')</span>';

        item.addEventListener('mousedown', function(event) {
            event.preventDefault();
            acceptAutocompleteSuggestion(inputElement, suggestion.refText, atSignPosition);
        });

        dropdown.appendChild(item);
    });

    var inputRect = inputElement.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (inputRect.bottom + 2) + 'px';
    dropdown.style.left = inputRect.left + 'px';
    dropdown.style.minWidth = Math.max(inputRect.width, 240) + 'px';

    document.body.appendChild(dropdown);
    activeAutocompleteDropdown = dropdown;
}

function acceptAutocompleteSuggestion(inputElement, refText, atSignPosition) {
    var currentValue = inputElement.value;
    var cursorPosition = inputElement.selectionStart || currentValue.length;

    inputElement.value = currentValue.substring(0, atSignPosition) + refText + currentValue.substring(cursorPosition);
    var newCursorPosition = atSignPosition + refText.length;
    inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    inputElement.focus();
    dismissAutocomplete();
    updatePreview();
}

function dismissAutocomplete() {
    if (activeAutocompleteDropdown) {
        activeAutocompleteDropdown.remove();
        activeAutocompleteDropdown = null;
        autocompleteSelectedIndex = -1;
    }
}

document.addEventListener('keydown', function(event) {
    if (!activeAutocompleteDropdown) return;

    var items = activeAutocompleteDropdown.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, items.length - 1);
        highlightAutocompleteItem(items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, 0);
        highlightAutocompleteItem(items);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
        if (autocompleteSelectedIndex >= 0 && autocompleteSelectedIndex < items.length) {
            event.preventDefault();
            items[autocompleteSelectedIndex].dispatchEvent(new MouseEvent('mousedown'));
        }
    } else if (event.key === 'Escape') {
        dismissAutocomplete();
    }
});

function highlightAutocompleteItem(items) {
    items.forEach(function(item, index) {
        if (index === autocompleteSelectedIndex) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

document.addEventListener('input', function(event) {
    var target = event.target;
    if (target.tagName !== 'INPUT' || !target.closest('.expression-row')) return;
    if (cachedAvailableTemplates.length === 0) {
        dismissAutocomplete();
        return;
    }

    var cursorPosition = target.selectionStart || 0;
    var textBeforeCursor = target.value.substring(0, cursorPosition);

    var lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex < 0) {
        dismissAutocomplete();
        return;
    }

    var partialRef = textBeforeCursor.substring(lastAtIndex + 1);
    if (/\\s/.test(partialRef)) {
        dismissAutocomplete();
        return;
    }

    var suggestions = buildAutocompleteSuggestions(partialRef);
    showAutocompleteDropdown(target, suggestions, lastAtIndex);
});

document.addEventListener('click', function(event) {
    if (activeAutocompleteDropdown && !activeAutocompleteDropdown.contains(event.target)) {
        dismissAutocomplete();
    }
});

function validateOnServer() {
    const templateObject = buildJson();
    const validateButton = document.querySelector('.btn-validate');
    const serverMessages = document.getElementById('serverValidationMessages');
    const gameUidValue = document.getElementById('gameUid').value.trim();

    validateButton.classList.add('loading');
    validateButton.textContent = 'Checking...';
    serverMessages.innerHTML = '';

    var apiUrl = '/api/validate';
    var requestPayload = templateObject;

    if (gameUidValue) {
        apiUrl = '/api/validate-context';
        requestPayload = { gameUid: gameUidValue, template: templateObject };
    }

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        validateButton.classList.remove('loading');
        validateButton.textContent = 'Validate';

        var html = '<div class="server-validation-header">Server Validation</div>';

        if (result.valid) {
            html += '<div class="validation-ok">All checks passed. Template and expressions are valid.</div>';
        } else {
            if (result.structuralErrors && result.structuralErrors.length > 0) {
                result.structuralErrors.forEach(function(error) {
                    html += '<div class="validation-error">[Structure] ' + error + '</div>';
                });
            }
            if (result.expressionErrors && result.expressionErrors.length > 0) {
                result.expressionErrors.forEach(function(exprError) {
                    exprError.errors.forEach(function(message) {
                        html += '<div class="validation-error">[Expression] Action "' + exprError.actionKey + '" #' + (exprError.expressionIndex + 1) + ': ' + message + '</div>';
                    });
                });
            }
            if (result.crossReferenceErrors && result.crossReferenceErrors.length > 0) {
                result.crossReferenceErrors.forEach(function(crossError) {
                    var locationLabel = crossError.expressionIndex >= 0
                        ? 'Action "' + crossError.actionKey + '" expr #' + (crossError.expressionIndex + 1)
                        : 'Action "' + crossError.actionKey + '" target';
                    html += '<div class="validation-warning">[CrossRef] ' + locationLabel + ': ' + crossError.reference + ' — ' + crossError.error + '</div>';
                });
            }
        }

        if (result.availableTemplates) {
            cachedAvailableTemplates = result.availableTemplates.map(function(templateRef) {
                return {
                    name: templateRef.name,
                    parameters: templateRef.numericParameters.map(function(paramKey) {
                        return { key: paramKey, valueType: 'number', label: paramKey };
                    })
                };
            });
            renderRefsPanel(cachedAvailableTemplates);
        }

        serverMessages.innerHTML = html;
    })
    .catch(function(fetchError) {
        validateButton.classList.remove('loading');
        validateButton.textContent = 'Validate';
        serverMessages.innerHTML = '<div class="validation-error">Server unreachable: ' + fetchError.message + '</div>';
    });
}
`;
}
