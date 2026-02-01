import type { DBObject } from '../../../Repository/Object/Object.js';

/**
 * Tagged parameter node stored for an object.
 */
export interface TaggedParameterRecord extends DBObject {
    tag: string; // parameter tag used to select parser
    payload_json: string; // raw JSON string
    createdAt: string; // ISO date string
    createdBy: string; // discord id of creator
}

/**
 * Minimal view model for listing parameter tags.
 */
export interface TaggedParameterTag {
    tag: string;
}
