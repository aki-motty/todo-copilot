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
