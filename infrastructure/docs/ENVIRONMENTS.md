# Environment Configuration Guide

**Document**: 環境別設定ガイド  
**Target Audience**: 開発者、DevOps エンジニア  
**Last Updated**: 2025-11-22  
**Version**: 1.0

---

## 概要

本ドキュメントでは、Todo Copilot のデプロイメント環境（dev、staging、prod）の設定と使い分けを説明します。

---

## 環境の概要

### 環境マトリックス

| 特性 | Development | Staging | Production |
|------|-------------|---------|-----------|
| **目的** | 開発・テスト | プレリリース検証 | ユーザー提供 |
| **ユーザー** | 開発チーム | QA・ステークホルダー | エンドユーザー |
| **デプロイ頻度** | 毎日複数回 | 週1-2回 | 月1-2回 |
| **バックアップ** | なし | 日次 | 継続的 |
| **監視レベル** | 基本 | 標準 | 重大 |
| **自動デプロイ** | なし | 条件付き | 手動承認 |

---

## 開発環境（Development）

### 用途

- 新機能開発
- バグ修正テスト
- 統合テスト実施
- Terraform コード検証

### 設定

```hcl
# dev.tfvars
environment                    = "dev"
aws_region                     = "ap-northeast-1"
lambda_memory_size             = 256
lambda_timeout                 = 30
cloudwatch_log_retention_days  = 7
enable_xray_tracing            = false
```

### リソース仕様

```
Lambda Function:
  - Memory: 256 MB
  - Timeout: 30秒
  - Concurrency: Unrestricted

DynamoDB Table:
  - Billing: PAY_PER_REQUEST
  - Point-in-time recovery: Disabled
  - Backup: Daily manual only

API Gateway:
  - Throttling: 1000 req/s
  - Caching: Disabled
  - Logging: Basic only
```

### コスト目安

- **月額**: $5-15
  - Lambda: $0.20/百万リクエスト
  - DynamoDB: $1.25/百万書き込み
  - CloudWatch Logs: $0.50/GB

### アクセス制御

```bash
# 開発チーム全員がアクセス可能
aws iam create-policy \
  --policy-name dev-environment-access \
  --policy-document '{
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:*", "dynamodb:*", "lambda:*"],
      "Resource": "arn:aws:*:*:*:*dev*"
    }]
  }'
```

### デプロイメント手順

```bash
# 開発環境へのデプロイ（簡略化）
./infrastructure/scripts/init.sh dev
./infrastructure/scripts/plan.sh dev --detailed
./infrastructure/scripts/apply.sh dev

# または自動デプロイ（git push 後）
# GitHub Actions により自動実行
```

### トラブルシューティング

```bash
# 環境のリセット
./infrastructure/scripts/destroy.sh dev --force

# リソースの再作成
./infrastructure/scripts/init.sh dev
./infrastructure/scripts/apply.sh dev --auto-approve
```

---

## ステージング環境（Staging）

### 用途

- プレリリース検証
- パフォーマンステスト
- ユーザー受け入れテスト（UAT）
- デプロイメント演習

### 設定

```hcl
# staging.tfvars
environment                    = "staging"
aws_region                     = "ap-northeast-1"
lambda_memory_size             = 512
lambda_timeout                 = 60
cloudwatch_log_retention_days  = 30
enable_xray_tracing            = true
```

### リソース仕様

```
Lambda Function:
  - Memory: 512 MB
  - Timeout: 60秒
  - Concurrency: 100 (reserved)

DynamoDB Table:
  - Billing: PAY_PER_REQUEST
  - Point-in-time recovery: Disabled
  - Backup: Daily manual
  - Stream: Enabled (optional)

API Gateway:
  - Throttling: 5000 req/s
  - Caching: Enabled (5分)
  - Logging: CloudWatch + Access Logs
```

### コスト目安

- **月額**: $20-50
  - Lambda: $2.00/百万リクエスト
  - DynamoDB: $10/百万書き込み
  - CloudWatch: $5/日

### アクセス制御

