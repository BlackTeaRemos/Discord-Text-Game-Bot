/**
 * @brief Builds the full HTML document string for the tutorial page
 * @returns string Complete HTML document
 * @example
 * const html = BuildTutorialPageHtml();
 * response.end(html);
 */
export function BuildTutorialPageHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MPG System - Tutorial</title>
<style>
${__GetStyles()}
</style>
</head>
<body>
<div class="layout">
    <nav class="sidebar" id="sidebar">
        <div class="sidebar-header">MPG Tutorial</div>
        <ul class="nav-list">
            <li><a href="#getting-started" class="nav-link active">Getting Started</a></li>
            <li><a href="#templates" class="nav-link">Templates</a></li>
            <li><a href="#objects" class="nav-link">Objects</a></li>
            <li><a href="#expressions" class="nav-link">Expression Language</a></li>
            <li><a href="#turn-engine" class="nav-link">Turn Engine</a></li>
            <li><a href="#tasks-descriptions" class="nav-link">Tasks & Descriptions</a></li>
        </ul>
    </nav>
    <main class="content" id="content">
${__GetGettingStartedSection()}
${__GetTemplatesSection()}
${__GetObjectsSection()}
${__GetExpressionsSection()}
${__GetTurnEngineSection()}
${__GetTasksDescriptionsSection()}
    </main>
</div>
<script>
${__GetScript()}
</script>
</body>
</html>`;
}

/**
 * @brief CSS styles for the tutorial page layout
 * @returns string CSS block
 */
function __GetStyles(): string {
    return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1e2e; color: #cdd6f4; line-height: 1.7; }
.layout { display: flex; min-height: 100vh; }

.sidebar {
    width: 240px; min-width: 240px; background: #181825; border-right: 1px solid #313244;
    position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 1rem 0;
}
.sidebar-header { padding: 0.5rem 1.2rem 1rem; font-size: 1.1rem; font-weight: 700; color: #89b4fa; }
.nav-list { list-style: none; }
.nav-link {
    display: block; padding: 0.5rem 1.2rem; color: #a6adc8; text-decoration: none;
    font-size: 0.9rem; border-left: 3px solid transparent; transition: all 0.15s;
}
.nav-link:hover { color: #cdd6f4; background: #1e1e2e; }
.nav-link.active { color: #89b4fa; border-left-color: #89b4fa; background: #1e1e2e; }

.content { flex: 1; padding: 2rem 3rem; max-width: 900px; }

section.topic { margin-bottom: 3rem; scroll-margin-top: 1rem; }
section.topic h2 {
    font-size: 1.5rem; color: #89b4fa; margin-bottom: 1rem;
    padding-bottom: 0.5rem; border-bottom: 1px solid #313244;
}
section.topic h3 { font-size: 1.15rem; color: #a6e3a1; margin: 1.5rem 0 0.5rem; }
section.topic p { margin-bottom: 0.8rem; }
section.topic ul { margin: 0.5rem 0 1rem 1.5rem; }
section.topic li { margin-bottom: 0.3rem; }

code {
    background: #313244; padding: 0.15rem 0.4rem; border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.88rem; color: #f9e2af;
}
pre {
    background: #181825; border: 1px solid #313244; border-radius: 6px;
    padding: 1rem; overflow-x: auto; margin: 0.8rem 0 1.2rem;
}
pre code { background: none; padding: 0; color: #cdd6f4; }

.command-block {
    background: #313244; border-left: 3px solid #89b4fa; padding: 0.6rem 1rem;
    border-radius: 0 4px 4px 0; margin: 0.5rem 0 1rem; font-family: monospace; font-size: 0.9rem;
}
.note {
    background: #1e1e2e; border: 1px solid #f9e2af; border-left: 3px solid #f9e2af;
    padding: 0.6rem 1rem; border-radius: 0 4px 4px 0; margin: 0.8rem 0; font-size: 0.9rem;
}
.note::before { content: 'Note: '; font-weight: 700; color: #f9e2af; }

.flow-diagram {
    background: #181825; border: 1px solid #313244; border-radius: 6px;
    padding: 1rem; margin: 0.8rem 0 1.2rem; font-family: monospace; font-size: 0.85rem;
    color: #a6e3a1; white-space: pre; overflow-x: auto;
}

table { width: 100%; border-collapse: collapse; margin: 0.8rem 0 1.2rem; }
th, td { padding: 0.5rem 0.8rem; text-align: left; border: 1px solid #313244; }
th { background: #181825; color: #89b4fa; font-weight: 600; }
td { background: #1e1e2e; }

@media (max-width: 768px) {
    .sidebar { display: none; }
    .content { padding: 1rem; }
}
`;
}

