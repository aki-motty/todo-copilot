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

# Reference existing DynamoDB table (pre-created)
data "aws_dynamodb_table" "todos" {
  name = "${var.project_name}-${var.environment}"
}

output "dynamodb_table_name" {
  value       = data.aws_dynamodb_table.todos.name
  description = "DynamoDB table name"
}

output "dynamodb_table_arn" {
  value       = data.aws_dynamodb_table.todos.arn
  description = "DynamoDB table ARN"
}

output "dynamodb_stream_arn" {
  value       = data.aws_dynamodb_table.todos.stream_arn
  description = "DynamoDB stream ARN"
}