```bash
# QA・ステークホルダーのアクセス
aws iam create-policy \
  --policy-name staging-environment-access \
  --policy-document '{
    "Statement": [{
      "Effect": "Allow",
      "Action": ["apigateway:GET", "logs:*"],
      "Resource": "arn:aws:*:*:*:*staging*"
    }, {
      "Effect": "Deny",
      "Action": ["dynamodb:DeleteTable", "s3:DeleteBucket"],
      "Resource": "*"
    }]
  }'
```

### デプロイメント手順

```bash
# ステージング環境へのデプロイ（確認付き）
./infrastructure/scripts/plan.sh staging --detailed
# レビュー後...
./infrastructure/scripts/apply.sh staging

# 自動デプロイ（main ブランチへのマージ時）
# GitHub Actions により自動実行（手動承認必須）
```

### テスト実行

```bash
# E2E テスト
npm run test:e2e -- --environment=staging

# パフォーマンステスト
npm run test:performance -- --environment=staging --users=50

# セキュリティスキャン
npm run test:security -- --environment=staging
```

### バックアップ・復旧

```bash
# 日次バックアップの確認
aws dynamodb list-backups \
  --table-name todo-copilot-staging

# ポイントインタイムリカバリの有効化
aws dynamodb update-continuous-backups \
  --table-name todo-copilot-staging \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

---

## 本番環境（Production）

### 用途

- ユーザーへのサービス提供
- 本稼働用リソース管理
- 高可用性・信頼性確保
- コンプライアンス準拠

### 設定

```hcl
# prod.tfvars
environment                    = "prod"
aws_region                     = "ap-northeast-1"
lambda_memory_size             = 1024
lambda_timeout                 = 300
cloudwatch_log_retention_days  = 365
enable_xray_tracing            = true
enable_detailed_monitoring     = true
```

### リソース仕様

```
Lambda Function:
  - Memory: 1024 MB
  - Timeout: 300秒
  - Concurrency: 500 (reserved, provisioned)
  - Tracing: X-Ray Active

DynamoDB Table:
  - Billing: PAY_PER_REQUEST (または Provisioned)
  - Point-in-time recovery: Enabled (35日間)
  - Backup: Continuous + Daily
  - Stream: Enabled (NEW AND OLD IMAGES)
  - TTL: Enabled for expired todos

API Gateway:
  - Throttling: 10000 req/s
  - Caching: Enabled (1時間)
  - WAF: Enabled (OWASP Top 10)
  - Logging: CloudWatch + Access Logs + CloudTrail
  - DDoS Protection: Shield Standard + Shield Advanced (optional)
```

### コスト目安

- **月額**: $100-500
  - Lambda: $20/百万リクエスト
  - DynamoDB: $100/百万書き込み
  - CloudWatch/X-Ray: $50
  - Data Transfer: $20

### セキュリティ設定

```bash
# WAF ルールの適用
aws wafv2 create-web-acl \
  --region ap-northeast-1 \
  --name todo-copilot-prod-waf \
  --scope REGIONAL \
  --default-action Block={}

# VPC エンドポイントの設定
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.ap-northeast-1.dynamodb

# CloudTrail の有効化
aws cloudtrail create-trail \
  --name todo-copilot-audit \
  --s3-bucket-name audit-logs
```

### アクセス制御

```bash
# 本番環境アクセスには多要素認証が必須
aws iam create-policy \
  --policy-name prod-environment-access \
  --policy-document '{
    "Statement": [{
      "Effect": "Allow",
      "Action": ["cloudwatch:*", "logs:*"],
      "Resource": "*",
      "Condition": {
        "Bool": {"aws:MultiFactorAuthPresent": "true"}
      }
    }, {
      "Effect": "Deny",
      "Action": ["dynamodb:DeleteTable", "lambda:DeleteFunction"],
      "Resource": "*"
    }]
  }'