/**
 * @brief Client side JavaScript for sidebar scroll tracking
 * @returns string JavaScript block
 */
function __GetScript(): string {
    return `
(function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section.topic');

    function updateActiveLink() {
        let currentSection = '';
        for (const section of sections) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= 120) {
                currentSection = section.id;
            }
        }
        navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();

    navLinks.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
})();
`;
}

/**
 * @brief Getting Started section covering game creation and organizations and user scope
 * @returns string HTML for the Getting Started section
 */
function __GetGettingStartedSection(): string {
    return `
        <section class="topic" id="getting-started">
            <h2>Getting Started</h2>
            <p>MPG System is a game management bot. Each Discord server hosts one game. Players belong to organizations, which own game objects.</p>

            <h3>Creating a Game</h3>
            <p>A server administrator creates the game with:</p>
            <div class="command-block">/create game name: My Campaign</div>
            <p>This registers a game entity for the server. Only one game per server is allowed. All templates and objects belong to this game.</p>

            <h3>Organizations</h3>
            <p>Organizations are groups of players that collectively own game objects. Think of them as factions, teams, or nations.</p>
            <div class="command-block">/organization create name: Northern Alliance</div>
            <p>Players are added to organizations by UID. An organization can have a parent, forming a hierarchy.</p>
            <div class="flow-diagram">Server
  └── Game
       ├── Organization A
       │    ├── Player 1
       │    └── Player 2
       └── Organization B
            └── Player 3</div>

            <h3>User Scope</h3>
            <p>When no organization is specified, the bot resolves your context automatically:</p>
            <div class="flow-diagram">Explicit org override → Stored default org → First org in list → User scope</div>
            <p>You can set your default organization with:</p>
            <div class="command-block">/organization select uid: org_abc123</div>
            <p>Every command that accepts an <code>organization</code> option respects this resolution chain.</p>

            <h3>Viewing Game State</h3>
            <div class="command-block">/view game</div>
            <p>Shows the game name, current turn number, your resolved organization, and the game description (if set).</p>
        </section>`;
}

/**
 * @brief Templates section covering JSON schema and parameters and actions and uploading
 * @returns string HTML for the Templates section
 */
