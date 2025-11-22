# LocalStack Integration Guide: 本番デプロイ前の統合テスト

**目的**: AWS 本番環境にデプロイする前に LocalStack でリソース・ワークフロー全体を検証  
**推奨タイミング**: 本番デプロイ前最終ステップ  
**所要時間**: 30-45 分

---

## 前提条件

### 必須ツール

- Docker & Docker Compose
- Terraform CLI (v1.5.0+)
- AWS CLI (v2+)
- Node.js (v18+)

### インストール確認

```bash
docker --version
docker-compose --version
terraform version
aws --version
node --version
```

---

## ステップ 1: LocalStack セットアップ

### 1.1 docker-compose.yml 作成

`infrastructure/docker-compose.yml` を作成：

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    container_name: localstack-todo-copilot
    ports:
      - "4566:4566"              # LocalStack Gateway
      - "4571:4571"              # Lambda
      - "4585:4585"              # API Gateway
      - "8055:8055"              # DynamoDB Admin
    environment:
      - SERVICES=s3,dynamodb,lambda,apigateway,iam,logs,cloudwatch
      - DEBUG=1
      - DOCKER_HOST=unix:///var/run/docker.sock
      - AWS_DEFAULT_REGION=ap-northeast-1
      - AWS_ACCESS_KEY_ID=test
      - AWS_SECRET_ACCESS_KEY=test
      - LAMBDA_DOCKER_NETWORK=host
    volumes:
      - "${TMPDIR}:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
    networks:
      - localstack-network

  dynamodb-admin:
    image: aaronshaf/dynamodb-admin:latest
    container_name: dynamodb-admin
    ports:
      - "8001:8001"
    environment:
      - DYNAMODB_ENDPOINT=http://localstack:8000
    depends_on:
      - localstack
    networks:
      - localstack-network

networks:
  localstack-network:
    driver: bridge
```

### 1.2 LocalStack 起動

```bash
cd infrastructure

# LocalStack コンテナ起動
docker-compose up -d

# ヘルスチェック（30秒待機）
sleep 30

# LocalStack が起動しているか確認
docker ps | grep localstack
```

### 1.3 接続テスト

```bash
# LocalStack エンドポイント
export LOCALSTACK_ENDPOINT=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-northeast-1

# AWS CLI で LocalStack に接続
aws s3 ls --endpoint-url $LOCALSTACK_ENDPOINT

# 出力: (empty list または既存バケット)
```

---

## ステップ 2: LocalStack での Backend 準備

### 2.1 S3 バケット作成

```bash
export LOCALSTACK_ENDPOINT=http://localhost:4566

# Terraform state 用 S3 バケット
aws s3api create-bucket \
  --bucket todo-copilot-terraform-state \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

# バケット確認
aws s3 ls --endpoint-url $LOCALSTACK_ENDPOINT
```

### 2.2 DynamoDB Lock Table 作成

```bash
aws dynamodb create-table \
  --table-name todo-copilot-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $LOCALSTACK_ENDPOINT
```

### 2.3 backend.tf の編集（LocalStack 用）

ファイル: `infrastructure/terraform/backend.tf`

**本番用と LocalStack 用を分ける方法：**

オプション A: 環境変数で backend を切り替える（推奨）

```hcl
terraform {
  backend "s3" {
    bucket         = var.backend_bucket
    key            = "${var.environment}/terraform.tfstate"
    region         = var.aws_region
    dynamodb_table = var.backend_table
    encrypt        = true
    skip_credentials_validation = var.use_localstack
    skip_requesting_account_id  = var.use_localstack
    endpoints = var.use_localstack ? {
      s3       = var.localstack_endpoint
      dynamodb = var.localstack_endpoint
    } : null
  }
}

variable "backend_bucket" {
  default = "todo-copilot-terraform-state"
}

variable "backend_table" {
  default = "todo-copilot-terraform-locks"
}

variable "localstack_endpoint" {
  default = "http://localhost:4566"
}

