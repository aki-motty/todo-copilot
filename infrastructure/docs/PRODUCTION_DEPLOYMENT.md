# Production Deployment Guide: AWS 本番デプロイ手順書

**対象**: AWS への実本番環境デプロイ  
**推奨環境**: Dev → Staging → Prod（段階的デプロイ）  
**実装日**: 2025-11-22

---

## 目次

1. [前提条件](#前提条件)
2. [認証・バックエンド準備](#認証バックエンド準備)
3. [ローカル検証](#ローカル検証)
4. [Plan & Review](#plan--review)
5. [Apply（リソース作成）](#applyリソース作成)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必須ツール

```bash
# Terraform CLI (v1.5.0 以上)
terraform version

# AWS CLI (v2 以上)
aws --version

# Node.js (v18 以上)
node --version

# オプション: Lint & セキュリティツール
tflint --version
checkov --version
```

### AWS IAM 準備

**本番環境の場合は必ず実施してください**

#### ステップ 1: Terraform 実行専用 IAM ロール作成

AWS Management Console または AWS CLI で以下を実行：

```bash
# ロール作成（Terraform がこのロールで API 呼び出しを実行）
aws iam create-role \
  --role-name todo-copilot-terraform-admin \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::<YOUR_ACCOUNT_ID>:root"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# ポリシー作成（最小権限原則に従う）
aws iam put-role-policy \
  --role-name todo-copilot-terraform-admin \
  --policy-name todo-copilot-terraform-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:*",
          "dynamodb:*",
          "lambda:*",
          "apigateway:*",
          "iam:*",
          "logs:*",
          "ec2:DescribeVpcs",
          "ec2:DescribeSecurityGroups"
        ],
        "Resource": "*"
      }
    ]
  }'
```

#### ステップ 2: AWS CLI プロファイル設定

```bash
# AWS credentials 設定
aws configure --profile terraform-admin

# または環境変数
export AWS_PROFILE=terraform-admin
export AWS_REGION=ap-northeast-1
```

#### ステップ 3: 認証確認

```bash
aws sts get-caller-identity --profile terraform-admin
# 出力例:
# {
#     "UserId": "AIDAJ...",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/terraform-admin"
# }
```

---

## 認証・バックエンド準備

### ステップ 1: S3 Backend Bucket 作成（初回のみ）

```bash
# 環境変数設定
export AWS_PROFILE=terraform-admin
export AWS_REGION=ap-northeast-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET_NAME="todo-copilot-terraform-backend-${ACCOUNT_ID}"

# S3 Bucket 作成（暗号化・バージョニング有効）
aws s3api create-bucket \
  --bucket "${BUCKET_NAME}" \
  --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1

# 暗号化設定
aws s3api put-bucket-encryption \
  --bucket "${BUCKET_NAME}" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

# バージョニング有効化
aws s3api put-bucket-versioning \
  --bucket "${BUCKET_NAME}" \
  --versioning-configuration Status=Enabled

# Public Access Block
aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### ステップ 2: DynamoDB Lock Table 作成（初回のみ）

```bash
aws dynamodb create-table \
  --table-name todo-copilot-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1

# 作成確認
aws dynamodb describe-table \
  --table-name todo-copilot-terraform-locks \
  --region ap-northeast-1 \
  --query 'Table.{Name:TableName,Status:TableStatus}'
```

### ステップ 3: backend.tf の確認

ファイル: `infrastructure/terraform/backend.tf`

```hcl
terraform {
  backend "s3" {
    bucket         = "todo-copilot-terraform-backend-<ACCOUNT_ID>"
    key            = "terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "todo-copilot-terraform-locks"
    encrypt        = true
  }
}
```

**アカウント ID を現在のアカウントに置き換えてください**

---

## ローカル検証

### ステップ 1: Terraform 構文検証

```bash
cd infrastructure/terraform

# フォーマット確認
terraform fmt -check

# 初期化（Backend なし）
terraform init -backend=false

# バリデーション
terraform validate
# 出力: Success! The configuration is valid.
```

### ステップ 2: Lint & セキュリティスキャン

```bash
# TFLint
tflint --init
tflint

# Checkov
checkov -d . --framework terraform

# Jest Module Tests
npm test -- terraform-modules.spec.ts
```

### ステップ 3: ユニットテスト実行

```bash
npm run type-check
npm test
# 出力: Test Suites: 19 passed, 1 skipped
#      Tests:       338 passed, 28 skipped
```

---

## Plan & Review

### ステップ 1: Backend 初期化

```bash
export AWS_PROFILE=terraform-admin
export AWS_REGION=ap-northeast-1

cd infrastructure/terraform

# Backend を使用して初期化
terraform init -reconfigure
```

### ステップ 2: Workspace 作成・選択

```bash
# 各環境用 workspace を作成
terraform workspace new dev || terraform workspace select dev
terraform workspace new staging || terraform workspace select staging
terraform workspace new prod || terraform workspace select prod

# 現在の workspace 確認
terraform workspace list
```

### ステップ 3: Plan 実行（各環境）

#### Dev 環境

```bash
terraform workspace select dev
terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan

# Plan 内容を確認
terraform show plan-dev.tfplan | head -100
```

#### Staging 環境

```bash
terraform workspace select staging
terraform plan -var-file=environments/staging.tfvars -out=plan-staging.tfplan
```

#### Prod 環境

```bash
terraform workspace select prod
terraform plan -var-file=environments/prod.tfvars -out=plan-prod.tfplan
```

### ステップ 4: Plan のレビュー

以下の項目を確認：

```bash
# リソース数・変更の確認
terraform show -json plan-prod.tfplan | jq '.resource_changes[] | {type, change: .change.actions}'

# IAM ロール・ポリシーの確認
terraform show -json plan-prod.tfplan | jq '.resource_changes[] | select(.type=="aws_iam_role")'

# DynamoDB テーブルの確認
terraform show -json plan-prod.tfplan | jq '.resource_changes[] | select(.type=="aws_dynamodb_table")'

# Lambda 関数の確認
terraform show -json plan-prod.tfplan | jq '.resource_changes[] | select(.type=="aws_lambda_function")'
```

---

## Apply（リソース作成）

### ⚠️ 注意事項

- **必ず Dev 環境から開始してください**
- **Prod 環境への Apply は 2 人以上の承認が推奨**
- **Apply 前に Plan 出力をもう一度確認してください**
- **破壊的変更がないことを確認してください**

### ステップ 1: Dev Apply

```bash
export AWS_PROFILE=terraform-admin
cd infrastructure/terraform

terraform workspace select dev

# Apply 前の最終確認
terraform show plan-dev.tfplan | grep "Plan:"

# Apply 実行
terraform apply plan-dev.tfplan
```

**出力例**
```
Apply complete! Resources: 25 added, 0 changed, 0 destroyed.
```

### ステップ 2: Dev リソース確認

```bash
# Lambda 関数確認
aws lambda list-functions --region ap-northeast-1 --query 'Functions[?contains(FunctionName, `todo`)]'

# DynamoDB テーブル確認
aws dynamodb list-tables --region ap-northeast-1

# API Gateway 確認
aws apigateway get-rest-apis --region ap-northeast-1

# Terraform State 確認
terraform state list | head -20
```

### ステップ 3: Staging & Prod Apply

同じ手順で Staging → Prod の順で Apply を実行します。

```bash
# Staging
terraform workspace select staging
terraform apply plan-staging.tfplan

# Prod
terraform workspace select prod
terraform apply plan-prod.tfplan
```

---

## Post-Deployment Verification

### ステップ 1: 検証スクリプト実行

```bash
# デプロイメント検証
bash infrastructure/scripts/verify-deployment.sh

# 出力例:
# ✅ DynamoDB テーブル確認: OK
# ✅ Lambda 関数確認: OK
# ✅ API Gateway 確認: OK
# ✅ CloudWatch Logs: OK
```

### ステップ 2: Constitution Check

```bash
bash infrastructure/scripts/constitution-check.sh

# 目標: 71+ / 82 チェック合格
```

### ステップ 3: E2E テスト

```bash
# Playwright E2E テスト（本番環境が起動している場合）
npm run test:e2e

# 出力: All tests passed
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 問題 1: `Error: No valid credential sources found`

**原因**: AWS 認証情報が設定されていない

**解決方法**
```bash
aws configure --profile terraform-admin
export AWS_PROFILE=terraform-admin
```

#### 問題 2: `Error: Error acquiring the lock`

**原因**: DynamoDB Lock Table が存在しないまたはアクセス権限がない

**解決方法**
```bash
# Lock Table 確認
aws dynamodb describe-table --table-name todo-copilot-terraform-locks

# ロック状態確認
aws dynamodb scan --table-name todo-copilot-terraform-locks
```

#### 問題 3: `Error: failed to read schema for provider`

**原因**: Terraform プロバイダプラグインが古い、または互換性がない

**解決方法**
```bash
terraform init -upgrade
```

#### 問題 4: State ファイルの競合（複数ユーザーが同時実行）

**原因**: DynamoDB Lock が機能していない

**解決方法**
```bash
# Lock 強制解除（最後の手段）
aws dynamodb delete-item \
  --table-name todo-copilot-terraform-locks \
  --key '{"LockID":{"S":"<environment>/<resource-name>"}}'
```

### ログ確認コマンド

```bash
# Terraform Debug ログ
export TF_LOG=DEBUG
terraform plan -var-file=environments/prod.tfvars 2>&1 | tee terraform-debug.log

# AWS API コール確認（CloudTrail）
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=Lambda

# Lambda 実行ログ
aws logs tail /aws/lambda/todo-copilot-dev --follow
```

---

## Rollback 手順

**緊急時のロールバック方法**

### ステップ 1: 前のバージョンの State に戻す

```bash
export AWS_PROFILE=terraform-admin
cd infrastructure/terraform

# State ファイルのバージョン確認
aws s3api list-object-versions \
  --bucket todo-copilot-terraform-backend-<ACCOUNT_ID> \
  --prefix prod/terraform.tfstate

# 前のバージョンを復元
aws s3api get-object \
  --bucket todo-copilot-terraform-backend-<ACCOUNT_ID> \
  --key prod/terraform.tfstate \
  --version-id <VERSION_ID> \
  terraform.tfstate.backup

# Local state を復元
mv terraform.tfstate.backup terraform.tfstate

# Terraform destroy（リソース削除）
terraform destroy -var-file=environments/prod.tfvars
```

### ステップ 2: 復旧確認

```bash
bash infrastructure/scripts/verify-deployment.sh
# リソースが削除されたことを確認
```

---

## 継続的なメンテナンス

### 定期タスク

- **週 1 回**: `terraform state list` で State 確認
- **月 1 回**: Cost Optimization レビュー
- **月 1 回**: Security Group・IAM ポリシーレビュー
- **四半期 1 回**: Disaster Recovery テスト

### ドキュメント

詳細は以下を参照：

- **Backend 管理**: `BACKEND.md`
- **Disaster Recovery**: `DISASTER_RECOVERY.md`
- **トラブルシューティング**: `TROUBLESHOOTING.md`
- **環境設定**: `ENVIRONMENTS.md`

---

**Last Updated**: 2025-11-22  
**Next Review**: After first production deployment