function __GetTemplatesSection(): string {
    return `
        <section class="topic" id="templates">
            <h2>Templates</h2>
            <p>Templates are blueprints for game objects. They define what parameters an object carries and what actions execute on events.</p>

            <h3>Template Structure</h3>
            <p>A template is a JSON document with three sections:</p>
            <pre><code>{
  "name": "Factory",
  "description": "Converts raw materials into goods.",
  "parameters": [
    {
      "key": "productionRate",
      "label": "Production Rate",
      "valueType": "number",
      "defaultValue": 10,
      "category": "production",
      "description": "Units produced per turn"
    },
    {
      "key": "rawMaterials",
      "label": "Raw Materials",
      "valueType": "number",
      "defaultValue": 100
    }
  ],
  "actions": [
    {
      "key": "produce",
      "label": "Produce Goods",
      "trigger": "onTurnAdvance",
      "priority": 10,
      "expressions": [
        "rawMaterials -= productionRate * 2",
        "output += productionRate"
      ],
      "enabled": true
    }
  ]
}</code></pre>

            <h3>Parameters</h3>
            <table>
                <tr><th>Field</th><th>Type</th><th>Purpose</th></tr>
                <tr><td><code>key</code></td><td>string</td><td>Unique identifier, used in expressions</td></tr>
                <tr><td><code>label</code></td><td>string</td><td>Human-readable display name</td></tr>
                <tr><td><code>valueType</code></td><td>number | string | boolean</td><td>Data type for validation</td></tr>
                <tr><td><code>defaultValue</code></td><td>any</td><td>Initial value on object creation</td></tr>
                <tr><td><code>category</code></td><td>string?</td><td>Optional grouping tag</td></tr>
                <tr><td><code>description</code></td><td>string?</td><td>Documentation text</td></tr>
            </table>

            <h3>Actions</h3>
            <table>
                <tr><th>Field</th><th>Type</th><th>Purpose</th></tr>
                <tr><td><code>key</code></td><td>string</td><td>Unique action identifier</td></tr>
                <tr><td><code>label</code></td><td>string</td><td>Display name</td></tr>
                <tr><td><code>trigger</code></td><td>onTurnAdvance | onManual | onCreate | onDestroy</td><td>When the action fires</td></tr>
                <tr><td><code>priority</code></td><td>number</td><td>Execution order (lower = first)</td></tr>
                <tr><td><code>expressions</code></td><td>string[]</td><td>Math expressions to evaluate</td></tr>
                <tr><td><code>enabled</code></td><td>boolean</td><td>Can disable without removing</td></tr>
            </table>

            <h3>Trigger Types</h3>
            <table>
                <tr><th>Trigger</th><th>When it fires</th></tr>
                <tr><td><code>onTurnAdvance</code></td><td>Every time the game turn advances</td></tr>
                <tr><td><code>onManual</code></td><td>When explicitly triggered by a player</td></tr>
                <tr><td><code>onCreate</code></td><td>Once, when the object is instantiated</td></tr>
                <tr><td><code>onDestroy</code></td><td>Once, when the object is deleted</td></tr>
            </table>

            <h3>Web Editor</h3>
            <p>A visual editor is available for building templates without writing JSON manually:</p>
            <div class="command-block">http://localhost:3500/editor</div>
            <p>The editor has two areas: a main content panel for parameters, actions, and JSON preview, and a sidebar for the display config.</p>

            <h3>Display Config Sidebar</h3>
            <p>The sidebar controls how the object card renders. It contains four panels:</p>
            <table>
                <tr><th>Panel</th><th>Purpose</th></tr>
                <tr><td><code>Style</code></td><td>Color pickers for card background, borders, accent, text tones, and border radius</td></tr>
                <tr><td><code>Groups</code></td><td>Parameter groups shown as labeled sections on the card. Drag the key header of a parameter row from the editor into a group to assign it. Each assigned param gets Graph type and Hide controls.</td></tr>
                <tr><td><code>Charts</code></td><td>Multi-parameter charts. Drag param key headers into a chart drop zone. Configure chart type (combined, cumulative, relative) and height.</td></tr>
                <tr><td><code>Layout Order</code></td><td>Drag to reorder the rendering order of groups and charts on the card.</td></tr>
            </table>
            <div class="note">Each parameter row has a distinct key header bar at the top. Drag from that bar — not from the fields below — to assign the param to a group or chart.</div>

            <h3>Uploading Templates</h3>
            <div class="command-block">/import template</div>
            <p>Attach the JSON file to the command. The bot validates the schema and creates the template.</p>

            <h3>Template Merging</h3>
            <p>Uploading a template with the same name as an existing one triggers a merge. The bot analyzes differences:</p>
            <div class="flow-diagram">Upload "Factory" → Name exists → AnalyzeMerge
  ├── No destructive changes → Auto-merge
  └── Destructive changes → Confirm/Cancel dialog
       Destructive = removed params or type changes</div>
            <p>Existing objects are migrated: new parameters get defaults, removed parameters are stripped.</p>

            <h3>Listing Templates</h3>
            <div class="command-block">/view templates</div>
            <p>Shows all templates in the game with parameter count and action count.</p>
        </section>`;
}

/**
 * @brief Objects section covering instantiation and parameter values and viewing
 * @returns string HTML for the Objects section
 */
function __GetObjectsSection(): string {
    return `
        <section class="topic" id="objects">
            <h2>Objects</h2>
            <p>Objects are instances of templates, owned by an organization. Each object carries its own parameter values that diverge from template defaults over time.</p>

            <h3>Creating an Object</h3>
            <div class="command-block">/create object</div>
            <p>Specify a template and optionally a custom name. The object is created with default parameter values from the template, assigned to your resolved organization.</p>
            <div class="flow-diagram">Template "Factory" (productionRate: 10, rawMaterials: 100)
  └── Create Object "Northern Ironworks"
       └── Parameters: productionRate=10, rawMaterials=100 (copied from template)</div>

            <h3>Viewing an Object</h3>
            <div class="command-block">/view object id: obj_abc123</div>
            <p>Shows the object name, template type, organization, and its scoped description (if any).</p>

            <h3>Listing Objects</h3>
            <div class="command-block">/view objects</div>
            <p>Lists all objects in the game scoped to your organization. Supports filtering by template name:</p>
            <div class="command-block">/view objects template: Factory</div>
            <p>Each entry shows: name, template type, key parameter values, and the object UID.</p>

            <h3>Parameter Values</h3>
            <p>Parameters are modified by action expressions during turn processing. Direct manual editing is done through the manage command. Values persist across turns.</p>
            <div class="flow-diagram">Turn 1: rawMaterials = 100
  Action: rawMaterials -= productionRate * 2  (= 100 - 20 = 80)
Turn 2: rawMaterials = 80
  Action: rawMaterials -= productionRate * 2  (= 80 - 20 = 60)</div>
        </section>`;
}

