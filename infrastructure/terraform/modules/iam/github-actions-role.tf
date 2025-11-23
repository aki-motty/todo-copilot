# IAM Role for GitHub Actions OIDC Authentication

data "aws_partition" "current" {}

# Data source for GitHub OIDC provider
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# GitHub OIDC Provider in AWS
resource "aws_iam_openid_connect_provider" "github" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
  url             = "https://token.actions.githubusercontent.com"

  tags = merge(
    var.common_tags,
    {
      Name = "github-actions-oidc"
    }
  )
}

# IAM Role for GitHub Actions (Development Environment)
resource "aws_iam_role" "github_actions_dev" {
  name = "github-actions-role-dev"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:aki-motty/todo-copilot:*"
          }
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "github-actions-role-dev"
      Environment = "development"
    }
  )
}

# IAM Role for GitHub Actions (Staging Environment)
resource "aws_iam_role" "github_actions_staging" {
  name = "github-actions-role-staging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:aki-motty/todo-copilot:environment:staging"
          }
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "github-actions-role-staging"
      Environment = "staging"
    }
  )
}

# IAM Role for GitHub Actions (Production Environment)
resource "aws_iam_role" "github_actions_prod" {
  name = "github-actions-role-prod"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:aki-motty/todo-copilot:environment:production"
          }
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name        = "github-actions-role-prod"
      Environment = "production"
    }
  )
}

# Policy for Terraform execution (S3 state, DynamoDB lock)
resource "aws_iam_policy" "terraform_state_access" {
  name        = "github-actions-terraform-state-access"
  description = "Policy for GitHub Actions to access Terraform state and locks"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::todo-copilot-terraform-state-*",
          "arn:aws:s3:::todo-copilot-terraform-state-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/todo-copilot-terraform-lock"
      }
    ]
  })

  tags = var.common_tags
}

# Policy for Lambda deployment
resource "aws_iam_policy" "lambda_deploy" {
  name        = "github-actions-lambda-deploy"
  description = "Policy for GitHub Actions to deploy Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunction",
          "lambda:DeleteFunction",
          "lambda:GetFunction",
          "lambda:ListFunctions",
          "lambda:CreateAlias",
          "lambda:UpdateAlias",
          "lambda:DeleteAlias",
          "lambda:GetAlias",
          "lambda:ListAliases"
        ]
        Resource = "arn:aws:lambda:*:*:function:todo-copilot-*"
      }
    ]
  })

  tags = var.common_tags
}

# Policy for API Gateway deployment
resource "aws_iam_policy" "api_gateway_deploy" {
  name        = "github-actions-api-gateway-deploy"
  description = "Policy for GitHub Actions to deploy API Gateway"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "apigateway:*",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutRetentionPolicy"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

# Policy for DynamoDB management
resource "aws_iam_policy" "dynamodb_manage" {
  name        = "github-actions-dynamodb-manage"
  description = "Policy for GitHub Actions to manage DynamoDB tables"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:CreateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeTable",
          "dynamodb:UpdateTable",
          "dynamodb:ListTables",
          "dynamodb:CreateGlobalSecondaryIndex",
          "dynamodb:UpdateGlobalSecondaryIndex",
          "dynamodb:DeleteGlobalSecondaryIndex",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
          "dynamodb:ListTagsOfResource"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/todo-copilot-*"
      }
    ]
  })

  tags = var.common_tags
}

# Policy for CloudWatch Alarms management
resource "aws_iam_policy" "cloudwatch_manage" {
  name        = "github-actions-cloudwatch-manage"
  description = "Policy for GitHub Actions to manage CloudWatch Alarms"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricAlarm",
          "cloudwatch:DeleteAlarms",
          "cloudwatch:DescribeAlarms",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "cloudwatch:TagResource",
          "cloudwatch:UntagResource",
          "cloudwatch:ListTagsForResource"
        ]
        Resource = "*"
      }
    ]
  })

  tags = var.common_tags
}

# Policy for IAM role management
resource "aws_iam_policy" "iam_role_management" {
  name        = "github-actions-iam-role-management"
  description = "Policy for GitHub Actions to manage IAM roles"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:UpdateAssumeRolePolicy",
          "iam:ListRolePolicies",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListPolicyVersions",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:PassRole",
          "iam:TagRole"
        ]
        Resource = [
          "arn:aws:iam::*:role/lambda-execution-*",
          "arn:aws:iam::*:role/github-actions-*",
          "arn:aws:iam::*:policy/github-actions-*"
        ]
      }
    ]
  })

  tags = var.common_tags
}

# Attach policies to development role
resource "aws_iam_role_policy_attachment" "dev_terraform_state" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.terraform_state_access.arn
}

resource "aws_iam_role_policy_attachment" "dev_lambda_deploy" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.lambda_deploy.arn
}

resource "aws_iam_role_policy_attachment" "dev_api_gateway" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.api_gateway_deploy.arn
}

resource "aws_iam_role_policy_attachment" "dev_dynamodb" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.dynamodb_manage.arn
}

resource "aws_iam_role_policy_attachment" "dev_cloudwatch" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.cloudwatch_manage.arn
}

resource "aws_iam_role_policy_attachment" "dev_iam_role_mgmt" {
  role       = aws_iam_role.github_actions_dev.name
  policy_arn = aws_iam_policy.iam_role_management.arn
}

# Attach policies to staging role
resource "aws_iam_role_policy_attachment" "staging_terraform_state" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.terraform_state_access.arn
}

resource "aws_iam_role_policy_attachment" "staging_lambda_deploy" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.lambda_deploy.arn
}

resource "aws_iam_role_policy_attachment" "staging_api_gateway" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.api_gateway_deploy.arn
}

resource "aws_iam_role_policy_attachment" "staging_dynamodb" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.dynamodb_manage.arn
}

resource "aws_iam_role_policy_attachment" "staging_cloudwatch" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.cloudwatch_manage.arn
}

resource "aws_iam_role_policy_attachment" "staging_iam_role_mgmt" {
  role       = aws_iam_role.github_actions_staging.name
  policy_arn = aws_iam_policy.iam_role_management.arn
}

# Attach policies to production role
resource "aws_iam_role_policy_attachment" "prod_terraform_state" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.terraform_state_access.arn
}

resource "aws_iam_role_policy_attachment" "prod_lambda_deploy" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.lambda_deploy.arn
}

resource "aws_iam_role_policy_attachment" "prod_api_gateway" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.api_gateway_deploy.arn
}

resource "aws_iam_role_policy_attachment" "prod_dynamodb" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.dynamodb_manage.arn
}

resource "aws_iam_role_policy_attachment" "prod_cloudwatch" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.cloudwatch_manage.arn
}

resource "aws_iam_role_policy_attachment" "prod_iam_role_mgmt" {
  role       = aws_iam_role.github_actions_prod.name
  policy_arn = aws_iam_policy.iam_role_management.arn
}
