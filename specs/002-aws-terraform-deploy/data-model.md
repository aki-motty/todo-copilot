# Data Model: AWS Terraform デプロイシステム

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Version**: 1.0

---

## 1. Terraform State Model

### 1.1 State Structure

Terraform state ファイルは、デプロイされたAWSリソースの現在の状態を表現します。

#### State File Hierarchy
```
terraform.tfstate (S3 に保存)
├── version: 4
├── terraform_version: "1.6.0"
├── serial: 42
├── lineage: "uuid"
├── outputs:
│   ├── api_gateway_endpoint: "https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod"
│   ├── lambda_function_arn: "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api-prod"
│   └── dynamodb_table_name: "todo-copilot-prod"
├── resources:
│   ├── aws_lambda_function
│   ├── aws_dynamodb_table
│   ├── aws_apigatewayv2_api
│   ├── aws_cloudwatch_log_group
│   └── aws_iam_role
└── check_results: []
```

#### State Metadata
```hcl
# State files の属性
{
  "version": 4,                    # State file format version
  "terraform_version": "1.6.0",    # Terraform バージョン
  "serial": 42,                    # 変更シーケンス番号
  "lineage": "uuid",               # State lineage ID (復旧用)
  "backend": {                     # Backend 設定
    "type": "s3",
    "config": {
      "bucket": "todo-copilot-terraform-state-prod",
      "key": "terraform.tfstate",
      "region": "ap-northeast-1",
      "dynamodb_table": "terraform-lock-prod",
      "encrypt": true
    }
  }
}
```

### 1.2 Resource Catalog

State ファイルで管理されるリソース一覧。

#### AWS Lambda Resources
```hcl
resource_type: "aws_lambda_function"
resource_id: "todo_copilot_api"

attributes: {
  function_name: "todo-copilot-api-{environment}"
  runtime: "nodejs18.x"
  handler: "dist/index.handler"
  memory_size: 256|512|1024    # 環境別
  timeout: 30|60|300           # 環境別
  ephemeral_storage: 512       # MB
  environment: {
    variables: {
      DYNAMODB_TABLE: "todo-copilot-{environment}"
      LOG_LEVEL: "INFO|DEBUG"
      ENVIRONMENT: "dev|staging|prod"
    }
  }
  role: "arn:aws:iam::ACCOUNT:role/lambda-execution-{environment}"
  source_code_hash: "sha256-xxxxx"  # 自動更新
  architectures: ["arm64"]      # Graviton2
  package_type: "Zip"           # or Docker
  timeout: 30
  tracing_config: {
    mode: "Active"              # X-Ray 有効化（本番環境）
  }
  tags: {
    Environment: "dev|staging|prod"
    Project: "todo-copilot"
    ManagedBy: "terraform"
  }
}
```

#### AWS DynamoDB Resources
```hcl
resource_type: "aws_dynamodb_table"
resource_id: "todo_table"

attributes: {
  name: "todo-copilot-{environment}"
  billing_mode: "PAY_PER_REQUEST"  # On-demand
  hash_key: "id"                   # Partition key
  range_key: "null"                # Sort key なし
  
  attribute: [
    {
      name: "id"
      type: "S"                    # String
    },
    {
      name: "userId"
      type: "S"
    },
    {
      name: "createdAt"
      type: "S"                    # ISO 8601
    }
  ]
  
  global_secondary_index: [
    {
      name: "UserIdIndex"
      hash_key: "userId"
      projection: {
        type: "ALL"                # すべてのアトリビュート投影
      }
    }
  ]
  
  ttl: {
    attribute_name: "expiresAt"
    enabled: true                  # 有効期限機能
  }
  
  point_in_time_recovery: {
    enabled: true                  # PITR（バックアップ）
  }
  
  tags: {
    Environment: "dev|staging|prod"
    Project: "todo-copilot"
  }
  
  stream_specification: {
    stream_enabled: true
    stream_view_type: "NEW_AND_OLD_IMAGES"
  }
}
```

#### AWS API Gateway Resources
```hcl
resource_type: "aws_apigatewayv2_api"
resource_id: "todo_api"

attributes: {
  name: "todo-copilot-api-{environment}"
  protocol_type: "HTTP"            # HTTP (REST でなく HTTP)
  target: "arn:aws:lambda:...:function:todo-copilot-api-{environment}"
  
  cors_configuration: {
    allow_origins: ["https://todo-copilot.example.com"]
    allow_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers: ["content-type", "authorization"]
    expose_headers: ["x-request-id"]
    max_age: 300
  }
  
  tags: {
    Environment: "dev|staging|prod"
  }
}
```