/**
 * @brief Expression Language section covering math ops and builtins and cross references and targeting
 * @returns string HTML for the Expression Language section
 */
function __GetExpressionsSection(): string {
    return `
        <section class="topic" id="expressions">
            <h2>Expression Language</h2>
            <p>Expressions are the math language used in action definitions. They reference parameter keys and produce numeric results.</p>

            <h3>Assignment</h3>
            <pre><code>paramKey = expression       (set)
paramKey += expression      (add)
paramKey -= expression      (subtract)
paramKey *= expression      (multiply)
paramKey /= expression      (divide)</code></pre>
            <p>The left-hand side is the parameter to modify. The right-hand side is evaluated and applied.</p>

            <h3>Arithmetic</h3>
            <pre><code>a + b       addition
a - b       subtraction
a * b       multiplication
a / b       division
a % b       modulo
a ^ b       exponentiation
(a + b) * c grouping</code></pre>

            <h3>Comparisons</h3>
            <pre><code>a > b       greater than (returns 1 or 0)
a < b       less than
a >= b      greater or equal
a <= b      less or equal
a == b      equal
a != b      not equal</code></pre>

            <h3>Built-in Functions</h3>
            <table>
                <tr><th>Function</th><th>Description</th><th>Example</th></tr>
                <tr><td><code>min(a, b)</code></td><td>Smaller of two values</td><td><code>min(stock, demand)</code></td></tr>
                <tr><td><code>max(a, b)</code></td><td>Larger of two values</td><td><code>max(output, 0)</code></td></tr>
                <tr><td><code>clamp(val, lo, hi)</code></td><td>Restrict to range</td><td><code>clamp(health, 0, 100)</code></td></tr>
                <tr><td><code>floor(x)</code></td><td>Round down</td><td><code>floor(rate * 1.5)</code></td></tr>
                <tr><td><code>ceil(x)</code></td><td>Round up</td><td><code>ceil(workers / 2)</code></td></tr>
                <tr><td><code>abs(x)</code></td><td>Absolute value</td><td><code>abs(balance)</code></td></tr>
                <tr><td><code>if(cond, then, else)</code></td><td>Conditional</td><td><code>if(fuel > 0, rate, 0)</code></td></tr>
            </table>

            <h3>Cross-Object References (Read)</h3>
            <p>Read parameter values from objects of other template types using <code>@TemplateName.paramKey</code> syntax:</p>
            <pre><code>output += @Mine.oreOutput * efficiency</code></pre>
            <p>This reads <code>oreOutput</code> from the first Mine object in the game. If multiple Mine objects exist, the first is used for direct reads.</p>

            <h3>How References Resolve</h3>
            <div class="flow-diagram">@Mine.oreOutput
  1. Find all objects with template name "Mine"
  2. Take the first object's oreOutput value
  3. Substitute into expression</div>

            <h3>Aggregate Functions</h3>
            <p>To operate on values across all objects of a template type:</p>
            <table>
                <tr><th>Function</th><th>Description</th><th>Example</th></tr>
                <tr><td><code>sum(@T.p)</code></td><td>Sum of p across all T objects</td><td><code>totalOre = sum(@Mine.output)</code></td></tr>
                <tr><td><code>avg(@T.p)</code></td><td>Average of p across all T objects</td><td><code>avgRate = avg(@Factory.rate)</code></td></tr>
                <tr><td><code>count(@T.p)</code></td><td>Count of T objects</td><td><code>mineCount = count(@Mine.id)</code></td></tr>
            </table>

            <h3>Inline Targeting (Write)</h3>
            <p>Modify parameters on objects of another template type directly in the expression:</p>
            <pre><code>@Mine.oreOutput -= 5
@Warehouse.stock += productionRate</code></pre>
            <p>The left-hand side <code>@TemplateName.paramKey</code> targets all objects of that template. The right-hand side can reference the current object's own parameters.</p>
            <div class="flow-diagram">Expression: @Mine.oreOutput -= 5
  1. Find all Mine objects
  2. For each Mine: oreOutput = oreOutput - 5
  3. Queue batch update</div>

            <h3>Mixed Expressions in One Action</h3>
            <pre><code>// Action "produceAndConsume" on Factory template:
output += productionRate                    // local: modify own output
rawMaterials -= productionRate * 2          // local: consume own materials
@Mine.oreOutput -= productionRate           // remote: drain mines
@Warehouse.stock += output                  // remote: fill warehouses</code></pre>
        </section>`;
}

