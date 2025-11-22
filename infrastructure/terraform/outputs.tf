# Terraform Configuration - Outputs

output "api_gateway_endpoint" {
  value       = module.compute.api_gateway_endpoint
  description = "API Gateway endpoint URL"
}

output "lambda_function_arn" {
  value       = module.compute.lambda_function_arn
  description = "Lambda function ARN"
}

output "lambda_function_name" {
  value       = module.compute.lambda_function_name
  description = "Lambda function name"
}

output "dynamodb_table_name" {
  value       = module.data.dynamodb_table_name
  description = "DynamoDB table name"
}

output "dynamodb_table_arn" {
  value       = module.data.dynamodb_table_arn
  description = "DynamoDB table ARN"
}

output "state_bucket_name" {
  value       = module.backend.state_bucket_name
  description = "S3 bucket for Terraform state"
}

output "lock_table_name" {
  value       = module.backend.lock_table_name
  description = "DynamoDB table for state locking"
}

output "terraform_executor_role_arn" {
  value       = module.backend.terraform_executor_role_arn
  description = "IAM role ARN for Terraform executor"
}

output "lambda_execution_role_arn" {
  value       = module.iam.lambda_execution_role_arn
  description = "IAM role ARN for Lambda execution"
}
