export function BuildProjectionApiScript(): string {
    return `
var _currentTemplateUid = null;
var _currentTemplate = null;
var _projConfigs = {};
var _templates = [];

function showStatus(message, type) {
    var bar = document.getElementById('statusBar');
    if (!bar) { return; }
    bar.textContent = message;
    bar.className = 'status-bar' + (type ? ' ' + type : '');
    bar.style.opacity = '1';
    setTimeout(function() { bar.style.opacity = '0.5'; }, 3000);
}

function loadTemplates() {
    var gameUid = document.getElementById('gameUid').value.trim();
    if (!gameUid) {
        showStatus('Enter a Game UID first', 'error');
        return;
    }

    fetch('/api/templates?gameUid=' + encodeURIComponent(gameUid))
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.error) {
                showStatus(data.error, 'error');
                return;
            }
            _templates = data.templates || [];
            var selectElement = document.getElementById('templateSelect');
            selectElement.innerHTML = '<option value="">Select template...</option>';
            _templates.forEach(function(template) {
                var option = document.createElement('option');
                option.value = template.uid;
                option.textContent = template.name + ' (' + template.uid + ')';
                selectElement.appendChild(option);
            });
            document.getElementById('templateRow').style.display = 'flex';
            showStatus('Loaded ' + _templates.length + ' templates', 'success');
        })
        .catch(function(fetchError) {
            showStatus('Failed to load templates: ' + fetchError.message, 'error');
        });
}

function loadProjectionConfig() {
    var templateUid = document.getElementById('templateSelect').value;
    if (!templateUid) {
        document.getElementById('configPanel').style.display = 'none';
        return;
    }

    _currentTemplateUid = templateUid;

    fetch('/api/projection-config?templateUid=' + encodeURIComponent(templateUid))
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.error) {
                showStatus(data.error, 'error');
                return;
            }
            _currentTemplate = data;
            _projConfigs = data.projectionDisplayConfigs || {};
            renderGroundTruth();
            renderProfiles();
            document.getElementById('configPanel').style.display = 'block';
            showStatus('Loaded projection config for ' + data.templateName, 'success');
        })
        .catch(function(fetchError) {
            showStatus('Failed to load projection config: ' + fetchError.message, 'error');
        });
}

function saveProjectionConfig() {
    if (!_currentTemplateUid) {
        showStatus('No template selected', 'error');
        return;
    }

    var payload = {
        templateUid: _currentTemplateUid,
        projectionDisplayConfigs: collectConfigs()
    };

    fetch('/api/projection-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.error) {
            showStatus('Save failed: ' + data.error, 'error');
            return;
        }
        showStatus('Projection config saved', 'success');
    })
    .catch(function(saveError) {
        showStatus('Save failed: ' + saveError.message, 'error');
    });
}

function exportProjectionJson() {
    var data = collectConfigs();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = (_currentTemplateUid || 'projection') + '_config.json';
    anchor.click();
    URL.revokeObjectURL(url);
}

function importProjectionJson(event) {
    var file = event.target.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function(readEvent) {
        try {
            var imported = JSON.parse(readEvent.target.result);
            if (typeof imported === 'object' && imported !== null) {
                _projConfigs = imported;
                renderProfiles();
                showStatus('Imported projection config', 'success');
            }
        } catch(parseError) {
            showStatus('Invalid JSON file', 'error');
        }
    };
    reader.readAsText(file);
}
`;
}
