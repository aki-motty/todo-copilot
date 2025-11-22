output "lambda_execution_role_arn" {
  value       = aws_iam_role.lambda_execution.arn
  description = "Lambda execution role ARN"
}

output "lambda_execution_role_id" {
  value       = aws_iam_role.lambda_execution.id
  description = "Lambda execution role ID"
}

output "lambda_execution_role_name" {
  value       = aws_iam_role.lambda_execution.name
  description = "Lambda execution role name"
}
