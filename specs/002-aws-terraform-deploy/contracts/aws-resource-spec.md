# Contract: AWS Resource Specification

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Type**: AWS Resource Configuration Contract

---

## 1. Overview

AWS リソースの完全な仕様定義：Lambda、API Gateway、DynamoDB。

### Purpose
- 各AWSリソースの設定仕様
- パラメータ制約と検証ルール
- 環境別設定バリエーション

### Scope
- AWS Lambda (Compute)
- API Gateway v2 (API)
- DynamoDB (Data)
- CloudWatch Logs (Monitoring)
- IAM Roles & Policies (Security)

---

## 2. AWS Lambda Specification

### 2.1 Lambda Function Configuration

#### Terraform Resource
```hcl
resource "aws_lambda_function" "main" {
  filename            = "dist/index.zip"
  function_name       = "todo-copilot-api-${var.environment}"
  role               = aws_iam_role.lambda_execution.arn
  handler            = "dist/index.handler"
  runtime            = "nodejs18.x"
  architectures      = ["arm64"]
  timeout            = var.lambda_timeout
  memory_size        = var.lambda_memory_size
  ephemeral_storage {
    size = 512  # MB
  }
  
  source_code_hash = filebase64sha256("dist/index.zip")
  
  environment {
    variables = {
      ENVIRONMENT      = var.environment
      DYNAMODB_TABLE   = aws_dynamodb_table.todos.name
      LOG_LEVEL        = var.environment == "prod" ? "INFO" : "DEBUG"
      AWS_REGION       = var.aws_region
      NODE_ENV         = "production"
    }
  }
  
  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }
  
  layers = var.environment == "prod" ? [
    aws_lambda_layer_version.dependencies.arn
  ] : []
  
  tags = merge(
    var.common_tags,
    {
      Component = "API"
      Runtime   = "nodejs18.x"
    }
  )
  
  depends_on = [
    aws_iam_role_policy.lambda_execution
  ]
}
```

#### Configuration Parameters

| Parameter | Value | Constraint | Notes |
|-----------|-------|-----------|-------|
| **function_name** | `todo-copilot-api-{env}` | Max 64 chars | Unique per region |
| **runtime** | nodejs18.x | Fixed | Latest stable |
| **handler** | dist/index.handler | Fixed | TypeScript compiled |
| **memory_size** | 256/512/1024 | 128-10240 MB | Environment-based |
| **timeout** | 30/60/300 | 1-900 seconds | Environment-based |
| **architectures** | arm64 | Fixed | Graviton2 processor |
| **ephemeral_storage** | 512 | 512-10240 MB | Fixed allocation |
| **tracing_config** | Active/PassThrough | Boolean | X-Ray enabled for prod |

#### Environment-Specific Settings

```hcl
# Dev Environment
environment = "dev"
lambda_memory_size = 256
lambda_timeout = 30
tracing_mode = "PassThrough"
layers = []
log_retention = 7

# Staging Environment
environment = "staging"
lambda_memory_size = 512
lambda_timeout = 60
tracing_mode = "PassThrough"
layers = [aws_lambda_layer_version.dependencies.arn]
log_retention = 30

# Production Environment
environment = "prod"
lambda_memory_size = 1024
lambda_timeout = 300
tracing_mode = "Active"
layers = [aws_lambda_layer_version.dependencies.arn]
log_retention = 365
```

### 2.2 Lambda Layer (Dependency Layer)

```hcl
resource "aws_lambda_layer_version" "dependencies" {
  filename   = "layers/dependencies.zip"
  layer_name = "todo-copilot-dependencies-${var.environment}"
  
  source_code_hash = filebase64sha256("layers/dependencies.zip")
  
  compatible_runtimes = ["nodejs18.x"]
  compatible_architectures = ["arm64"]
}

# Layer Structure
# dependencies.zip:
# └─ nodejs/
#    └─ node_modules/
#       ├─ @aws-sdk/ (AWS SDK v3)
#       ├─ zod/      (Validation)
#       ├─ winston/  (Logging)
#       └─ ...other dependencies
```

### 2.3 Lambda Permissions

```hcl
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}
```

---

## 3. API Gateway Specification

### 3.1 HTTP API Configuration

