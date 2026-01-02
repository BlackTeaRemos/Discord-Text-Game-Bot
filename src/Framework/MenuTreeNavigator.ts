import type { MenuConfig, MenuNode } from './MenuTypes.js';

/**
 * Resolves menu nodes and breadcrumbs for hierarchical menus.
 */
export class MenuTreeNavigator {
    private readonly _config: MenuConfig;

    public constructor(config: MenuConfig) {
        this._config = config;
    }

    /**
     * Resolve a menu node from a path.
     * @param path string[] ordered node ids. Example: ['root','settings'].
     * @returns MenuNode located node.
     */
    public ResolveNode(path: string[]): MenuNode {
        let current: MenuNode = this._config.root;
        for (const identifier of path) {
            const next = this.FindChild(current, identifier);
            if (!next) {
                throw new Error(`Menu path invalid: ${identifier}`);
            }
            current = next;
        }
        return current;
    }

    /**
     * Find a child node by id.
     * @param node MenuNode parent node. Example: { id: 'root', children: [...] }.
     * @param identifier string child id. Example: 'settings'.
     * @returns MenuNode | undefined child if found.
     */
    public FindChild(node: MenuNode, identifier: string): MenuNode | undefined {
        return (node.children ?? []).find((child) => {
            return child.id === identifier;
        });
    }

    /**
     * Build readable breadcrumbs for a path.
     * @param path string[] ordered node ids. Example: ['root','settings','audio'].
     * @returns string[] breadcrumb labels.
     */
    public BuildBreadcrumbs(path: string[]): string[] {
        const names: string[] = [this._config.root.label];
        let current: MenuNode = this._config.root;
        for (const identifier of path) {
            const next = this.FindChild(current, identifier);
            if (!next) {
                break;
            }
            names.push(next.label);
            current = next;
        }
        return names;
    }
}
