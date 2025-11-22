variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "todo-copilot"
}

variable "state_bucket_name" {
  description = "S3 bucket name for Terraform state (must be globally unique)"
  type        = string
}

variable "lock_table_name" {
  description = "DynamoDB table name for Terraform state locks"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}
