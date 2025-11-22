# Compute Module - Lambda & API Gateway

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "ap-northeast-1"
}

variable "lambda_memory_size" {
  type        = number
  description = "Lambda memory in MB"
  default     = 256
}

variable "lambda_timeout" {
  type        = number
  description = "Lambda timeout in seconds"
  default     = 30
}

variable "dynamodb_table_name" {
  type        = string
  description = "DynamoDB table name for Lambda"
}

variable "lambda_execution_role_arn" {
  type        = string
  description = "IAM role ARN for Lambda execution"
}

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "todo-copilot"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags"
  default     = {}
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-api-${var.environment}"
  retention_in_days = var.environment == "prod" ? 365 : var.environment == "staging" ? 30 : 7

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-lambda-logs"
      Component = "Compute"
    }
  )
}

# Placeholder Lambda function (actual implementation in Phase 2)
resource "aws_lambda_function" "main" {
  filename      = "dist/index.zip"
  function_name = "${var.project_name}-api-${var.environment}"
  role          = var.lambda_execution_role_arn
  handler       = "dist/index.handler"
  runtime       = "nodejs18.x"
  architectures = ["arm64"]
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      DYNAMODB_TABLE = var.dynamodb_table_name
      LOG_LEVEL      = var.environment == "prod" ? "INFO" : "DEBUG"
      NODE_ENV       = "production"
    }
  }

  tracing_config {
    mode = var.environment == "prod" ? "Active" : "PassThrough"
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-api"
      Component = "Compute"
      Runtime   = "nodejs18.x"
    }
  )

  # Note: Lambda code must be provided before applying
  # For now, using a placeholder that will fail if code is not present
  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
}

# API Gateway HTTP API
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "API Gateway for Todo Copilot ${var.environment}"

  cors_configuration {
    allow_origins = [
      "https://todo-copilot.example.com",
      var.environment != "prod" ? "http://localhost:3000" : ""
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
    max_age           = 300
    allow_credentials = true
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-api"
      Component = "Compute"
    }
  )
}

# Lambda integration with API Gateway
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  payload_format_version = "2.0"
  integration_uri        = aws_lambda_function.main.invoke_arn
}

# Default route ($default)
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# API Gateway stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      ip                 = "$context.identity.sourceIp"
      requestTime        = "$context.requestTime"
      httpMethod         = "$context.httpMethod"
      resourcePath       = "$context.resourcePath"
      status             = "$context.status"
      protocol           = "$context.protocol"
      responseLength     = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
      error              = "$context.error.messageString"
    })
  }

  default_route_settings {
    logging_level      = var.environment == "prod" ? "ERROR" : "INFO"
    data_trace_enabled = var.environment == "prod" ? false : true
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-stage"
      Component = "Compute"
    }
  )
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 365 : var.environment == "staging" ? 30 : 7

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.project_name}-api-logs"
      Component = "Compute"
    }
  )
}

# Lambda permission for API Gateway to invoke
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}

output "api_gateway_endpoint" {
  value       = aws_apigatewayv2_stage.prod.invoke_url
  description = "API Gateway endpoint URL"
}

output "lambda_function_arn" {
  value       = aws_lambda_function.main.arn
  description = "Lambda function ARN"
}

output "lambda_function_name" {
  value       = aws_lambda_function.main.function_name
  description = "Lambda function name"
}