#### AWS CloudWatch Logs Resources
```hcl
resource_type: "aws_cloudwatch_log_group"
resource_id: "lambda_logs"

attributes: {
  name: "/aws/lambda/todo-copilot-api-{environment}"
  retention_in_days: 7|30|365       # 環境別
  kms_key_arn: "null|arn:aws:kms:..."  # 本番環境は KMS
}
```

#### AWS IAM Resources
```hcl
resource_type: "aws_iam_role"
resource_id: "lambda_execution_role"

attributes: {
  name: "lambda-execution-{environment}"
  assume_role_policy: {
    Version: "2012-10-17"
    Statement: [
      {
        Effect: "Allow"
        Principal: { Service: "lambda.amazonaws.com" }
        Action: "sts:AssumeRole"
      }
    ]
  }
}

resource_type: "aws_iam_role_policy"
resource_id: "lambda_execution_policy"

attributes: {
  role: "lambda-execution-{environment}"
  policy: {
    Version: "2012-10-17"
    Statement: [
      {
        Effect: "Allow"
        Action: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"]
        Resource: "arn:aws:dynamodb:...:table/todo-copilot-{environment}"
      },
      {
        Effect: "Allow"
        Action: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource: "arn:aws:logs:..."
      }
    ]
  }
}
```

### 1.3 Environment State Variants

各環境ごとの状態差異を明示します。

#### State Differences by Environment

| Attribute | dev | staging | prod |
|-----------|-----|---------|------|
| **Lambda Memory** | 256 MB | 512 MB | 1024 MB |
| **Lambda Timeout** | 30 sec | 60 sec | 300 sec |
| **DynamoDB Billing** | PAY_PER_REQUEST | PAY_PER_REQUEST | PAY_PER_REQUEST |
| **Log Retention** | 7 days | 30 days | 365 days |
| **X-Ray Tracing** | Disabled | Disabled | Enabled |
| **PITR** | Disabled | Enabled | Enabled |
| **KMS Encryption** | N/A | N/A | Enabled |
| **VPC Endpoint** | No | No | Yes |
| **CloudWatch Alarms** | Basic | Standard | Advanced |
| **Environment Variables** | DEBUG=true | DEBUG=false | DEBUG=false |

---

## 2. DynamoDB Application Model

### 2.1 Entity Definition

#### Todo Entity

```typescript
// ドメイン設計に基づくエンティティ
interface TodoEntity {
  // Partition Key
  id: string;                    // UUID (s3://path/to/file)
  
  // Sort Key
  userId: string;                // User ID (GSI で参照可能)
  
  // Attributes
  title: string;                 // Todo タイトル (制限: 1-255文字)
  description?: string;          // 説明 (制限: 0-1000文字)
  completed: boolean;            // 完了状態
  
  // Metadata
  createdAt: string;             // ISO 8601形式 (例: "2025-11-22T10:30:00Z")
  updatedAt: string;             // ISO 8601形式
  completedAt?: string;          // 完了時刻 (null = 未完了)
  
  // TTL
  expiresAt?: number;            // Unix timestamp (削除対象マーク)
  
  // Tags
  tags?: string[];               // タグリスト (制限: 0-10個)
  priority?: "low" | "medium" | "high";
}
```

#### DynamoDB Todo Table Schema

```hcl
# Partition Key: id (String, 最大サイズ)
# Sort Key: userId (String, クエリ最適化)

# Primary Index
PRIMARY_KEY = (id)
SORT_KEY = (userId)  # 将来的な複数ユーザーサポート

# Global Secondary Indexes (GSI)
GSI1:
  PartitionKey: userId (String)
  SortKey: createdAt (String)
  Projection: ALL
  Usage: ユーザーのTodo一覧取得、作成日時順ソート

# Attributes
Attributes:
  - id (String, PK): UUID
  - userId (String, SK): ユーザーID
  - title (String): Todo タイトル
  - description (String, optional): 説明
  - completed (Boolean): 完了フラグ
  - createdAt (String): 作成時刻 (ISO 8601)
  - updatedAt (String): 更新時刻 (ISO 8601)
  - completedAt (String, optional): 完了時刻 (ISO 8601)
  - tags (List, optional): タグリスト
  - priority (String, optional): 優先度 (low/medium/high)
  - expiresAt (Number, optional): TTL用 (Unix timestamp)

# TTL Configuration
TTL Attribute: expiresAt
Enable: true
Retention: 自動削除

# Throughput (On-Demand)
BillingMode: PAY_PER_REQUEST
  - Write: $1.25 per million
  - Read: $0.25 per million
```

### 2.2 DynamoDB Indexes Strategy

#### Global Secondary Index (GSI) Design

```
GSI1: UserIdIndex
  Partition Key: userId
  Sort Key: createdAt
  Projection: ALL
  
  Use Case: ユーザーの全Todoを時系列で取得
  Query: GetUserTodos(userId: "user123")
  Result: [Todo, Todo, Todo] (createdAt 昇順)
  
  Cost: 読み取り1回 = ~0.25/百万 on-demand
```

