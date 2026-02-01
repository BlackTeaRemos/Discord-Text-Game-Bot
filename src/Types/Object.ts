export interface BaseObject {
    id: string;
    objectType: string;
    version?: number;
    open?: Record<string, any>;
    closed?: Record<string, any>;
}