#### Terraform Resource (API)
```hcl
resource "aws_apigatewayv2_api" "main" {
  name             = "todo-copilot-api-${var.environment}"
  protocol_type    = "HTTP"
  description      = "API Gateway for Todo Copilot ${var.environment}"
  
  cors_configuration {
    allow_origins = [
      "https://todo-copilot.example.com",
      "http://localhost:3000"  # dev のみ
    ]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = [
      "content-type",
      "authorization",
      "x-request-id"
    ]
    expose_headers = [
      "x-request-id",
      "x-total-count"
    ]
    max_age = 300
    allow_credentials = true
  }
  
  tags = var.common_tags
}
```

#### Integration (Lambda)
```hcl
resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  target           = aws_lambda_function.main.arn
  payload_format_version = "2.0"  # HTTP format
}

# Route: $default (catch-all)
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# Explicit Routes (optional, for clarity)
resource "aws_apigatewayv2_route" "get_todos" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /todos"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "post_todos" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /todos"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "delete_todos" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /todos/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}
```

### 3.2 Deployment & Stage

```hcl
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  stage_class = "STANDARD"  # "STANDARD" or "PREMIUM"
  
  auto_deploy = true
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
      error          = "$context.error.messageString"
    })
  }
  
  default_route_settings {
    logging_level = var.environment == "prod" ? "ERROR" : "INFO"
    data_trace_enabled = var.environment == "prod" ? false : true
    throttle_settings {
      burst_limit = var.environment == "prod" ? 5000 : 1000
      rate_limit  = var.environment == "prod" ? 2000 : 100
    }
  }
  
  tags = var.common_tags
}

# Domain Name (optional)
resource "aws_apigatewayv2_domain_name" "main" {
  domain_name = "api-${var.environment}.example.com"
  
  domain_name_configuration {
    certificate_arn = aws_acm_certificate.main.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.main.id
  stage       = aws_apigatewayv2_stage.prod.name
}
```

#### Endpoint Format

```
HTTP Endpoint (auto-generated):
https://<api-id>.execute-api.ap-northeast-1.amazonaws.com/prod

Custom Domain Endpoint:
https://api-prod.example.com
```

---

## 4. DynamoDB Specification

### 4.1 Table Configuration

#### Terraform Resource
```hcl
resource "aws_dynamodb_table" "todos" {
  name           = "todo-copilot-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"  # String
  }
  
  attribute {
    name = "userId"
    type = "S"
  }
  
  attribute {
    name = "createdAt"
    type = "S"  # ISO 8601 string
  }
  
  # Global Secondary Index
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  
  # TTL Configuration
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
  
  # Stream Configuration
  stream_specification {
    stream_view_type = "NEW_AND_OLD_IMAGES"
  }
  
  # Point-in-Time Recovery
  point_in_time_recovery_specification {
    enabled = var.environment == "prod"
  }
  
  # Encryption
  server_side_encryption_specification {
    enabled     = true
    kms_key_arn = var.environment == "prod" ? aws_kms_key.dynamodb.arn : null
  }
  
  tags = merge(
    var.common_tags,
    {
      Component = "Data"
      BackupPolicy = "DAILY"
    }
  )
  
  depends_on = [
    aws_iam_role_policy.dynamodb_service_role
  ]
}
```

#### Configuration Parameters

| Parameter | Value | Constraint | Notes |
|-----------|-------|-----------|-------|
| **billing_mode** | PAY_PER_REQUEST | Fixed | On-demand pricing |
| **hash_key** | id | String | Partition key |
| **attributes** | id, userId, createdAt | Min 2 | For indexes |
| **ttl** | expiresAt | Enabled | Auto-deletion |
| **stream** | NEW_AND_OLD_IMAGES | Enabled | For Lambda integration |
| **pitr** | Enabled | prod only | Point-in-time recovery |
| **encryption** | KMS | prod only | At-rest encryption |

### 4.2 On-Demand Billing

```
Read Pricing:
- $0.25 per million read units
- 1 read unit = 4KB read

Write Pricing:
- $1.25 per million write units
- 1 write unit = 1KB write

Estimated Monthly Cost:
- Read heavy (10M reads/month): ~$2.50
- Write heavy (1M writes/month): ~$1.25
- Total: ~$3-5/month
```

### 4.3 Backup Strategy

