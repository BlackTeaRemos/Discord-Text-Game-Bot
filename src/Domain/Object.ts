/**
 * Object and Versioning Model interfaces for the VPI system
 * These interfaces define core data structures for objects transactions and mutations
 */

/**
 * Describes the public metadata envelope for any stored object from snapshot perspective
 * The actual domain payload lives in open and closed sections
 */
export interface ObjectEnvelope<TOpen = any, TClosed = any> {
    /** Globally unique object identifier within a guild */
    id: string; // unique per guild
    /** Object type discriminator such as pattern or factory or view */
    objectType: string; // logical classification
    /** Optional human readable label not required to be unique */
    label?: string; // display name
    /** Latest version number as monotonically increasing integer starting at 0 */
    version: number; // current version integer
    /** Pointer to the root message or thread id where history is anchored */
    historyPointer: string; // discord thread or message id
    /** Unix epoch milliseconds when last updated */
    updatedAt: number; // timestamp ms
    /** Creation timestamp in epoch ms */
    createdAt: number; // timestamp ms
    /** Object level tags for filtering and disclosure intersection semantics */
    tags?: string[]; // optional tags
    /** Publicly visible after tag and policy filtering structure */
    open: TOpen; // open segment
    /** Restricted content only disclosed if policy authorizes */
    closed?: TClosed; // gated segment
    /** Meta information including field tags and links and integrity hashes */
    __meta?: ObjectMeta; // internal metadata block
}

/**
 * Internal metadata attached to object snapshots where not all fields are always populated
 */
export interface ObjectMeta {
    /** Mapping of fully qualified JSON pointer paths to tag arrays */
    fieldTags?: Record<string, string[]>; // field level tags
    /** Backlink and cross reference structures for graph generation */
    links?: Array<{ targetId: string; relation?: string; note?: string }>; // structured links
    /** Integrity hash of latest applied transaction chain head when enabled */
    chainHeadHash?: string; // optional integrity hash
    /** ETag style hash of snapshot for cache validation */
    snapshotHash?: string; // quick change detector
    /** Owner user ID for the Discord user who created the object */
    ownerUserId?: string; // owner user id
}

/**
 * Append only transaction record describing one mutation bundle
 */
export interface TransactionRecord {
    /** Unique transaction identifier as uuid */
    transactionId: string; // unique id
    /** Previous transaction hash for chained integrity or null if genesis */
    previousHash?: string | null; // previous link
    /** Hash of this transactions mutation payload when integrity is enabled */
    hash?: string; // current tx hash
    /** Version produced by this transaction after application */
    resultingVersion: number; // new version number
    /** Epoch ms when transaction committed */
    committedAt: number; // timestamp
    /** Author user id on Discord */
    authorUserId: string; // who initiated
    /** High level operation descriptor such as create or update or undo or system */
    operation: string; // semantic op label
    /** Array of low level primitive operations applied to JSON document */
    ops: Array<JsonMutationOp>; // atomic ops set
    /** Field tag delta operations for add or remove applied with this tx */
    fieldTagsDelta?: FieldTagsDelta; // tag adjustments
    /** Optional free form audit info such as reason or command or correlation id */
    audit?: Record<string, any>; // audit payload
}

/**
 * Primitive JSON mutation operation as a subset of JSON Patch semantics with extension fields as needed
 */
export interface JsonMutationOp {
    /** Operation type for set or remove or increment or decrement or merge */
    op: `set` | `remove` | `increment` | `decrement` | `merge`;
    /** JSON Pointer path to the target node */
    path: string;
    /** Value used for set or merge or increment or decrement operations */
    value?: any;
}

/** Describes additions and removals of field level tags keyed by JSON pointer path */
export interface FieldTagsDelta {
    add?: Record<string, string[]>; // add these tags with uniqueness enforced elsewhere
    remove?: Record<string, string[]>; // remove these tag entries
}
