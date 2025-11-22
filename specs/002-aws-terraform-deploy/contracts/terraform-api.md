# Contract: Terraform API

**Feature**: AWS上でTerraformを利用してTodo アプリケーションをデプロイするための準備  
**Feature Branch**: `002-aws-terraform-deploy`  
**Created**: 2025-11-22  
**Type**: Infrastructure as Code API Contract

---

## 1. Overview

Terraform コマンドとその入出力仕様。

### Purpose
- Terraform の初期化、計画、適用、破棄操作のスキーマ定義
- 入力 (tfvars) と出力 (state, outputs) の正確な契約
- 複数環境でのコマンドライン操作の標準化

### Scope
- Terraform CLI 1.6.x
- AWS Provider 5.x
- S3 + DynamoDB バックエンド

---

## 2. Input Schema (tfvars)

### 2.1 Environment Variables File

#### Filename Convention
```
environments/
├── dev.tfvars
├── staging.tfvars
└── prod.tfvars
```

#### File Format (HCL)
```hcl
# environments/prod.tfvars

# Project Configuration
environment         = "prod"
aws_region          = "ap-northeast-1"
project_name        = "todo-copilot"

# Lambda Configuration
lambda_memory_size        = 1024    # MB
lambda_timeout            = 300     # seconds
lambda_ephemeral_storage  = 512     # MB

# DynamoDB Configuration
dynamodb_billing_mode = "PAY_PER_REQUEST"

# CloudWatch Configuration
cloudwatch_log_retention_days = 365

# Owner Configuration
owner_email = "devops@example.com"

# Common Tags
common_tags = {
  Project     = "todo-copilot"
  Environment = "prod"
  CostCenter  = "engineering"
  Owner       = "devops@example.com"
}
```

### 2.2 Variables Schema

```typescript
interface TerraformInputVariables {
  // Required
  environment: "dev" | "staging" | "prod";
  aws_region: string;              // e.g., "ap-northeast-1"
  
  // Optional (with defaults)
  project_name?: string;           // Default: "todo-copilot"
  
  // Lambda Configuration
  lambda_memory_size?: number;     // Default: 256|512|1024 (env-based)
  lambda_timeout?: number;         // Default: 30|60|300 (env-based)
  lambda_ephemeral_storage?: number; // Default: 512 MB
  
  // DynamoDB Configuration
  dynamodb_billing_mode?: "PROVISIONED" | "PAY_PER_REQUEST";
  
  // CloudWatch Configuration
  cloudwatch_log_retention_days?: number; // Default: 7|30|365 (env-based)
  
  // Tagging
  common_tags?: Record<string, string>;
  owner_email?: string;
}
```

### 2.3 Validation Rules

```hcl
variable "environment" {
  validation {
    condition = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod"
  }
}

variable "lambda_memory_size" {
  validation {
    condition = contains([128, 256, 512, 1024, 2048, 3008, 5120, 10240], var.lambda_memory_size)
    error_message = "lambda_memory_size must be a valid Lambda memory value"
  }
}

variable "lambda_timeout" {
  validation {
    condition = var.lambda_timeout > 0 && var.lambda_timeout <= 900
    error_message = "lambda_timeout must be between 1 and 900 seconds"
  }
}

variable "cloudwatch_log_retention_days" {
  validation {
    condition = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.cloudwatch_log_retention_days)
    error_message = "cloudwatch_log_retention_days must be a valid CloudWatch retention value"
  }
}
```

---

## 3. Terraform Commands

### 3.1 terraform init

初期化コマンド：バックエンド設定、プロバイダーダウンロード、モジュール初期化。

#### Command Format
```bash
terraform init \
  -backend-config="bucket=todo-copilot-terraform-state-${ENVIRONMENT}" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=ap-northeast-1" \
  -backend-config="dynamodb_table=terraform-lock-${ENVIRONMENT}" \
  -backend-config="encrypt=true"
```

#### Expected Output
```
Initializing the backend...
Successfully configured the backend "s3"!

Initializing provider plugins...
- Finding latest version of hashicorp/aws...
- Installing hashicorp/aws v5.x.x...

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that would be made to your infrastructure. If you will ever delete this
working directory or switch back to a different backend for this workspace, you will
need to run "terraform init" again to reinitialize your working directory with the
original backend configuration.
```

#### Exit Code Behavior
```
0: Success
1: Backend initialization error
2: Provider download error
64: Initialization already done (no changes)
```

---

### 3.2 terraform plan

計画コマンド：予定されている変更を表示。

