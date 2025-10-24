## File & Folder Structure

### Organizational Hierarchy

Domain-first organization. Structure reflects business logic separation, not technical layers. Top-level folders group by major system areas.

### Path Pattern

Three-level nesting for domain operations: Domain > Entity > Action. Each level narrows scope from broad concept to specific implementation.

### File Naming

PascalCase for all files except `index.ts`. Names describe primary purpose or operation contained within. Action files named for the operation type. Flow files combine entity and operation when orchestrating multiple steps.

`index.ts` serves as top-level export aggregator for the folder.

### Function Naming

camelCase verbs starting with action word. Function names match or derive from file purpose. One primary function per file. Function overloads and interface-based function parameters are permitted.

### Helper Functions

Utility functions follow same verb-noun pattern. Place near usage or in dedicated utils when shared across domains.

### Interface Placement

Type definitions declared before functions that use them. Interface names match return types or data structures they describe. Multiple related types can be combined in a single `Types.ts` file when shared across domain.

### Structure Guidelines

Group related operations under same entity folder. Create new action file when operation type differs from existing files. Maintain consistent action vocabulary across domains. One function per file unless using overloads.

### Separation of Concerns

Command handlers manage user interaction and Discord API. Flow contains business rules and data operations. Keep these boundaries clear.
