# Data Module - DynamoDB Table

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "todo-copilot"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags"
  default     = {}
}

# DynamoDB Table
resource "aws_dynamodb_table" "todos" {
  name         = "${var.project_name}-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name               = "UserIdIndex"
    hash_key           = "userId"
    range_key          = "createdAt"
    projection_type    = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-table"
      Component = "Data"
    }
  )
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.todos.name
  description = "DynamoDB table name"
}

output "dynamodb_table_arn" {
  value       = aws_dynamodb_table.todos.arn
  description = "DynamoDB table ARN"
}

output "dynamodb_stream_arn" {
  value       = aws_dynamodb_table.todos.stream_arn
  description = "DynamoDB stream ARN"
}