```

### デプロイメント手順（厳格）

```bash
# ステップ 1: ステージングで十分テストした後
# ステップ 2: Git タグで本番リリース版を作成
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# ステップ 3: 計画の確認（複数人でレビュー）
./infrastructure/scripts/plan.sh prod --detailed

# ステップ 4: 計画をファイルに保存
terraform plan -out=prod.tfplan

# ステップ 5: 承認者による確認
# PR レビュー、セキュリティチェック

# ステップ 6: 承認後に適用（変更窓口内のみ）
./infrastructure/scripts/apply.sh prod --plan-file=prod.tfplan
```

### 監視・アラート

```bash
# Lambda エラー率アラーム
aws cloudwatch put-metric-alarm \
  --alarm-name prod-lambda-errors \
  --alarm-description "Alert if error rate > 1%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# DynamoDB スロットリング警告
aws cloudwatch put-metric-alarm \
  --alarm-name prod-dynamodb-throttle \
  --alarm-description "Alert on throttling" \
  --metric-name ConsumedWriteCapacityUnits \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --threshold 40000 \
  --comparison-operator GreaterThanThreshold
```

### 災害復旧

```bash
# ポイントインタイムリカバリ
aws dynamodb restore-table-to-point-in-time \
  --source-table-name todo-copilot-prod \
  --target-table-name todo-copilot-prod-restored \
  --restore-date-time 2025-11-22T10:00:00Z

# S3 バージョン履歴からの復旧
aws s3 list-object-versions \
  --bucket todo-copilot-terraform-state-prod | head -10
```

---

## 環境間の昇格フロー

```
開発環境 → ステージング環境 → 本番環境
(dev)       (staging)          (prod)

フロー:
1. 開発環境で機能開発・テスト
   ↓
2. Pull Request 作成
   ↓
3. コードレビュー・自動テスト
   ↓
4. main ブランチにマージ
   ↓
5. ステージング環境に自動デプロイ
   ↓
6. QA・UAT 実施
   ↓
7. 本番リリース要求
   ↓
8. リリース管理者が確認
   ↓
9. 本番環境に手動デプロイ（変更窓口内）
   ↓
10. デプロイメント検証
    ↓
11. リリース完了
```

---

## 環境別チェックリスト

### 開発環境デプロイメント前

- [ ] ローカルテストが全て合格
- [ ] コード変更が git に committed
- [ ] `terraform plan` 出力を確認
- [ ] リソース見積もりが妥当

### ステージング環境デプロイメント前

- [ ] develop ブランチの全テストが合格
- [ ] ステージングリソース計画をレビュー
- [ ] セキュリティチェックが完了
- [ ] パフォーマンステストのベースラインを設定

### 本番環境デプロイメント前

- [ ] ステージングで 5 営業日のテスト実施
- [ ] セキュリティ監査が完了
- [ ] 本番計画を 3 人以上でレビュー
- [ ] ロールバック計画が確立
- [ ] 管理者承認が得られた
- [ ] 変更窓口内の日時を確認

---

## 環境トラブルシューティング

### 開発環境のリセット

```bash
./infrastructure/scripts/destroy.sh dev --force
./infrastructure/scripts/init.sh dev
./infrastructure/scripts/apply.sh dev --auto-approve
```

### ステージング環境のロールバック

```bash
# 前回の git コミットに戻す
git checkout HEAD~1 -- infrastructure/terraform/

# 復旧計画の実行
./infrastructure/scripts/plan.sh staging --destroy
./infrastructure/scripts/apply.sh staging --auto-approve
```

### 本番環境の緊急復旧

```bash
# ポイントインタイムリカバリを実行
./infrastructure/scripts/import.sh prod \
  aws_dynamodb_table todo-copilot-prod-restored \
  [restore-table-id]

# CloudTrail で操作履歴を確認
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteTable
```

---

## 次のステップ

- → **BACKEND.md** で状態管理の詳細を学習
- → **DISASTER_RECOVERY.md** で復旧手順を確認
- → **TROUBLESHOOTING.md** で問題解決方法を参照

---

**作成者**: DevOps チーム  
**最終更新**: 2025-11-22