```hcl
# On-Demand Backup
resource "aws_dynamodb_table_backup" "todo_backup" {
  table_name = aws_dynamodb_table.todos.name
  backup_name = "todo-backup-${formatdate("YYYY-MM-DD", timestamp())}"
  
  tags = var.common_tags
}

# Backup Vault (Backup service integration)
resource "aws_backup_plan" "dynamodb" {
  name = "todo-copilot-backup-${var.environment}"
  
  rule {
    rule_name         = "daily_backup"
    target_backup_vault_name = aws_backup_vault.dynamodb.name
    schedule          = "cron(0 5 ? * * *)"  # 5 AM JST
    start_window      = 60
    completion_window = 120
    
    lifecycle {
      delete_after = var.environment == "prod" ? 30 : 7
    }
  }
}
```

---

## 5. CloudWatch Logs Specification

### 5.1 Log Group Configuration

```hcl
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/todo-copilot-api-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_days
  kms_key_id        = var.environment == "prod" ? aws_kms_key.logs.arn : null
  
  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/todo-copilot-${var.environment}"
  retention_in_days = var.cloudwatch_log_retention_days
  
  tags = var.common_tags
}
```

#### Retention Periods

| Environment | Days | Cost (approx) | Use Case |
|-------------|------|---------------|----------|
| dev | 7 | ~$0.10 | Quick debugging |
| staging | 30 | ~$0.50 | Testing audit |
| prod | 365 | ~$5-10 | Compliance, analysis |

### 5.2 Log Insights Queries

```sql
-- Errors in last hour
fields @timestamp, @message, @logStream
| filter @message like /error/i
| stats count() by @logStream

-- Lambda duration statistics
fields @duration
| stats avg(@duration), max(@duration), pct(@duration, 95)

-- API Gateway latency
fields integrationLatency, status
| filter ispresent(integrationLatency)
| stats avg(integrationLatency) by status
```

---

## 6. IAM Roles & Policies

### 6.1 Lambda Execution Role

```hcl
resource "aws_iam_role" "lambda_execution" {
  name = "lambda-execution-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
  
  tags = var.common_tags
}

# Policy: DynamoDB Access
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "lambda-dynamodb-${var.environment}"
  role = aws_iam_role.lambda_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.todos.arn,
          "${aws_dynamodb_table.todos.arn}/index/*"
        ]
      }
    ]
  })
}

# Policy: CloudWatch Logs
resource "aws_iam_role_policy" "lambda_logs" {
  name = "lambda-logs-${var.environment}"
  role = aws_iam_role.lambda_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.lambda_logs.arn}:*"
      }
    ]
  })
}

# Policy: X-Ray (prod only)
resource "aws_iam_role_policy" "lambda_xray" {
  count = var.environment == "prod" ? 1 : 0
  name  = "lambda-xray-${var.environment}"
  role  = aws_iam_role.lambda_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### 6.2 Terraform Execution Role

```hcl
resource "aws_iam_role" "terraform_executor" {
  name = "terraform-executor-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::ACCOUNT:root"
          Service = "codepipeline.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = var.terraform_external_id
          }
        }
      }
    ]
  })
}

# Policy: Allow Terraform operations
resource "aws_iam_role_policy" "terraform_policy" {
  name = "terraform-policy-${var.environment}"
  role = aws_iam_role.terraform_executor.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          "${aws_s3_bucket.terraform_state.arn}/*",
          "${aws_dynamodb_table.terraform_lock.arn}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:DeleteFunction",
          "apigateway:CreateRestApi",
          "dynamodb:CreateTable",
          "iam:PassRole"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      }
    ]
  })
}
```

---

## 7. Monitoring & Alarms

### 7.1 CloudWatch Alarms

```hcl
# Lambda Duration Alarm
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "todo-copilot-lambda-duration-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = var.environment == "prod" ? 5000 : 10000  # ms
  alarm_description   = "Alert if Lambda duration exceeds threshold"
  
  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }
}

# DynamoDB Throttling Alarm
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttle" {
  alarm_name          = "todo-copilot-dynamodb-throttle-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ConsumedWriteCapacityUnits"
  namespace           = "AWS/DynamoDB"
  period              = "60"
  statistic           = "Sum"
  threshold           = 100000  # Units
  alarm_description   = "Alert if DynamoDB write capacity exceeded"
  
  dimensions = {
    TableName = aws_dynamodb_table.todos.name
  }
}
```

---

**Version**: 1.0  
**Last Updated**: 2025-11-22  
**Next Phase**: Quick Start Guide (T013-T016)