#### TTL Configuration

```
Attribute Name: expiresAt
Format: Unix Timestamp (seconds)
Behavior:
  - 指定時刻を過ぎたら自動削除
  - 削除までの遅延: 最大48時間
  - 計算式: new Date().getTime() / 1000 + 86400 * 30
  
Use Case: アーカイブ化したタスクの自動削除
```

### 2.3 Access Patterns (Query Pattern)

```typescript
// Query 1: Todo を ID で取得
GetTodoById(id: string) -> Todo | null
Query: GET /api/todos/:id
DynamoDB: GetItem(Key: { id })
Cost: 1 read capacity

// Query 2: ユーザーの全 Todo を取得
GetUserTodos(userId: string, limit?: number) -> Todo[]
Query: GET /api/users/:userId/todos
DynamoDB: Query(KeyConditionExpression: userId = ?, ProjectionExpression: ALL)
Cost: 1 read capacity + 返却件数

// Query 3: 完了状態のフィルタリング
QueryTodosByStatus(userId: string, completed: boolean) -> Todo[]
Query: GET /api/users/:userId/todos?status=completed
DynamoDB: Query + FilterExpression (completed = true)
Cost: 1 read capacity + 返却件数

// Mutation 1: Todo 作成
CreateTodo(title: string, userId: string) -> Todo
Mutation: POST /api/todos
DynamoDB: PutItem(Item: { id, userId, title, ... })
Cost: 1 write capacity

// Mutation 2: Todo 更新
UpdateTodo(id: string, updates: Partial<Todo>) -> Todo
Mutation: PUT /api/todos/:id
DynamoDB: UpdateItem(Key: { id }, AttributeUpdates: {...})
Cost: 1 write capacity

// Mutation 3: Todo 削除
DeleteTodo(id: string) -> void
Mutation: DELETE /api/todos/:id
DynamoDB: DeleteItem(Key: { id })
Cost: 1 write capacity
```

---

## 3. Configuration Model

### 3.1 Backend Configuration

Terraform バックエンド設定の仕様。

#### S3 Backend Config Structure

```hcl
terraform {
  backend "s3" {
    bucket           = "todo-copilot-terraform-state-${environment}"
    key              = "terraform.tfstate"
    region           = "ap-northeast-1"
    dynamodb_table   = "terraform-lock-${environment}"
    encrypt          = true
    acl              = "private"
    skip_credentials_validation = false
  }
}
```

#### DynamoDB Lock Table Schema

```
Table Name: terraform-lock-${environment}
Partition Key: LockID (String)

Item Structure:
{
  LockID: { S: "terraform-lock-{bucket}/{key}" }
  Digest: { S: "sha256-hash" }
  Operation: { S: "OperationTypeApply" }
  Info: { S: "user@hostname.2025-11-22T10:30:00Z" }
  Who: { S: "CI-Runner-1" }
  Version: { N: "1.6.0" }
  Created: { S: "2025-11-22T10:30:00Z" }
}

Billing Mode: On-demand (PAY_PER_REQUEST)
TTL: None (ロック解放時に自動削除)
```

### 3.2 Provider Configuration

AWS Provider 設定の仕様。

```hcl
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "todo-copilot"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }

  assume_role {
    role_arn          = var.terraform_role_arn
    session_name      = "terraform-${var.environment}"
    duration_seconds  = 3600
    external_id       = var.terraform_external_id
  }
}
```

### 3.3 Tag Strategy

すべてのリソースに付与する共通タグ。

```hcl
locals {
  common_tags = {
    Project      = "todo-copilot"
    Environment  = var.environment
    ManagedBy    = "Terraform"
    CreatedDate  = formatdate("YYYY-MM-DD", timestamp())
    Owner        = var.owner_email
  }
}

# 全リソースに適用
resource "aws_lambda_function" "main" {
  ...
  tags = merge(
    local.common_tags,
    {
      Component = "API"
      Runtime   = "nodejs18.x"
    }
  )
}
```

#### Tag Conventions

| Tag Name | Format | Example | Scope |
|----------|--------|---------|-------|
| Project | string | todo-copilot | すべてのリソース |
| Environment | dev/staging/prod | prod | すべてのリソース |
| ManagedBy | terraform/manual | terraform | Terraform 管理リソース |
| Component | API/Data/Monitoring | API | 機能別 |
| Owner | email | team@example.com | チーム追跡用 |
| CostCenter | string | engineering | 予算管理用 |

---

## 4. Variable Registry

### 4.1 Input Variables

Terraform input variables の完全なスキーマ。

