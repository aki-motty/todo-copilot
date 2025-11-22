# Backend Module - Variables

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

variable "common_tags" {
  type        = map(string)
  description = "Common tags to apply to all resources"
  default = {
    Project   = "todo-copilot"
    ManagedBy = "Terraform"
  }
}