#### Command Format
```bash
terraform plan \
  -var-file=environments/${ENVIRONMENT}.tfvars \
  -out=terraform-${ENVIRONMENT}.tfplan
```

#### Expected Output (stdout)
```
Terraform will perform the following actions:

  # aws_lambda_function.main will be created
  + resource "aws_lambda_function" "main" {
      + architectures                = ["arm64"]
      + description                  = (known after apply)
      + environment                  = {
          + variables = {
              + DYNAMODB_TABLE = "todo-copilot-prod"
              + ENVIRONMENT    = "prod"
            }
        }
      + filename                     = "dist/index.zip"
      + function_name                = "todo-copilot-api-prod"
      + handler                      = "dist/index.handler"
      + memory_size                  = 1024
      + role                         = (known after apply)
      + runtime                      = "nodejs18.x"
      + timeout                      = 300
    }

  # aws_dynamodb_table.todos will be created
  + resource "aws_dynamodb_table" "todos" {
      + arn              = (known after apply)
      + billing_mode     = "PAY_PER_REQUEST"
      + hash_key         = "id"
      + name             = "todo-copilot-prod"
      + stream_arn       = (known after apply)
      + stream_enabled   = true
      + stream_view_type = "NEW_AND_OLD_IMAGES"
      + tags             = {
          + "Environment" = "prod"
          + "Project"     = "todo-copilot"
        }

      + ttl {
          + attribute_name = "expiresAt"
          + enabled        = true
        }
    }

Plan: 12 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + api_gateway_endpoint    = (known after apply)
  + dynamodb_table_name     = (known after apply)
  + lambda_function_arn     = (known after apply)
```

#### Plan File Format
```
terraform-${ENVIRONMENT}.tfplan (バイナリ形式)
- 計画されたリソース変更を保存
- `terraform apply` で再利用可能
- 一度限りの利用が推奨
```

#### Exit Code Behavior
```
0: No changes
1: Error
2: Changes detected (差分あり)
```

---

### 3.3 terraform apply

適用コマンド：計画されたリソース変更を実行。

#### Command Format (Normal)
```bash
terraform apply \
  terraform-${ENVIRONMENT}.tfplan
```

#### Command Format (Auto-approve, CI/CD用)
```bash
terraform apply \
  -auto-approve \
  -var-file=environments/${ENVIRONMENT}.tfvars \
  -lock=true \
  -lock-timeout=30s
```

#### Expected Output (stdout)
```
aws_iam_role.lambda_execution: Creating...
aws_iam_role.lambda_execution: Creation complete after 1s [id=lambda-execution-prod]

aws_iam_role_policy.lambda_execution: Creating...
aws_iam_role_policy.lambda_execution: Creation complete after 0s [id=lambda-execution-prod:lambda-execution-policy-prod]

aws_lambda_function.main: Creating...
aws_lambda_function.main: Creation complete after 2s [id=todo-copilot-api-prod]

aws_dynamodb_table.todos: Creating...
aws_dynamodb_table.todos: Creation complete after 5s [id=todo-copilot-prod]

aws_cloudwatch_log_group.lambda_logs: Creating...
aws_cloudwatch_log_group.lambda_logs: Creation complete after 0s [id=/aws/lambda/todo-copilot-api-prod]

Apply complete! Resources: 7 added, 0 changed, 0 destroyed.

Outputs:

api_gateway_endpoint = "https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod"
dynamodb_table_name = "todo-copilot-prod"
lambda_function_arn = "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api-prod"
```

#### Lock Behavior
```
- `-lock=true`: State ロック取得（デフォルト）
- `-lock-timeout=30s`: ロック取得失敗時に最大30秒待機
- ロック情報は DynamoDB terraform-lock-${ENVIRONMENT} テーブルに保存
- リソース作成完了後に自動的にロック解放
```

#### Exit Code Behavior
```
0: Success
1: Error (State ロック失敗、リソース作成失敗など)
```

---

### 3.4 terraform destroy

破棄コマンド：すべてのリソースを削除。

#### Command Format (確認付き)
```bash
terraform destroy \
  -var-file=environments/${ENVIRONMENT}.tfvars
```

#### Command Format (Auto-approve, CI/CD用)
```bash
terraform destroy \
  -auto-approve \
  -var-file=environments/${ENVIRONMENT}.tfvars \
  -lock=true \
  -lock-timeout=30s
```

