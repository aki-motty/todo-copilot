# Terraform Backend Management

**Document**: Terraform 状態管理とバックエンド構成ガイド  
**Target Audience**: DevOps エンジニア、Terraform 管理者  
**Last Updated**: 2025-11-22  
**Version**: 1.0

---

## 概要

本ドキュメントでは、Terraform 状態ファイルの管理、バックエンド構成、トラブルシューティングについて詳細に説明します。

---

## バックエンド構成

### アーキテクチャ

```
┌─────────────────────────────────────┐
│        Developer / CI/CD            │
│     (terraform apply/destroy)       │
└────────────┬────────────────────────┘
             │
             ├─→ Lock Request
             │
             ▼
┌──────────────────────────┐
│  DynamoDB Lock Table     │
│  (terraform-lock-{env})  │
│                          │
│  PK: LockID              │
│  TTL: ExpirationTime     │
└──────────────────────────┘
             ▲
             │
    DynamoDB Lease
    (30秒ポーリング)
             │
             ▼
┌──────────────────────────┐
│   S3 Backend Bucket      │
│  (terraform-state-{env}) │
│                          │
│  - terraform.tfstate     │
│  - Version History       │
│  - Encryption (AES256)   │
└──────────────────────────┘
             ▲
             │
      State Sync
             │
    Terraform Code
```

### 構成ファイル

**root/main.tf**:
```hcl
terraform {
  backend "s3" {
    # 環境に応じた設定
    # init.sh スクリプトで -backend-config で上書き
  }
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.common_tags
  }
}
```

**backend configuration** (init.sh で設定):
```bash
terraform init \
  -backend-config="bucket=todo-copilot-terraform-state-dev" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=ap-northeast-1" \
  -backend-config="dynamodb_table=terraform-lock-dev" \
  -backend-config="encrypt=true"
```

---

## 状態ファイル管理

### 状態ファイルの構造

```json
{
  "version": 4,
  "terraform_version": "1.6.0",
  "serial": 42,
  "lineage": "e1b43f7d-1234-5678-9abc-def0123456789",
  "outputs": {
    "api_endpoint": {
      "value": "https://xxx.execute-api.ap-northeast-1.amazonaws.com/dev",
      "type": "string",
      "sensitive": false
    }
  },
  "resources": [
    {
      "mode": "managed",
      "type": "aws_lambda_function",
      "name": "todo_api",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "arn": "arn:aws:lambda:ap-northeast-1:ACCOUNT:function:todo-api-dev",
            "function_name": "todo-api-dev",
            "handler": "index.handler",
            ...
          }
        }
      ]
    }
  ]
}
```

### 状態ファイルの確認

```bash
# 現在の状態を表示
terraform state list

# 特定のリソースの詳細確認
terraform state show aws_lambda_function.todo_api

# 出力値の確認
terraform output

# JSON 形式で出力
terraform output -json | jq
```

---

## S3 バックエンド管理

### バケット設定

```bash
# バージョニングの確認
aws s3api get-bucket-versioning \
  --bucket todo-copilot-terraform-state-dev

# バージョン履歴の表示
aws s3api list-object-versions \
  --bucket todo-copilot-terraform-state-dev

# 暗号化設定の確認
aws s3api get-bucket-encryption \
  --bucket todo-copilot-terraform-state-dev
```

### バックアップとリカバリ

```bash
# 定期的なバックアップの作成
aws s3 cp \
  s3://todo-copilot-terraform-state-dev/terraform.tfstate \
  s3://backup-bucket/terraform-dev-$(date +%Y%m%d).tfstate

# または AWS Backup を使用
aws backup create-backup-plan \
  --backup-plan file://backup-plan.json
```

### ライフサイクルポリシー

```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpirationInDays": 90
    },
    {
      "Id": "TransitionToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

適用方法:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket todo-copilot-terraform-state-dev \
  --lifecycle-configuration file://lifecycle.json
```

---

## DynamoDB ロックテーブル

### テーブル仕様