variable "use_localstack" {
  type    = bool
  default = false
}
```

**ただし、backend block では variables が使用できないため、以下の方法が推奨：**

オプション B: 環境変数で backend を上書き（最も簡単）

```bash
# LocalStack 用初期化
export TF_BACKEND_CONFIG_BUCKET="todo-copilot-terraform-state"
export TF_BACKEND_CONFIG_DYNAMODB_TABLE="todo-copilot-terraform-locks"
export TF_BACKEND_CONFIG_SKIP_CREDENTIALS_VALIDATION="true"
export TF_BACKEND_CONFIG_SKIP_REGION_VALIDATION="true"

terraform init \
  -backend-config="bucket=$TF_BACKEND_CONFIG_BUCKET" \
  -backend-config="dynamodb_table=$TF_BACKEND_CONFIG_DYNAMODB_TABLE" \
  -backend-config="skip_credentials_validation=true"
```

---

## ステップ 3: LocalStack での Terraform Plan

### 3.1 環境変数設定

```bash
export LOCALSTACK_ENDPOINT=http://localhost:4566
export AWS_ENDPOINT_URL=$LOCALSTACK_ENDPOINT
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-northeast-1
```

### 3.2 Provider 設定（LocalStack 対応）

ファイル: `infrastructure/terraform/main.tf`

```hcl
provider "aws" {
  region = var.aws_region

  # LocalStack を使用する場合
  endpoints {
    dynamodb   = var.use_localstack ? var.localstack_endpoint : null
    lambda     = var.use_localstack ? var.localstack_endpoint : null
    apigateway = var.use_localstack ? var.localstack_endpoint : null
    iam        = var.use_localstack ? var.localstack_endpoint : null
    logs       = var.use_localstack ? var.localstack_endpoint : null
    s3         = var.use_localstack ? var.localstack_endpoint : null
  }

  skip_credentials_validation = var.use_localstack
  skip_region_validation      = var.use_localstack
  skip_requesting_account_id  = var.use_localstack
}

variable "use_localstack" {
  type    = bool
  default = false
}

variable "localstack_endpoint" {
  type    = string
  default = "http://localhost:4566"
}
```

### 3.3 Plan 実行

```bash
cd infrastructure/terraform

# 初期化
terraform init -reconfigure

# LocalStack 用 Dev Environment Plan
terraform plan \
  -var-file=environments/dev.tfvars \
  -var="use_localstack=true" \
  -var="localstack_endpoint=$LOCALSTACK_ENDPOINT" \
  -out=plan-localstack-dev.tfplan
```

---

## ステップ 4: LocalStack での Apply

### 4.1 Apply 実行

```bash
terraform apply plan-localstack-dev.tfplan
```

**出力例**
```
Apply complete! Resources: 25 added, 0 changed, 0 destroyed.
```

### 4.2 リソース確認

```bash
# Lambda 関数確認
aws lambda list-functions \
  --endpoint-url $LOCALSTACK_ENDPOINT \
  --region ap-northeast-1 \
  --query 'Functions[*].{FunctionName:FunctionName,Runtime:Runtime}'

# DynamoDB テーブル確認
aws dynamodb list-tables \
  --endpoint-url $LOCALSTACK_ENDPOINT

# API Gateway 確認
aws apigateway get-rest-apis \
  --endpoint-url $LOCALSTACK_ENDPOINT

# IAM ロール確認
aws iam list-roles \
  --endpoint-url $LOCALSTACK_ENDPOINT
```

---

## ステップ 5: LocalStack での統合テスト

### 5.1 環境変数設定（テスト用）

```bash
export LOCALSTACK_ENDPOINT=http://localhost:4566
export AWS_REGION=ap-northeast-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export DYNAMODB_TABLE_NAME=todos-dev
export LAMBDA_FUNCTION_NAME=todo-copilot-create-dev
```

### 5.2 統合テスト実行

```bash
cd /workspaces/todo-copilot

