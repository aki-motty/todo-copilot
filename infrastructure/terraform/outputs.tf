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

output "lambda_execution_role_arn" {
  value       = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/lambda-execution-${var.environment}"
  description = "IAM role ARN for Lambda execution"
}

output "frontend_bucket_name" {
  value       = module.frontend.frontend_bucket_name
  description = "Name of the S3 bucket hosting the frontend"
}

output "cloudfront_distribution_id" {
  value       = module.frontend.cloudfront_distribution_id
  description = "ID of the CloudFront distribution"
}

output "cloudfront_domain_name" {
  value       = module.frontend.cloudfront_domain_name
  description = "Domain name of the CloudFront distribution"
}