#### Expected Output (stdout)
```
aws_cloudwatch_log_group.lambda_logs: Destroying... [id=/aws/lambda/todo-copilot-api-prod]
aws_lambda_function.main: Destroying... [id=todo-copilot-api-prod]
aws_dynamodb_table.todos: Destroying... [id=todo-copilot-prod]
aws_apigatewayv2_stage.prod: Destroying... [id=prod]
aws_apigatewayv2_api.main: Destroying... [id=xxxxxxxxxxx]
aws_iam_role_policy.lambda_execution: Destroying... [id=lambda-execution-prod:lambda-execution-policy-prod]
aws_iam_role.lambda_execution: Destroying... [id=lambda-execution-prod]

Destroy complete! Resources: 7 destroyed.
```

#### Exit Code Behavior
```
0: Success
1: Error
```

---

## 4. Output Schema

### 4.1 Terraform Outputs (stdout)

```typescript
interface TerraformOutputs {
  // Lambda
  lambda_function_arn: {
    value: string;           // "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api-prod"
    description: string;     // "ARN of the Lambda function"
  };
  
  lambda_function_name: {
    value: string;           // "todo-copilot-api-prod"
    description: string;
  };
  
  // API Gateway
  api_gateway_endpoint: {
    value: string;           // "https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod"
    description: string;
  };
  
  api_gateway_id: {
    value: string;           // "xxxxxxxxxxx"
    description: string;
  };
  
  // DynamoDB
  dynamodb_table_name: {
    value: string;           // "todo-copilot-prod"
    description: string;
  };
  
  dynamodb_table_arn: {
    value: string;           // "arn:aws:dynamodb:ap-northeast-1:ACCOUNT:table/todo-copilot-prod"
    description: string;
  };
  
  // CloudWatch
  log_group_name: {
    value: string;           // "/aws/lambda/todo-copilot-api-prod"
    description: string;
  };
}
```

### 4.2 State File Schema

```json
{
  "version": 4,
  "terraform_version": "1.6.0",
  "serial": 42,
  "lineage": "uuid",
  "outputs": {
    "api_gateway_endpoint": {
      "value": "https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod",
      "type": "string",
      "sensitive": false
    },
    "dynamodb_table_name": {
      "value": "todo-copilot-prod",
      "type": "string",
      "sensitive": false
    },
    "lambda_function_arn": {
      "value": "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api-prod",
      "type": "string",
      "sensitive": false
    }
  },
  "resources": [
    {
      "mode": "managed",
      "type": "aws_lambda_function",
      "name": "main",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "arn": "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api-prod",
            "filename": "dist/index.zip",
            "function_name": "todo-copilot-api-prod",
            "handler": "dist/index.handler",
            "memory_size": 1024,
            "role": "arn:aws:iam::ACCOUNT:role/lambda-execution-prod",
            "runtime": "nodejs18.x",
            "timeout": 300
          }
        }
      ]
    }
  ]
}
```

### 4.3 JSON Output Format

```bash
terraform output -json
```

#### JSON Response Schema
```json
{
  "api_gateway_endpoint": {
    "type": "string",
    "value": "https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod",
    "sensitive": false
  },
  "dynamodb_table_name": {
    "type": "string",
    "value": "todo-copilot-prod",
    "sensitive": false
  },
  "lambda_function_arn": {
    "type": "string",
    "value": "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-copilot-api-prod",
    "sensitive": false
  }
}
```

---

## 5. Error Handling

### 5.1 Common Errors

| Error | Cause | Resolution |
|-------|-------|-----------|
| `error initializing backend` | Backend config incorrect | Check S3 bucket, DynamoDB table, region |
| `Error: Error acquiring the state lock` | Lock timeout exceeded | Check DynamoDB lock table, verify concurrent operations |
| `Error: Error reading state` | S3 state file corrupted | Restore from S3 version history |
| `Error: ValidationError` | Invalid input variables | Check tfvars file syntax, validate variable values |

### 5.2 Error Exit Codes

```
0: Success
1: General error (initialization, validation, plan, apply failed)
2: Differences found (plan detected changes)
64: Lock acquisition error
```

---

## 6. CI/CD Integration

### 6.1 GitHub Actions Pipeline

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - run: terraform init -backend-config="..."
      - run: terraform plan -var-file=environments/prod.tfvars -out=plan.tfplan
      - run: terraform show -json plan.tfplan > plan.json
  
  apply:
    needs: plan
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - run: terraform apply -auto-approve plan.tfplan
```

---

**Version**: 1.0  
**Last Updated**: 2025-11-22  
**Next Contract**: Lambda API (T011)
