export type Listener<T> = (...args: T[]) => void;
export type EventIdentifierSubset = string | number | boolean | undefined;
export type EventIdentifier = EventIdentifierSubset[];

export class TrieNode<T> {
    listeners: { id: string; listener: Listener<T> }[] = [];
    onceListeners: { id: string; listener: Listener<T> }[] = [];
    children: Map<string, TrieNode<T>> = new Map();
}

/**
 * @brief Complex event emitter supporting event identifiers with string number and undefined values
 */
export default class ComplexEventEmitter<EventData> {
    protected root: TrieNode<EventData> = new TrieNode();
    protected listenerIdCounter: number = 0;

    /**
     * @brief Get the key part of the event identifier
     * @protected
     * @param value EventIdentifierSubset The value to convert to a key string
     * @returns string The string representation of the value
     */
    protected getKeyPart(value: EventIdentifierSubset): string {
        return value === undefined ? `*` : String(value);
    }

    protected generateListenerId(): string {
        return `listener_${this.listenerIdCounter++}`;
    }

    /**
     * @brief Add a listener to the event emitter
     * @protected
     * @param node TrieNode The trie node to attach the listener to
     * @param eventIdentifier EventIdentifier The event path to listen for
     * @param listener Listener The callback to invoke
     * @param once boolean Whether to fire only once
     * @returns string The generated listener id
     */
    protected addListener(
        node: TrieNode<EventData>,
        eventIdentifier: EventIdentifier,
        listener: Listener<EventData>,
        once: boolean,
    ): string {
        const id = this.generateListenerId();
        const listenerObj = { id, listener };

        if (eventIdentifier.length === 0) {
            if (once) {
                node.onceListeners.push(listenerObj);
            } else {
                node.listeners.push(listenerObj);
            }
            return id;
        }

        const [head, ...tail] = eventIdentifier;
        const keyPart = this.getKeyPart(head);

        if (!node.children.has(keyPart)) {
            node.children.set(keyPart, new TrieNode());
        }

        return this.addListener(node.children.get(keyPart)!, tail, listener, once);
    }

    /**
     * @brief Register a persistent listener for an event identifier
     * @param eventIdentifier EventIdentifier The event path to listen for
     * @param listener Listener The callback to invoke
     * @returns string The generated listener id
     */
    public on(
        eventIdentifier: EventIdentifier,
        listener: Listener<EventData>,
    ): string {
        return this.addListener(this.root, eventIdentifier, listener, false);
    }

    /**
     * @brief Register a listener that fires only once then removes itself
     * @param eventIdentifier EventIdentifier The event path to listen for
     * @param listener Listener The callback to invoke
     * @returns string The generated listener id
     */
    public once(
        eventIdentifier: EventIdentifier,
        listener: Listener<EventData>,
    ): string {
        return this.addListener(this.root, eventIdentifier, listener, true);
    }

    /**
     * @brief Recursively emit an event through the trie
     * @protected
     * @param node TrieNode The current trie node being traversed
     * @param eventIdentifier EventIdentifier The remaining event path segments
     * @param args any[] The arguments to pass to the listeners
     */
    protected emitListeners(
        node: TrieNode<EventData>,
        eventIdentifier: EventIdentifier,
        args: any[],
    ): void {
        // Always fire the current nodes listeners as prefix match
        for (const listener of node.listeners) {
            listener.listener(...args);
        }

        for (const listener of node.onceListeners) {
            listener.listener(...args);
        }

        node.onceListeners = [];

        if (eventIdentifier.length === 0) {
            return;
        }

        const [head, ...tail] = eventIdentifier;
        const keyPart = this.getKeyPart(head);

        if (node.children.has(keyPart)) {
            this.emitListeners(node.children.get(keyPart)!, tail, args);
        }

        if (node.children.has(`*`)) {
            this.emitListeners(node.children.get(`*`)!, tail, args);
        }
    }

    /**
     * @brief Emit an event to all matching listeners
     * @param eventIdentifier EventIdentifier The event path to emit
     * @param args any[] The arguments to pass to the listeners
     */
    public emit(eventIdentifier: EventIdentifier, ...args: any[]): void {
        this.emitListeners(this.root, eventIdentifier, args);
    }

    /**
     * @brief Collect all registered event identifiers from the trie
     * @protected
     * @param node TrieNode The current trie node being traversed
     * @param prefix EventIdentifier The accumulated path segments
     * @returns EventIdentifier[] All event identifiers found in the subtree
     */
    protected collectEventIdentifiers(
        node: TrieNode<EventData>,
        prefix: EventIdentifier,
    ): EventIdentifier[] {
        const result: EventIdentifier[] = [];

        if (node.listeners.length > 0 || node.onceListeners.length > 0) {
            result.push(prefix);
        }

        for (const [key, child] of node.children.entries()) {
            const value =
                key === `*` ? undefined : isNaN(Number(key)) ? key : Number(key);
            result.push(...this.collectEventIdentifiers(child, [...prefix, value]));
        }

        return result;
    }
    /**
     * @brief Get a list of all registered event identifiers
     * @returns EventIdentifier[] All event identifiers in the emitter
     */
    public getEventList(): EventIdentifier[] {
        return this.collectEventIdentifiers(this.root, []);
    }

    /**
     * @brief Remove all listeners at a specific event identifier
     * @protected
     * @param node TrieNode The current trie node being traversed
     * @param eventIdentifier EventIdentifier The event path to clear
     */
    protected removeListeners(
        node: TrieNode<EventData>,
        eventIdentifier: EventIdentifier,
    ): void {
        if (eventIdentifier.length === 0) {
            node.listeners = [];
            node.onceListeners = [];
            return;
        }

        const [head, ...tail] = eventIdentifier;
        const keyPart = this.getKeyPart(head);

        if (node.children.has(keyPart)) {
            this.removeListeners(node.children.get(keyPart)!, tail);
        }
        if (node.children.has(`*`)) {
            this.removeListeners(node.children.get(`*`)!, tail);
        }
    }

    /**
     * @brief Remove all listeners for a given event identifier
     * @param eventIdentifier EventIdentifier The event path to clear
     */
    public removeAllListeners(eventIdentifier: EventIdentifier): void {
        this.removeListeners(this.root, eventIdentifier);
    }

    /**
     * @brief Remove a specific listener by id from an event identifier
     * @protected
     * @param node TrieNode The current trie node being traversed
     * @param eventIdentifier EventIdentifier The event path to search
     * @param id string The listener id to remove
     */
    protected removeSpecificListener(
        node: TrieNode<EventData>,
        eventIdentifier: EventIdentifier,
        id: string,
    ): void {
        if (eventIdentifier.length === 0) {
            node.listeners = node.listeners.filter((l) => {
                return l.id !== id;
            });
            node.onceListeners = node.onceListeners.filter((l) => {
                return l.id !== id;
            });
            return;
        }

        const [head, ...tail] = eventIdentifier;
        const keyPart = this.getKeyPart(head);

        if (node.children.has(keyPart)) {
            this.removeSpecificListener(node.children.get(keyPart)!, tail, id);
        }
        if (node.children.has(`*`)) {
            this.removeSpecificListener(node.children.get(`*`)!, tail, id);
        }
    }

    /**
     * @brief Remove a specific listener by id
     * @param eventIdentifier EventIdentifier The event path the listener is registered on
     * @param id string or undefined The listener id to remove
     */
    public off(eventIdentifier: EventIdentifier, id: string | undefined): void {
        if (id) {
            this.removeSpecificListener(this.root, eventIdentifier, id);
        }
    }
}
