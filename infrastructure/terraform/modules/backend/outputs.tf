# Backend Module - Outputs

output "state_bucket_name" {
  value       = aws_s3_bucket.terraform_state.id
  description = "S3 bucket name for Terraform state"
}

output "state_bucket_arn" {
  value       = aws_s3_bucket.terraform_state.arn
  description = "S3 bucket ARN for Terraform state"
}

output "lock_table_name" {
  value       = aws_dynamodb_table.terraform_lock.name
  description = "DynamoDB table name for state locking"
}

output "lock_table_arn" {
  value       = aws_dynamodb_table.terraform_lock.arn
  description = "DynamoDB table ARN for state locking"
}

output "terraform_executor_role_arn" {
  value       = aws_iam_role.terraform_executor.arn
  description = "IAM role ARN for Terraform executor"
}

output "terraform_external_id" {
  value       = random_uuid.terraform_external_id.result
  sensitive   = true
  description = "External ID for Terraform executor role assumption"
}

output "backend_config" {
  value = {
    bucket         = aws_s3_bucket.terraform_state.id
    key            = "terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = aws_dynamodb_table.terraform_lock.name
    encrypt        = true
  }
  sensitive   = false
  description = "Backend configuration for terraform init"
}
