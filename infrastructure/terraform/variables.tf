# Terraform Configuration - Variables

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for resources"
  default     = "ap-northeast-1"
}

variable "project_name" {
  type        = string
  description = "Project name for resource naming"
  default     = "todo-copilot"
}

variable "lambda_memory_size" {
  type        = number
  description = "Lambda function memory in MB"
  default     = 256

  validation {
    condition     = contains([128, 256, 512, 1024, 2048, 3008, 5120, 10240], var.lambda_memory_size)
    error_message = "lambda_memory_size must be a valid Lambda memory value"
  }
}

variable "lambda_timeout" {
  type        = number
  description = "Lambda function timeout in seconds"
  default     = 30

  validation {
    condition     = var.lambda_timeout > 0 && var.lambda_timeout <= 900
    error_message = "lambda_timeout must be between 1 and 900 seconds"
  }
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to apply to all resources"
  default = {
    ManagedBy = "Terraform"
  }
}