/**
 * @brief Turn Engine section covering turn advancement and action execution order and priorities
 * @returns string HTML for the Turn Engine section
 */
function __GetTurnEngineSection(): string {
    return `
        <section class="topic" id="turn-engine">
            <h2>Turn Engine</h2>
            <p>The turn engine processes all game objects when a turn advances. It evaluates actions, resolves cross-references, and persists parameter changes.</p>

            <h3>Turn Advancement</h3>
            <div class="command-block">/manage turn advance</div>
            <p>Increments the game turn counter and triggers all <code>onTurnAdvance</code> actions.</p>

            <h3>Execution Order</h3>
            <div class="flow-diagram">1. Collect all game objects
2. Build cross-object state (template name → parameter maps)
3. For each object, collect onTurnAdvance actions
4. Sort actions by priority (lower = first)
5. For each action:
   a. Evaluate each expression in order
   b. Local assignments modify the object's own state
   c. Inline targets queue batch updates for remote objects
6. Persist all local changes
7. Persist all queued batch updates</div>

            <h3>Priority</h3>
            <p>Actions with lower priority numbers execute first. Within the same priority, order is stable but not guaranteed across objects.</p>
            <pre><code>// Priority 5: gather resources first
{ "key": "gather", "priority": 5, "trigger": "onTurnAdvance", ... }

// Priority 10: produce goods from resources
{ "key": "produce", "priority": 10, "trigger": "onTurnAdvance", ... }

// Priority 20: distribute goods
{ "key": "distribute", "priority": 20, "trigger": "onTurnAdvance", ... }</code></pre>

            <h3>Cross-Object State Snapshot</h3>
            <p>Before processing starts, the engine snapshots all parameter states. Cross-object references read from this snapshot, not from in-flight mutations. This prevents execution order from affecting read values.</p>
            <div class="note">Inline target writes are accumulated and applied after all actions complete. Objects being written to by multiple sources use last-write-wins deduplication.</div>

            <h3>Execution Flow Example</h3>
            <div class="flow-diagram">Game State (Turn 5):
  Mine A: oreOutput=20
  Mine B: oreOutput=15
  Factory: rawMaterials=50, productionRate=10

Factory action (priority 10):
  rawMaterials -= productionRate * 2   → 50 - 20 = 30
  output += productionRate             → 0 + 10 = 10
  @Mine.oreOutput -= 5                 → Mine A: 20→15, Mine B: 15→10

Result (Turn 6):
  Mine A: oreOutput=15
  Mine B: oreOutput=10
  Factory: rawMaterials=30, output=10</div>
        </section>`;
}

/**
 * @brief Tasks and Descriptions section covering task workflow and scoped descriptions
 * @returns string HTML for the Tasks and Descriptions section
 */
function __GetTasksDescriptionsSection(): string {
    return `
        <section class="topic" id="tasks-descriptions">
            <h2>Tasks & Descriptions</h2>

            <h3>Tasks</h3>
            <p>Tasks are work items tied to a game. They track assignments, progress, and can be viewed per-turn or per-creator.</p>
            <div class="command-block">/view task</div>
            <p>Lists all tasks for the current game. Supports filtering:</p>
            <div class="command-block">/view task turn: 5</div>
            <div class="command-block">/view task creator: @user</div>
            <p>Viewing a specific task by ID shows the full detail with its scoped description.</p>
            <div class="command-block">/view task id: task_abc123</div>

            <h3>Scoped Descriptions</h3>
            <p>Any game entity (game, object, task) can have descriptions at three tiers:</p>
            <table>
                <tr><th>Scope</th><th>Visible to</th><th>Priority</th></tr>
                <tr><td><code>global</code></td><td>Everyone</td><td>Lowest</td></tr>
                <tr><td><code>organization</code></td><td>Organization members</td><td>Medium</td></tr>
                <tr><td><code>user</code></td><td>Specific user only</td><td>Highest</td></tr>
            </table>
            <p>When viewing an entity, the highest-priority description is shown. If a user-scoped description exists, it overrides the organization and global ones.</p>
            <div class="flow-diagram">FetchDescriptionForObject(objectUid, userUid)
  1. Check user-scoped description → found? return it
  2. Check org-scoped description → found? return it
  3. Check global description → found? return it
  4. Return null (no description)</div>

            <h3>Editing Descriptions</h3>
            <div class="command-block">/edit description object: obj_abc123</div>
            <p>Opens an interactive text editor flow. The scope is determined by your execution context (user or organization).</p>
        </section>`;
}
