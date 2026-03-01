import { BuildProjectionConfigStyles } from './ProjectionConfigStyles.js';
import { BuildProjectionApiScript } from './ProjectionApiScript.js';
import { BuildGroundTruthScript } from './GroundTruthScript.js';
import { BuildProfileEditorScript } from './ProfileEditorScript.js';
import { BuildProfileGroupsScript } from './ProfileGroupsScript.js';
import { BuildProfileChartsScript } from './ProfileChartsScript.js';
import { BuildProfileStyleScript } from './ProfileStyleScript.js';

export function BuildProjectionConfigPageHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Projection Display Config</title>
    <style>
${BuildProjectionConfigStyles()}
    </style>
</head>
<body>
    <div class="container">
        <nav class="nav-bar">
            <a href="/" class="nav-link">Template Editor</a>
            <a href="/display-config" class="nav-link">Display Config</a>
            <span class="nav-current">Projection Config</span>
        </nav>

        <div class="context-bar">
            <div class="context-row">
                <label for="gameUid">Game UID</label>
                <input type="text" id="gameUid" placeholder="Enter game UID" />
                <button onclick="loadTemplates()">Load</button>
            </div>
            <div class="context-row" id="templateRow" style="display:none;">
                <label for="templateSelect">Template</label>
                <select id="templateSelect" onchange="loadProjectionConfig()">
                    <option value="">Select template...</option>
                </select>
            </div>
        </div>

        <div id="configPanel" style="display:none;">
            <div class="two-column-layout">
                <div class="ground-truth-panel">
                    <h2>Ground Truth</h2>
                    <div id="groundTruthContainer"></div>
                </div>
                <div class="profiles-panel">
                    <h2>Projection Profiles</h2>
                    <div id="profilesContainer"></div>
                </div>
            </div>

            <div class="actions-bar">
                <button onclick="saveProjectionConfig()">Save</button>
                <button onclick="exportProjectionJson()">Export JSON</button>
                <label class="import-label">
                    Import JSON
                    <input type="file" accept=".json" onchange="importProjectionJson(event)" style="display:none;" />
                </label>
            </div>
        </div>
    </div>

    <div id="statusBar" class="status-bar"></div>

    <script>
${BuildProjectionApiScript()}
${BuildGroundTruthScript()}
${BuildProfileGroupsScript()}
${BuildProfileChartsScript()}
${BuildProfileStyleScript()}
${BuildProfileEditorScript()}
    </script>

    <script>
(function() {
    var savedGameUid = localStorage.getItem('projectionConfigGameUid');
    if (savedGameUid) {
        document.getElementById('gameUid').value = savedGameUid;
    }
    var gameInput = document.getElementById('gameUid');
    gameInput.addEventListener('change', function() {
        localStorage.setItem('projectionConfigGameUid', this.value.trim());
    });
})();
    </script>
</body>
</html>`;
}
