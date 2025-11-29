variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
}

variable "project_name" {
  type        = string
  description = "Project name for resource naming"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to apply to all resources"
  default     = {}
}

variable "api_gateway_endpoint" {
  type        = string
  description = "API Gateway endpoint URL for backend routing"
  default     = ""
}
