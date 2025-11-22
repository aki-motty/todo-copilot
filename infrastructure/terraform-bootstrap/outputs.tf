output "state_bucket_id" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.terraform_state.arn
}

output "lock_table_name" {
  description = "DynamoDB lock table name"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "lock_table_arn" {
  description = "DynamoDB lock table ARN"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "backend_config" {
  description = "Backend configuration to use in main terraform directory"
  value = {
    bucket         = aws_s3_bucket.terraform_state.id
    key            = "main/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = aws_dynamodb_table.terraform_locks.name
    encrypt        = true
  }
  sensitive = false
}