```hcl
# Environment & Region
variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for resources"
  default     = "ap-northeast-1"
}

variable "project_name" {
  type        = string
  description = "Project name for resource naming"
  default     = "todo-copilot"
}

# Lambda Configuration
variable "lambda_memory_size" {
  type        = number
  description = "Lambda function memory in MB"
  default = {
    dev     = 256
    staging = 512
    prod    = 1024
  }[var.environment]
}

variable "lambda_timeout" {
  type        = number
  description = "Lambda function timeout in seconds"
  default = {
    dev     = 30
    staging = 60
    prod    = 300
  }[var.environment]
}

# DynamoDB Configuration
variable "dynamodb_billing_mode" {
  type        = string
  description = "DynamoDB billing mode"
  default     = "PAY_PER_REQUEST"  # On-demand
}

# CloudWatch Configuration
variable "cloudwatch_log_retention_days" {
  type        = number
  description = "CloudWatch Logs retention in days"
  default = {
    dev     = 7
    staging = 30
    prod    = 365
  }[var.environment]
}

# Tag Configuration
variable "common_tags" {
  type        = map(string)
  description = "Common tags for all resources"
  default     = {}
}

variable "owner_email" {
  type        = string
  description = "Owner email for resource tagging"
  default     = "devops@example.com"
}
```

### 4.2 Output Values

Terraform outputs の仕様。

```hcl
# Lambda Outputs
output "lambda_function_arn" {
  value       = aws_lambda_function.main.arn
  description = "ARN of the Lambda function"
}

output "lambda_function_name" {
  value       = aws_lambda_function.main.function_name
  description = "Name of the Lambda function"
}

output "lambda_role_arn" {
  value       = aws_iam_role.lambda_execution.arn
  description = "ARN of the Lambda execution role"
  sensitive   = false
}

# API Gateway Outputs
output "api_gateway_endpoint" {
  value       = aws_apigatewayv2_stage.prod.invoke_url
  description = "API Gateway endpoint URL"
}

output "api_gateway_id" {
  value       = aws_apigatewayv2_api.main.id
  description = "API Gateway ID"
}

# DynamoDB Outputs
output "dynamodb_table_name" {
  value       = aws_dynamodb_table.todos.name
  description = "DynamoDB table name"
}

output "dynamodb_table_arn" {
  value       = aws_dynamodb_table.todos.arn
  description = "DynamoDB table ARN"
}

# CloudWatch Outputs
output "log_group_name" {
  value       = aws_cloudwatch_log_group.lambda_logs.name
  description = "CloudWatch Logs group name"
}

# Backend Outputs
output "state_bucket" {
  value       = aws_s3_bucket.terraform_state.id
  description = "S3 bucket for Terraform state"
}

output "lock_table_name" {
  value       = aws_dynamodb_table.terraform_lock.name
  description = "DynamoDB table for state locking"
}
```

---

## 5. Data Flow Diagram

### 5.1 Request Flow

```
HTTP Request (API Gateway)
    ↓
API Gateway (HTTP)
    ↓
Lambda Function (Node.js 18.x)
    ├─ Parse Request
    ├─ Validate Input
    ├─ Build Query/Mutation
    └─ DynamoDB Query
         ↓
    DynamoDB Table
         ↓
    Lambda Response
    ↓
API Gateway Response
    ↓
HTTP Response (JSON)
```

### 5.2 State Flow

```
Terraform Plan
    ↓
Load: S3 -> current state
    ↓
Compare: current state vs desired state
    ↓
DynamoDB: Acquire Lock
    ↓
Terraform Apply
    ├─ Create/Update/Delete AWS Resources
    └─ Update state file
    ↓
DynamoDB: Release Lock
    ↓
S3: Write new state
    └─ Versioning: Keep history
```

---

## 6. Constraints & Constraints

### 6.1 Limits

| リソース | 制限 | 対策 |
|---------|------|------|
| Lambda | 256-10240 MB | 環境別にメモリ設定 |
| DynamoDB | 項目サイズ 400KB | Gzip 圧縮検討 |
| API Gateway | 29秒タイムアウト | Lambda タイムアウト < 29秒 |
| State File | 10GB | 定期的なクリーンアップ |

### 6.2 Validation Rules

```hcl
# Environment validation
lifecycle {
  precondition {
    condition = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Invalid environment"
  }
}

# Lambda memory validation
lifecycle {
  precondition {
    condition     = contains([128, 256, 512, 1024], var.lambda_memory_size)
    error_message = "Lambda memory must be valid value"
  }
}

# DynamoDB table name validation
lifecycle {
  precondition {
    condition     = can(regex("^[a-z0-9_-]{3,255}$", aws_dynamodb_table.todos.name))
    error_message = "Table name must be 3-255 chars, alphanumeric+dash+underscore"
  }
}
```

---

**Version**: 1.0  
**Last Updated**: 2025-11-22  
**Next Phase**: API Contracts Definition (T010-T012)
