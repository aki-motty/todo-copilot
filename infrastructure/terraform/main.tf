# Terraform Configuration - Main

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configured via -backend-config flag during init
  # Example: terraform init -backend-config=backend-config.hcl
  backend "s3" {
    # Configuration is provided via -backend-config=backend-config.hcl
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Local values
locals {
  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.common_tags
  )

  lambda_execution_role_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/lambda-execution-${var.environment}"
}

# Data Module - DynamoDB Table
module "data" {
  source = "./modules/data"

  environment  = var.environment
  project_name = var.project_name
  common_tags  = local.common_tags
}

# IAM Module - Roles & Policies
module "iam" {
  source = "./modules/iam"

  environment              = var.environment
  aws_region               = var.aws_region
  dynamodb_table_arn       = module.data.dynamodb_table_arn
  cloudwatch_log_group_arn = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-api-${var.environment}"
  common_tags              = local.common_tags
}

# Compute Module - Lambda + API Gateway
module "compute" {
  source = "./modules/compute"

  environment               = var.environment
  aws_region                = var.aws_region
  lambda_memory_size        = var.lambda_memory_size
  lambda_timeout            = var.lambda_timeout
  dynamodb_table_name       = module.data.dynamodb_table_name
  lambda_execution_role_arn = local.lambda_execution_role_arn
  project_name              = var.project_name
  common_tags               = local.common_tags
}

# Frontend Module - S3 + CloudFront
module "frontend" {
  source = "./modules/frontend"

  environment  = var.environment
  project_name = var.project_name
  common_tags  = local.common_tags
}
