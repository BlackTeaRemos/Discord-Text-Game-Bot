export function BuildEditorDocs(): string {
    return `
<h3>Assignment Syntax</h3>
<p>Every expression follows: <code>targetVariable operator rightHandSide</code></p>
<table>
    <tr><th>Operator</th><th>Description</th><th>Example</th></tr>
    <tr><td><code>=</code></td><td>Direct assignment</td><td><code>output = 10</code></td></tr>
    <tr><td><code>+=</code></td><td>Add and assign</td><td><code>output += productionRate</code></td></tr>
    <tr><td><code>-=</code></td><td>Subtract and assign</td><td><code>rawMaterials -= cost</code></td></tr>
    <tr><td><code>*=</code></td><td>Multiply and assign</td><td><code>output *= 2</code></td></tr>
    <tr><td><code>/=</code></td><td>Divide and assign</td><td><code>output /= 2</code></td></tr>
</table>
<p>The <code>targetVariable</code> must be a numeric parameter key defined in the template.</p>

<h3>Arithmetic</h3>
<table>
    <tr><th>Operator</th><th>Example</th></tr>
    <tr><td><code>+</code></td><td><code>output += rate + bonus</code></td></tr>
    <tr><td><code>-</code></td><td><code>stock -= consumption - surplus</code></td></tr>
    <tr><td><code>*</code></td><td><code>cost = workers * wage</code></td></tr>
    <tr><td><code>/</code></td><td><code>perUnit = total / count</code></td></tr>
</table>
<p>Parentheses <code>()</code> control evaluation order: <code>output = (a + b) * c</code></p>

<h3>Comparison Operators</h3>
<p>Return <code>1</code> for true, <code>0</code> for false.</p>
<table>
    <tr><th>Operator</th><th>Example</th></tr>
    <tr><td><code>&gt;</code></td><td><code>if(stock > 0, 1, 0)</code></td></tr>
    <tr><td><code>&lt;</code></td><td><code>if(health < 10, 1, 0)</code></td></tr>
    <tr><td><code>&gt;=</code></td><td><code>if(level >= 5, bonus, 0)</code></td></tr>
    <tr><td><code>&lt;=</code></td><td><code>if(fuel <= 0, 0, speed)</code></td></tr>
    <tr><td><code>==</code></td><td><code>if(state == 1, active, 0)</code></td></tr>
</table>

<h3>Built-in Functions</h3>
<table>
    <tr><th>Function</th><th>Args</th><th>Description</th><th>Example</th></tr>
    <tr><td><code>min(a, b)</code></td><td>2</td><td>Returns smaller value</td><td><code>output = min(stock, demand)</code></td></tr>
    <tr><td><code>max(a, b)</code></td><td>2</td><td>Returns larger value</td><td><code>health = max(health, 0)</code></td></tr>
    <tr><td><code>clamp(val, lo, hi)</code></td><td>3</td><td>Constrains between bounds</td><td><code>speed = clamp(speed, 0, 100)</code></td></tr>
    <tr><td><code>floor(x)</code></td><td>1</td><td>Round down</td><td><code>units = floor(total / size)</code></td></tr>
    <tr><td><code>ceil(x)</code></td><td>1</td><td>Round up</td><td><code>batches = ceil(total / size)</code></td></tr>
    <tr><td><code>abs(x)</code></td><td>1</td><td>Absolute value</td><td><code>distance = abs(posA - posB)</code></td></tr>
    <tr><td><code>if(cond, then, else)</code></td><td>3</td><td>Conditional (cond &gt; 0 = true)</td><td><code>output = if(fuel > 0, rate, 0)</code></td></tr>
</table>

<h3>Cross-Object References</h3>
<p>Read numeric parameters from other object types using <code>@TemplateName.paramKey</code> syntax.</p>
<p>The <code>@</code> prefix signals that the value comes from a different template, not the current object.</p>

<h4>How References Resolve</h4>
<p>When the turn engine encounters <code>@Mine.oreOutput</code> in a Factory expression:</p>
<div class="example-block">1. Find all objects created from the "Mine" template in the same game
2. Take the FIRST matching object
3. Read its current "oreOutput" parameter value
4. Substitute that numeric value into the expression</div>
<p>If no objects of the referenced template exist, the reference evaluates to <code>0</code>.</p>
<p>Only <strong>numeric</strong> parameters can be referenced. String and boolean parameters are not available for cross-reference.</p>

<h4>Reference Scope</h4>
<p>References are <strong>game-wide</strong>. Any object in the same game can reference any other template's parameters, regardless of which organization owns them.</p>
<p>The current template's own parameters are also available as <code>@SelfTemplateName.paramKey</code>, but usually you just use the bare key name directly.</p>

<h4>Usage Patterns</h4>
<div class="example-block">// Read a single value from another template
output += @Mine.oreOutput

// Combine values from multiple templates
production = @Mine.oreOutput - @Refinery.consumption

// Use in conditionals
bonus = if(@Market.demand > 100, 2, 1)

// Nested in function calls
profit = max(@Market.price * output - cost, 0)</div>

<h4>Finding Available References</h4>
<p>Enter your game UID at the top and click "Load Templates" to see all available <code>@Template.param</code> references. Click any reference tag to insert it into the last-focused expression field.</p>

<h3>Aggregate Functions</h3>
<p>Aggregate across <strong>all</strong> objects of a template type in the game:</p>
<table>
    <tr><th>Function</th><th>Description</th><th>Example</th></tr>
    <tr><td><code>sum(@Tmpl.key)</code></td><td>Sum values from all matching objects</td><td><code>totalOre = sum(@Mine.oreOutput)</code></td></tr>
    <tr><td><code>avg(@Tmpl.key)</code></td><td>Average across all matching objects</td><td><code>avgEff = avg(@Factory.efficiency)</code></td></tr>
    <tr><td><code>count(@Tmpl.key)</code></td><td>Count objects that have this parameter</td><td><code>mineCount = count(@Mine.oreOutput)</code></td></tr>
</table>
<p>Unlike a bare <code>@Mine.oreOutput</code> reference (which takes the first object), aggregate functions consider every object of that template.</p>
<div class="example-block">// If the game has 3 Mines with oreOutput: 10, 20, 15
sum(@Mine.oreOutput)   // = 45
avg(@Mine.oreOutput)   // = 15
count(@Mine.oreOutput) // = 3

// Combine aggregates with arithmetic
totalCost = sum(@Factory.workers) * @Economy.wage
averageLoad = sum(@Truck.cargo) / count(@Truck.cargo)</div>

<h3>Inline Targeting</h3>
<p>By default, expressions modify the owning object. To modify other objects, use <code>@TemplateName.paramKey</code> as the <strong>left-hand side</strong>:</p>
<table>
    <tr><th>Expression</th><th>Effect</th></tr>
    <tr><td><code>output += rate</code></td><td>Modifies <code>output</code> on the owning object.</td></tr>
    <tr><td><code>@Mine.oreOutput -= 5</code></td><td>Reduces <code>oreOutput</code> by 5 on <strong>all Mine</strong> objects.</td></tr>
    <tr><td><code>@Warehouse.stock += output</code></td><td>Adds this object's <code>output</code> to every Warehouse's <code>stock</code>.</td></tr>
</table>
<p>When targeting multiple objects, the expression runs once per target. The owning object's parameters are used for RHS evaluation but not modified by inline-targeted expressions.</p>
<div class="example-block">// A Factory action that produces goods AND consumes from Mines:
{
  "key": "produceAndConsume",
  "expressions": [
    "output += productionRate",
    "@Mine.oreOutput -= productionRate * 2"
  ]
}
// output changes on the Factory
// oreOutput changes on ALL Mine objects</div>
<p><strong>Tip:</strong> If templates are loaded, the editor validates inline target template names and parameter keys against known templates.</p>

<h3>Triggers</h3>
<table>
    <tr><th>Value</th><th>When</th></tr>
    <tr><td><code>onTurnAdvance</code></td><td>Each turn advance event</td></tr>
    <tr><td><code>onManual</code></td><td>Manually triggered by user</td></tr>
    <tr><td><code>onCreate</code></td><td>When the object is created</td></tr>
    <tr><td><code>onDestroy</code></td><td>When the object is destroyed</td></tr>
</table>
`;
}