# AWS 統合テスト
npm test -- aws-integration.spec.ts

# E2E テスト（必要に応じて）
npm run test:e2e
```

**期待される出力**
```
Test Suites: 2 passed, 0 skipped
Tests:       50+ passed, 28 skipped
```

---

## ステップ 6: LocalStack での検証スクリプト

### 6.1 Post-Deploy Verification（LocalStack 対応版）

スクリプト: `infrastructure/scripts/verify-localstack.sh`

```bash
#!/bin/bash

set -e

ENDPOINT="http://localhost:4566"
REGION="ap-northeast-1"

echo "🔍 LocalStack 検証開始..."

# DynamoDB テーブル確認
echo "✅ DynamoDB テーブル確認"
aws dynamodb list-tables \
  --endpoint-url $ENDPOINT \
  --region $REGION

# Lambda 関数確認
echo "✅ Lambda 関数確認"
aws lambda list-functions \
  --endpoint-url $ENDPOINT \
  --region $REGION \
  --query 'Functions[*].FunctionName'

# API Gateway 確認
echo "✅ API Gateway 確認"
aws apigateway get-rest-apis \
  --endpoint-url $ENDPOINT \
  --query 'items[*].name'

# Lambda テスト呼び出し
echo "✅ Lambda テスト呼び出し"
aws lambda invoke \
  --function-name todo-copilot-create-dev \
  --payload '{"title":"Test"}' \
  --endpoint-url $ENDPOINT \
  response.json

echo "📊 LocalStack 検証完了"
```

### 6.2 検証スクリプト実行

```bash
bash infrastructure/scripts/verify-localstack.sh
```

---

## ステップ 7: LocalStack から本番環境への移行チェックリスト

デプロイ前に以下を確認：

| 項目 | LocalStack | 本番 AWS | チェック |
|------|-----------|---------|---------|
| Terraform init | ✅ | ⏳ | - |
| Terraform plan | ✅ | ⏳ | リソース数同じ か？ |
| Terraform apply | ✅ | ⏳ | - |
| Lambda 関数作成 | ✅ | ⏳ | - |
| DynamoDB テーブル | ✅ | ⏳ | - |
| API Gateway | ✅ | ⏳ | - |
| CRUD 操作 | ✅ | ⏳ | - |
| ログ出力 | ✅ | ⏳ | - |
| エラーハンドリング | ✅ | ⏳ | - |

---

## トラブルシューティング

### 問題: LocalStack に接続できない

```bash
# LocalStack ステータス確認
docker ps | grep localstack

# ログ確認
docker logs localstack-todo-copilot

# 再起動
docker-compose restart
```

### 問題: Lambda 実行エラー

```bash
# Lambda ログ確認
aws logs tail /aws/lambda/todo-copilot-dev-* \
  --endpoint-url http://localhost:4566 \
  --follow
```

### 問題: State Lock が解放されない

```bash
# Lock テーブルをクリア
aws dynamodb scan \
  --table-name todo-copilot-terraform-locks \
  --endpoint-url http://localhost:4566 \
  --query 'Items[*].LockID.S' \
  --output text | xargs -I {} \
  aws dynamodb delete-item \
    --table-name todo-copilot-terraform-locks \
    --key "{\"LockID\":{\"S\":\"${}\"}" \
    --endpoint-url http://localhost:4566
```

---

## クリーンアップ

デプロイ完了後、LocalStack を停止：

```bash
# コンテナ停止
docker-compose down

# または完全削除
docker-compose down -v
```

---

## 本番環境への移行

LocalStack テストが全て通ったら、以下の手順で本番環境にデプロイ：

1. AWS 認証情報を設定
2. S3 backend バケット作成
3. DynamoDB lock table 作成
4. `terraform init -reconfigure`
5. `terraform plan -var-file=environments/prod.tfvars`
6. `terraform apply`

詳細は `PRODUCTION_DEPLOYMENT.md` を参照。

---

**Last Updated**: 2025-11-22
