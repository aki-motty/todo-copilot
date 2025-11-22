# CI/CD Terraform Pipeline

GitHub Actions を使用した Terraform デプロイメント自動化パイプライン

## Overview

このワークフローは、Terraform コードの検証、テスト、セキュリティスキャン、および環境別デプロイメント自動化を行います。

## Workflow Stages

### 1. **terraform-validate** ✅
Terraform 構文とコンフィギュレーションの検証

- `terraform fmt` - コード形式チェック
- `terraform init` - 初期化（バックエンド無効）
- `terraform validate` - 構文検証
- `terraform plan` - 全環境の計画生成

**トリガー条件**:
- `infrastructure/terraform/` ディレクトリの変更
- すべてのブランチで実行
- PR・プッシュ両対応

### 2. **tests** 🧪
Jest テストスイートの実行

- `npm test` - Terraform モジュールテスト（40+ test cases）
- カバレッジレポート生成
- Codecov へのアップロード

**依存関係**: `terraform-validate` 完了後

### 3. **security-scan** 🔒
セキュリティスキャンと脆弱性検査

- **TFLint** - Terraform ベストプラクティスチェック
- **Checkov** - セキュリティ脆弱性スキャン
- SARIF 形式でレポート出力

**依存関係**: `terraform-validate` 完了後

### 4. **plan-summary** 📋
PR へのプラン概要コメント投稿

- 環境別（dev/staging/prod）の差分サマリー表示
- PR コメントとして自動投稿

**条件**: PR イベント時のみ実行

### 5. **deploy-dev** 🚀
Dev 環境への自動デプロイメント

**トリガー条件**:
- `develop` ブランチへのプッシュ
- `terraform-validate`、`tests`、`security-scan` 成功後

**環境設定**:
- 環境: `development`
- AWS IAM Role: `AWS_ROLE_TO_ASSUME_DEV`
- 自動デプロイ（承認不要）

### 6. **deploy-staging** 🚀
Staging 環境へのデプロイメント

**トリガー条件**:
- `main` ブランチへのプッシュ
- コミットメッセージに `[deploy-staging]` を含む
- 全セキュリティチェック成功

**環境設定**:
- 環境: `staging`
- AWS IAM Role: `AWS_ROLE_TO_ASSUME_STAGING`
- **手動承認必須**: `devops-team` (1人)

### 7. **deploy-prod** 🚀
Prod 環境へのデプロイメント

**トリガー条件**:
- `main` ブランチへのプッシュ
- コミットメッセージに `[deploy-prod]` を含む
- 全セキュリティチェック成功

**環境設定**:
- 環境: `production`
- AWS IAM Role: `AWS_ROLE_TO_ASSUME_PROD`
- **手動承認必須**: `devops-team` + `security-team` (2人以上)

### 8. **notify** 📢
Slack 通知

- パイプライン失敗時: ❌ エラー通知
- パイプライン成功時: ✅ 成功通知

## Environment Setup

### Required Secrets

GitHub リポジトリに以下のシークレットを設定してください:

```
AWS_ROLE_TO_ASSUME_DEV=arn:aws:iam::ACCOUNT:role/GitHubActionsRoleDev
AWS_ROLE_TO_ASSUME_STAGING=arn:aws:iam::ACCOUNT:role/GitHubActionsRoleStaging
AWS_ROLE_TO_ASSUME_PROD=arn:aws:iam::ACCOUNT:role/GitHubActionsRoleProd
TF_STATE_BUCKET=terraform-state-bucket
TF_LOCK_TABLE=terraform-lock-table
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Branch Protection Rules

**Main ブランチ**:

```yaml
- terraform-validate: required
- tests: required
- security-scan: required
- Require status checks to pass before merging: enabled
- Require code reviews before merging: 1 (staging), 2 (prod deployment)
- Require approval from code owners: enabled
```

## Usage

### Dev Deployment (Automatic)

```bash
# develop ブランチにプッシュするだけで自動デプロイ
git push origin develop
```

### Staging Deployment (Manual Approval)

```bash
# コミットメッセージに [deploy-staging] を含める
git commit -m "feat: new feature [deploy-staging]"
git push origin main

