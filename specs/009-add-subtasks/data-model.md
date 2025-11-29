# Data Model: Add Subtasks

## Entities

### Todo (Aggregate Root)
Represents a task in the todo list.

| Field | Type | Description |
|-------|------|-------------|
| id | `TodoId` (UUID) | Unique identifier |
| title | `TodoTitle` | Title of the todo (1-500 chars) |
| completed | `boolean` | Completion status |
| subtasks | `Subtask[]` | List of subtasks |
| createdAt | `Date` | Creation timestamp |
| updatedAt | `Date` | Last update timestamp |

### Subtask (Entity)
Represents a sub-task within a Todo.

| Field | Type | Description |
|-------|------|-------------|
| id | `SubtaskId` (UUID) | Unique identifier within the Todo (or globally unique) |
| title | `TodoTitle` | Title of the subtask |
| completed | `boolean` | Completion status |

## Value Objects

### TodoTitle
- String, non-empty, max 500 chars.
- Used for both Todo and Subtask titles.

### TodoId / SubtaskId
- Branded UUID strings.
