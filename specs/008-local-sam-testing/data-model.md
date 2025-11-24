# Data Model: Local Seed Data

**Feature**: Local SAM Testing
**Date**: 2025-11-23

## DynamoDB Schema

The local DynamoDB table `todo-copilot-local` mirrors the production schema defined in Terraform.

| Attribute | Type | Key Type | Notes |
| :--- | :--- | :--- | :--- |
| `id` | String | Partition Key | UUID v4 |
| `userId` | String | GSI Partition Key | Mock User ID (e.g., `test-user-1`) |
| `createdAt` | String | GSI Sort Key | ISO 8601 Timestamp |
| `title` | String | - | Todo item title |
| `completed` | Boolean | - | Completion status |
| `updatedAt` | String | - | ISO 8601 Timestamp |

## Seed Data Structure (`seeds.json`)

The `seeds.json` file uses the DynamoDB JSON format required by `aws dynamodb batch-write-item`.

### Example Structure

```json
{
  "todo-copilot-local": [
    {
      "PutRequest": {
        "Item": {
          "id": { "S": "seed-todo-1" },
          "userId": { "S": "test-user-1" },
          "title": { "S": "Setup local environment" },
          "completed": { "BOOL": true },
          "createdAt": { "S": "2023-01-01T10:00:00Z" },
          "updatedAt": { "S": "2023-01-01T10:00:00Z" }
        }
      }
    },
    {
      "PutRequest": {
        "Item": {
          "id": { "S": "seed-todo-2" },
          "userId": { "S": "test-user-1" },
          "title": { "S": "Test API endpoints" },
          "completed": { "BOOL": false },
          "createdAt": { "S": "2023-01-01T11:00:00Z" },
          "updatedAt": { "S": "2023-01-01T11:00:00Z" }
        }
      }
    }
  ]
}
```

## Validation Rules

1.  **`id`**: Must be unique.
2.  **`userId`**: Should match the mock user ID injected by the mock auth middleware (`test-user-1`).
3.  **`createdAt`**: Must be a valid ISO string for GSI sorting.