| 属性 | 値 |
|------|-----|
| テーブル名 | `terraform-lock-{env}` |
| 主キー | LockID (String) |
| 課金モデル | Pay Per Request |
| TTL | ExpirationTime |

### ロック機構

```bash
# ロック状態の確認
aws dynamodb scan \
  --table-name terraform-lock-dev \
  --projection-expression "LockID, ExpirationTime, Info"

# 出力例:
# LockID: todo-copilot/terraform.tfstate-xxxxx
# ExpirationTime: 1700641200
# Info: {"ID":"...","Operation":"apply","Version":"1.6.0","..."}
```

### スタックロックの解除（緊急時のみ）

```bash
# ⚠️ 警告: 実行中の Terraform 操作がない場合のみ実行
aws dynamodb delete-item \
  --table-name terraform-lock-dev \
  --key '{"LockID":{"S":"todo-copilot/terraform.tfstate"}}'

# または Terraform CLI
terraform force-unlock LOCK_ID
```

### TTL の管理

```bash
# TTL 設定の確認
aws dynamodb describe-time-to-live \
  --table-name terraform-lock-dev

# TTL 有効化（もし無効の場合）
aws dynamodb update-time-to-live \
  --table-name terraform-lock-dev \
  --time-to-live-specification \
    "Enabled=true,AttributeName=ExpirationTime"
```

---

## ワークスペース管理

### ワークスペースの作成と選択

```bash
# 利用可能なワークスペースの一覧
terraform workspace list

# ワークスペースの作成
terraform workspace new prod

# ワークスペースの選択
terraform workspace select prod

# 現在のワークスペース表示
terraform workspace show
```

### ワークスペース別状態ファイル

```
S3 bucket: todo-copilot-terraform-state-prod
├── terraform.tfstate           (default workspace)
├── env:dev/terraform.tfstate   (dev workspace)
├── env:staging/terraform.tfstate
└── env:prod/terraform.tfstate
```

### ワークスペースの削除

```bash
# ⚠️ 注意: 事前にリソースを destroy してください
terraform destroy -var-file=environments/prod.tfvars
terraform workspace delete prod
```

---

## 状態管理のベストプラクティス

### 1. 状態ファイルのバージョン管理

```bash
# 定期的なスナップショット
0 2 * * * /bin/bash -c 'aws s3 cp s3://bucket/terraform.tfstate s3://bucket/backups/state-$(date +\%Y\%m\%d).tfstate'

# CloudTrail でのアクセス監査
aws s3api put-bucket-logging \
  --bucket todo-copilot-terraform-state-prod \
  --bucket-logging-status file://logging.json
```

### 2. リモート状態へのアクセス制御

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::bucket/terraform.tfstate",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/terraform-executor"
      }
    }
  ]
}
```

### 3. 機密情報の保護

```hcl
# 機密値は sensitive = true でマーク
output "database_password" {
  value       = aws_db_instance.default.password
  description = "RDS database password"
  sensitive   = true
}

# 環境変数で保管（機密情報は状態ファイルに含まれない）
export TF_VAR_db_password=$(aws secretsmanager get-secret-value \
  --secret-id prod/db-password \
  --query SecretString \
  --output text)
```

### 4. 状態ファイルの暗号化

```bash
# S3 の暗号化確認
aws s3api get-bucket-encryption \
  --bucket todo-copilot-terraform-state-prod

# カスタマー管理キーによる暗号化
aws s3api put-bucket-encryption \
  --bucket todo-copilot-terraform-state-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:region:account:key/id"
      }
    }]
  }'
```

---

## トラブルシューティング

### 状態ファイル破損

**問題**: "Error reading state file"

**診断**:
```bash
# ローカルキャッシュの確認
ls -la .terraform/terraform.tfstate*

# S3 からのダウンロード
aws s3 cp s3://bucket/terraform.tfstate ./terraform.tfstate.backup
```

**復旧**:
```bash
# 前のバージョンから復旧
aws s3api get-object \
  --bucket todo-copilot-terraform-state-dev \
  --version-id [VERSION_ID] \
  --key terraform.tfstate \
  terraform.tfstate.recovered

