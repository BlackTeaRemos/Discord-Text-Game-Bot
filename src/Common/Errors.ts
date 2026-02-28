// Errors  Error taxonomy for the VPI system with structured hierarchy and machine readable codes

/** Well known application error codes */
export const ERROR_CODES = {
    VALIDATION_ERROR: `VALIDATION_ERROR`,
    POLICY_ERROR: `POLICY_ERROR`,
    STORAGE_ERROR: `STORAGE_ERROR`,
    NOT_FOUND: `NOT_FOUND`,
    CONFLICT: `CONFLICT`,
    INTERNAL_ERROR: `INTERNAL_ERROR`,
    PERMISSION_APPROVAL_ERROR: `PERMISSION_APPROVAL_ERROR`,
} as const;

/** Union type of all known error code string literals */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * @brief Base application error carrying a machine code and structured details
 */
export class AppError extends Error {
    /** Machine readable error code in SNAKE_CASE */
    public readonly code: ErrorCode;
    /** Arbitrary structured metadata for diagnostics not user facing secrets */
    public readonly details?: Record<string, any>;
    /** Underlying cause error if any */
    public readonly cause?: unknown;

    /**
     * @brief Constructs a new AppError
     * @param code ErrorCode Machine error code see ERROR_CODES
     * @param message string Human readable summary safe to show to end user unless security sensitive
     * @param details Record or undefined Additional structured context for object identifiers
     * @param cause unknown Original error object or value
     */
    constructor(code: ErrorCode, message: string, details?: Record<string, any>, cause?: unknown) {
        super(message);
        this.code = code;
        this.details = details;
        this.cause = cause;
        // Maintain proper prototype chain for TS and JS
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/** ValidationError indicates user input or configuration failed schema or semantic validation */
export class ValidationError extends AppError {
    /**
     * @param message string Description of validation failure
     * @param details Record or undefined Offending field info and schema path
     */
    constructor(message: string, details?: Record<string, any>) {
        super(ERROR_CODES.VALIDATION_ERROR, message, details);
    }
}

/** PolicyError indicates access or authorization or disclosure rules denied action */
export class PolicyError extends AppError {
    constructor(message: string, details?: Record<string, any>) {
        super(ERROR_CODES.POLICY_ERROR, message, details);
    }
}

/** StorageError represents persistence layer failures including Discord API and IO */
export class StorageError extends AppError {
    constructor(message: string, details?: Record<string, any>, cause?: unknown) {
        super(ERROR_CODES.STORAGE_ERROR, message, details, cause);
    }
}

/** NotFoundError when requested entity such as object or transaction or resource does not exist */
export class NotFoundError extends AppError {
    constructor(message: string, details?: Record<string, any>) {
        super(ERROR_CODES.NOT_FOUND, message, details);
    }
}

/** ConflictError for optimistic concurrency or duplicate creation races */
export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, any>) {
        super(ERROR_CODES.CONFLICT, message, details);
    }
}

/** Generic internal error wrapper when no more specific category applies */
export class InternalError extends AppError {
    constructor(message: string, details?: Record<string, any>, cause?: unknown) {
        super(ERROR_CODES.INTERNAL_ERROR, message, details, cause);
    }
}

/** PermissionApprovalError indicates an interactive approval was rejected or failed */
export class PermissionApprovalError extends AppError {
    /** Safe to display text that was shown to the user */
    public readonly displayMessage: string;
    /** Structured log metadata for tracing approval failures */
    public readonly logContext?: Record<string, any>;

    /**
     * @param displayMessage string Message already reported to the requesting user
     * @param logContext Record or undefined Additional context for logging
     */
    constructor(displayMessage: string, logContext?: Record<string, any>) {
        super(ERROR_CODES.PERMISSION_APPROVAL_ERROR, displayMessage, logContext);
        this.displayMessage = displayMessage;
        this.logContext = logContext;
    }
}
