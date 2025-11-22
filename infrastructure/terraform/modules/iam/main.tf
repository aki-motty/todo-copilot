# IAM Module - Lambda Execution Role

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-northeast-1"
}

variable "dynamodb_table_arn" {
  type        = string
  description = "DynamoDB table ARN for Lambda access"
}

variable "cloudwatch_log_group_arn" {
  type        = string
  description = "CloudWatch log group ARN"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags"
  default     = {}
}

data "aws_caller_identity" "current" {}

# Lambda execution role
resource "aws_iam_role" "lambda_execution" {
  name              = "lambda-execution-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name      = "lambda-execution"
      Component = "IAM"
    }
  )
}

# Policy: DynamoDB access
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name   = "lambda-dynamodb-${var.environment}"
  role   = aws_iam_role.lambda_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Policy: CloudWatch Logs
resource "aws_iam_role_policy" "lambda_logs" {
  name   = "lambda-logs-${var.environment}"
  role   = aws_iam_role.lambda_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${var.cloudwatch_log_group_arn}:*"
      }
    ]
  })
}

# Policy: X-Ray (production only)
resource "aws_iam_role_policy" "lambda_xray" {
  count  = var.environment == "prod" ? 1 : 0
  name   = "lambda-xray-${var.environment}"
  role   = aws_iam_role.lambda_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

output "lambda_execution_role_arn" {
  value       = aws_iam_role.lambda_execution.arn
  description = "ARN of the Lambda execution role"
}

output "lambda_execution_role_name" {
  value       = aws_iam_role.lambda_execution.name
  description = "Name of the Lambda execution role"
}