# 復旧ファイルを確認後、リストア
cp terraform.tfstate.recovered .terraform/terraform.tfstate
```

### ロック状態の問題

**問題**: "Error acquiring the state lock"

**原因と対応**:
```bash
# 1. ロック情報の確認
aws dynamodb scan \
  --table-name terraform-lock-dev

# 2. 実行中の操作がない場合、ロックを解除
terraform force-unlock LOCK_ID

# 3. または DynamoDB から直接削除
aws dynamodb delete-item \
  --table-name terraform-lock-dev \
  --key '{"LockID":{"S":"todo-copilot/terraform.tfstate"}}'
```

### 状態の不整合

**問題**: "Resource has been deleted externally"

**対応**:
```bash
# 状態のリフレッシュ
terraform refresh

# または特定リソースのみ
terraform refresh -target=aws_lambda_function.todo_api

# AWS 実際のリソースをインポート
terraform import aws_lambda_function.todo_api [function-name]
```

### パフォーマンスの低下

**問題**: Terraform plan/apply が遅い

**最適化**:
```bash
# 状態ファイルのサイズ確認
aws s3api head-object \
  --bucket todo-copilot-terraform-state-prod \
  --key terraform.tfstate | grep -i content-length

# 不要なリソースを除外
terraform state rm aws_resource.old_resource

# または状態ファイルの圧縮
terraform state push  # リセット
terraform init
```

---

## 監査とコンプライアンス

### CloudTrail ログ

```bash
# S3 バケットへのアクセスログ
aws cloudtrail create-trail \
  --name terraform-audit-trail \
  --s3-bucket-name audit-logs

# イベント検索
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutObject \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=terraform.tfstate
```

### アクセス監視

```bash
# S3 アクセスログの有効化
aws s3api put-bucket-logging \
  --bucket todo-copilot-terraform-state-prod \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "logging-bucket",
      "TargetPrefix": "terraform-state-logs/"
    }
  }'

# CloudWatch ダッシュボード
aws cloudwatch put-dashboard \
  --dashboard-name terraform-backend-monitoring \
  --dashboard-body file://dashboard.json
```

---

## バックアップと復旧計画

### 定期バックアップ

```bash
#!/bin/bash
# backup-terraform-state.sh

BUCKET="todo-copilot-terraform-state-prod"
BACKUP_DIR="s3://backup-bucket/terraform-state-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# 状態ファイルをダウンロード
aws s3 cp s3://${BUCKET}/terraform.tfstate terraform.tfstate.${TIMESTAMP}

# バージョン情報を取得
aws s3api list-object-versions \
  --bucket ${BUCKET} \
  --key terraform.tfstate \
  > terraform-versions.${TIMESTAMP}.json

# バックアップ S3 にアップロード
aws s3 cp terraform.tfstate.${TIMESTAMP} ${BACKUP_DIR}/
aws s3 cp terraform-versions.${TIMESTAMP}.json ${BACKUP_DIR}/

# ローカルクリーンアップ
rm terraform.tfstate.${TIMESTAMP} terraform-versions.${TIMESTAMP}.json
```

cron 登録:
```bash
0 2 * * * /usr/local/bin/backup-terraform-state.sh
```

### 復旧手順

```bash
# ステップ 1: バックアップの確認
aws s3 ls s3://backup-bucket/terraform-state-backups/

# ステップ 2: バックアップのダウンロード
aws s3 cp s3://backup-bucket/terraform-state-backups/terraform.tfstate.20251122 \
  terraform.tfstate

# ステップ 3: 検証
terraform state list

# ステップ 4: 本番にリストア
aws s3 cp terraform.tfstate s3://todo-copilot-terraform-state-prod/

# ステップ 5: 検証
terraform plan -no-color
```

---

## 次のステップ

- → **DISASTER_RECOVERY.md** で高度な復旧手順を確認
- → **TROUBLESHOOTING.md** で詳細な問題解決方法を参照

---

**参考資料**:
- [Terraform Backend Types](https://www.terraform.io/language/settings/backends)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)

**作成者**: DevOps チーム  
**最終更新**: 2025-11-22
