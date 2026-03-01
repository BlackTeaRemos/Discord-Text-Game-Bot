export function BuildProjectionConfigStyles(): string {
    return `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #09090b;
    color: #f4f4f5;
    padding: 24px;
    line-height: 1.5;
}
.container { max-width: 1200px; margin: 0 auto; }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #f97316; }
h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; }
h3 { font-size: 13px; font-weight: 600; color: #71717a; margin-bottom: 8px; }
.context-bar, .panel { background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 16px; margin-bottom: 16px; }
.context-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 8px; }
.field { display: flex; flex-direction: column; flex: 1; }
.field label { font-size: 12px; color: #71717a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
input, select { background: #09090b; border: 1px solid #3f3f46; color: #f4f4f5; padding: 8px 12px; border-radius: 4px; font-size: 14px; width: 100%; }
input:focus, select:focus { outline: none; border-color: #f97316; }
.btn { background: #27272a; border: 1px solid #3f3f46; color: #f4f4f5; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; white-space: nowrap; }
.btn:hover { background: #3f3f46; }
.btn-primary { background: #7c2d12; border-color: #f97316; }
.btn-primary:hover { background: #9a3412; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
.btn-add { background: #14532d; border: 1px solid #22c55e; color: #f4f4f5; padding: 3px 10px; border-radius: 3px; cursor: pointer; font-size: 12px; }
.btn-add:hover { background: #166534; }
.btn-remove { background: #7f1d1d; border: 1px solid #ef4444; color: #f4f4f5; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; }
.btn-remove:hover { background: #991b1b; }
.two-col { display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
@media (max-width: 800px) { .two-col { grid-template-columns: 1fr; } }
.ground-truth { max-height: calc(100vh - 240px); overflow-y: auto; }
.gt-group { margin-bottom: 12px; }
.gt-group-header { font-size: 12px; color: #f97316; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.gt-param { display: flex; justify-content: space-between; padding: 3px 8px; font-size: 12px; border-bottom: 1px solid #18181b; }
.gt-param-key { color: #d4d4d8; font-weight: 500; }
.gt-param-type { color: #52525b; font-size: 11px; }
.profile-card { background: #09090b; border: 1px solid #27272a; border-radius: 4px; margin-bottom: 8px; }
.profile-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; cursor: pointer; user-select: none; }
.profile-header:hover { background: #18181b; }
.profile-name { font-weight: 600; font-size: 14px; }
.profile-body { padding: 0 12px 12px; }
.section-toggle { display: flex; align-items: center; gap: 6px; padding: 6px 0; cursor: pointer; user-select: none; font-size: 12px; color: #a1a1aa; }
.section-toggle:hover { color: #f4f4f5; }
.group-entry { border: 1px solid #27272a; border-radius: 4px; padding: 6px 8px; margin-bottom: 4px; font-size: 12px; }
.group-entry-header { display: flex; gap: 4px; align-items: center; }
.badge-linked { color: #22c55e; font-size: 10px; font-weight: 600; }
.badge-custom { color: #f97316; font-size: 10px; font-weight: 600; }
.custom-params { margin-top: 4px; padding-left: 12px; border-left: 2px solid #f97316; }
.chart-entry { border: 1px solid #f9731644; border-radius: 4px; padding: 6px 8px; margin-bottom: 4px; font-size: 12px; }
.chart-entry-header { display: flex; gap: 4px; align-items: center; }
.chart-keys { margin-top: 4px; padding-left: 12px; border-left: 2px solid #f9731644; }
.style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.style-field { display: flex; flex-direction: column; gap: 2px; }
.style-field label { font-size: 10px; color: #71717a; text-transform: uppercase; }
.style-field input[type="color"] { width: 100%; height: 28px; padding: 2px; background: #09090b; border: 1px solid #3f3f46; border-radius: 4px; cursor: pointer; }
.style-field input[type="number"] { width: 100%; background: #09090b; border: 1px solid #3f3f46; color: #f4f4f5; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.actions-bar { display: flex; gap: 12px; margin-bottom: 16px; }
.status-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 24px; background: #18181b; border-top: 1px solid #27272a; font-size: 13px; color: #71717a; text-align: center; transition: opacity 0.3s; }
.status-bar.success { color: #22c55e; }
.status-bar.error { color: #ef4444; }
details > summary { list-style: none; }
details > summary::-webkit-details-marker { display: none; }
`;
}
