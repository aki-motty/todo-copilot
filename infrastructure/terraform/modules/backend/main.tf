# Terraform Backend Module - Main Configuration

resource "aws_s3_bucket" "terraform_state" {
  bucket = "todo-copilot-terraform-state-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.common_tags,
    {
      Name      = "todo-copilot-terraform-state"
      Component = "Backend"
    }
  )
}

# Enable versioning for state recovery
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption for state files
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access to state bucket
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Note: MFA delete requires manual AWS CLI configuration
# Enable MFA delete (optional, production only) - requires AWS CLI
# aws s3api put-bucket-versioning --bucket <bucket-name> \
#   --versioning-configuration Status=Enabled,MFADelete=Enabled \
#   --mfa "arn:aws:iam::ACCOUNT:mfa/device-serial 123456"

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_lock" {
  name           = "terraform-lock-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  ttl {
    attribute_name = "Expires"
    enabled        = true
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "terraform-lock"
      Component = "Backend"
    }
  )
}

# Enable PITR for DynamoDB in production (requires separate resource)
resource "aws_dynamodb_table_pitr" "terraform_lock" {
  count           = var.environment == "prod" ? 1 : 0
  table_name      = aws_dynamodb_table.terraform_lock.name
  point_in_time_recovery_enabled = true
}

# IAM role for Terraform executor
resource "aws_iam_role" "terraform_executor" {
  name              = "terraform-executor-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS     = data.aws_caller_identity.current.arn
          Service = "codepipeline.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = random_uuid.terraform_external_id.result
          }
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name      = "terraform-executor"
      Component = "Backend"
    }
  )
}

# IAM policy for state backend access
resource "aws_iam_role_policy" "terraform_backend" {
  name   = "terraform-backend-${var.environment}"
  role   = aws_iam_role.terraform_executor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketVersioning"
        ]
        Resource = aws_s3_bucket.terraform_state.arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.terraform_lock.arn
      }
    ]
  })
}

# IAM policy for AWS resource management (minimal for Lambda, API Gateway, DynamoDB)
resource "aws_iam_role_policy" "terraform_resources" {
  name   = "terraform-resources-${var.environment}"
  role   = aws_iam_role.terraform_executor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:PublishVersion",
          "lambda:CreateAlias",
          "lambda:UpdateAlias"
        ]
        Resource = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:todo-copilot-*"
      },
      {
        Effect = "Allow"
        Action = [
          "apigateway:POST",
          "apigateway:GET",
          "apigateway:PUT",
          "apigateway:DELETE",
          "apigatewayv2:*"
        ]
        Resource = "arn:aws:apigateway:${var.aws_region}::/restapis*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:CreateTable",
          "dynamodb:DeleteTable",
          "dynamodb:UpdateTable",
          "dynamodb:CreateGlobalSecondaryIndex",
          "dynamodb:UpdateGlobalSecondaryIndexThroughput",
          "dynamodb:DeleteGlobalSecondaryIndex",
          "dynamodb:TagResource",
          "dynamodb:UntagResource"
        ]
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/todo-copilot-*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:UpdateAssumeRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRole",
          "iam:PassRole"
        ]
        Resource = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/lambda-*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:DeleteLogGroup",
          "logs:PutRetentionPolicy"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricAlarm",
          "cloudwatch:DeleteAlarms"
        ]
        Resource = "arn:aws:cloudwatch:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alarm:*"
      }
    ]
  })
}

# Generate external ID for role assumption
resource "random_uuid" "terraform_external_id" {
  keepers = {
    environment = var.environment
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
