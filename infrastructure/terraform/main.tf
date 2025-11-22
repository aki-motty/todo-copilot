# Terraform Configuration - Main

terraform {
  required_version = ">= 1.6"

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
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedDate = formatdate("YYYY-MM-DD", timestamp())
    }
  }
}

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
}

# Backend Module - S3 + DynamoDB + IAM
module "backend" {
  source = "./modules/backend"

  environment = var.environment
  aws_region  = var.aws_region
  common_tags = local.common_tags
}

# Data Module - DynamoDB Table
module "data" {
  source = "./modules/data"

  environment  = var.environment
  project_name = var.project_name
  common_tags  = local.common_tags
}

# IAM Module - Lambda Execution Role
module "iam" {
  source = "./modules/iam"

  environment              = var.environment
  aws_region               = var.aws_region
  dynamodb_table_arn       = module.data.dynamodb_table_arn
  cloudwatch_log_group_arn = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/*"
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
  lambda_execution_role_arn = module.iam.lambda_execution_role_arn
  project_name              = var.project_name
  common_tags               = local.common_tags
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