# GitHub Actions で手動承認を待つ
# -> devops-team の誰かが承認後デプロイ開始
```

### Prod Deployment (Dual Approval)

```bash
# コミットメッセージに [deploy-prod] を含める
git commit -m "chore: release v1.0.0 [deploy-prod]"
git push origin main

# GitHub Actions で手動承認を待つ
# -> devops-team + security-team の最低2人が承認後デプロイ開始
```

## Monitoring & Logs

### Workflow Status

```bash
# CLI での確認
gh run list --workflow=terraform-ci.yml

# 特定ランの詳細ログ
gh run view <run-id> --log
```

### Artifact Management

各ワークフロー実行のアーティファクト:

- `tfplan` - Terraform プラン (各環境別)
- `outputs.json` - デプロイ後の Terraform Outputs
- `deployment-log.txt` - デプロイメント記録 (Prod only)

## Best Practices

### 1. Commit Message Convention

環境別デプロイメントトリガー:

```bash
# Dev: 自動（develop ブランチ推奨）
git push origin develop

# Staging
git commit -m "feat: implement feature [deploy-staging]"

# Prod
git commit -m "chore: release v1.0.0 [deploy-prod]"
```

### 2. Terraform State Management

- State ファイルは S3 バケットで管理
- DynamoDB テーブルでロック管理
- 環境別に別々の state キー

```hcl
# Example state key structure
dev:       s3://bucket/dev/terraform.tfstate
staging:   s3://bucket/staging/terraform.tfstate
prod:      s3://bucket/prod/terraform.tfstate
```

### 3. Security Considerations

- PR マージ前の自動スキャン
- Prod デプロイに複数承認必須
- IAM Role は最小権限で設定
- Secrets は定期的にローテーション

### 4. Troubleshooting

**Plan が失敗する場合**:

```bash
# ローカルで検証
cd infrastructure/terraform
terraform init -backend=false
terraform validate
terraform plan -var-file="environments/dev.tfvars"
```

**Apply が失敗する場合**:

- AWS 認証情報の確認
- IAM Role の権限確認
- State ロック解除の確認

```bash
# ローカルでロック状態確認
terraform force-unlock <LOCK_ID>
```

**CI/CD が実行されない場合**:

- ワークフローファイルの構文チェック
- ブランチ保護ルール確認
- Secrets 設定確認

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Git Event (Push / PR)                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ terraform-validate │ (全ブランチ)
        └─────────┬──────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
    ┌────────┐           ┌──────────────┐
    │ tests  │           │ security-scan│
    └─────┬──┘           └──────┬───────┘
          │                     │
          └─────────┬───────────┘
                    │
        ┌───────────┴─────────┐
        │                     │
        ▼                     ▼
  ┌──────────────┐   ┌────────────────┐
  │plan-summary  │   │ deploy-dev ✅  │ (develop)
  │(PR comment)  │   └────────────────┘
  └──────────────┘
                     ┌────────────────────────────┐
                     │ deploy-staging (approval)  │ (main)
                     └────────────────────────────┘

                     ┌────────────────────────────┐
                     │ deploy-prod (dual approval)│ (main)
                     └────────────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │   notify     │
                        └──────────────┘
```

## Related Documentation

- [Terraform Plan](../plan.md) - アーキテクチャ設計
- [Tasks](../tasks.md) - 実装タスク一覧
- [AWS IAM Strategy](../research.md#aws-iam-strategy) - IAM 戦略
- [Infrastructure README](../../infrastructure/README.md) - インフラストラクチャドキュメント

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [TFLint](https://github.com/terraform-linters/tflint)
- [Checkov](https://www.checkov.io/)
