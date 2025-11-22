# Deployment Checklist: AWS での本番デプロイ前確認項目

**作成日**: 2025-11-22  
**ステータス**: デプロイ準備完了  
**対象環境**: dev → staging → prod (順序デプロイ推奨)

---

## Phase 1: Pre-Deployment Setup (認証・権限・環境設定)

### 1.1 AWS 認証・資格情報の設定

- [ ] **AWS IAM ユーザー / Assume Role を準備**
  - AWS Management Console でログイン
  - Terraform 実行専用の IAM ロール作成 (または既存ロールを確認)
  - 最小権限原則に従う：`s3:*`, `dynamodb:*`, `lambda:*`, `apigateway:*`, `iam:*` など
  - **本番環境**: MFA を有効化し、Assume Role で接続

- [ ] **AWS CLI クレデンシャル設定**
  ```bash
  aws configure
  # または
  export AWS_PROFILE=terraform-admin
  export AWS_REGION=ap-northeast-1
  ```

- [ ] **認証状態の確認**
  ```bash
  aws sts get-caller-identity
  # 出力確認: UserId, Account, Arn
  ```

### 1.2 Terraform バックエンド準備

- [ ] **S3 backend bucket の確認**
  - Bucket name: `todo-copilot-terraform-backend-<account-id>`
  - Encryption: SSE-S3 または SSE-KMS が有効
  - Versioning: 有効
  - Public Access Block: すべてブロック
  
  ```bash
  aws s3api get-bucket-encryption --bucket todo-copilot-terraform-backend-<account-id>
  aws s3api get-bucket-versioning --bucket todo-copilot-terraform-backend-<account-id>
  ```

- [ ] **DynamoDB Lock Table の確認**
  - Table name: `todo-copilot-terraform-locks`
  - Primary key: `LockID` (String)
  - On-demand billing 推奨 (または Provisioned capacity)
  
  ```bash
  aws dynamodb describe-table --table-name todo-copilot-terraform-locks
  ```

- [ ] **backend.tf の確認**
  - S3 bucket と DynamoDB table が正確に指定されているか
  - リージョンが正確か

### 1.3 ローカル環境・ツール準備

- [ ] **Terraform CLI バージョン確認**
  ```bash
  terraform version
  # 出力確認: v1.5.0 以上
  ```

- [ ] **AWS CLI バージョン確認**
  ```bash
  aws --version
  # 出力確認: aws-cli/2.x.x
  ```

- [ ] **リント・セキュリティツール導入**
  ```bash
  tflint --version
  checkov --version
  ```

---

## Phase 2: Code Validation (コード検証)

### 2.1 Terraform 構文検証

- [ ] **フォーマットチェック**
  ```bash
  cd infrastructure/terraform
  terraform fmt -check
  # 修正が必要な場合: terraform fmt
  ```

- [ ] **初期化（Backend なし）**
  ```bash
  terraform init -backend=false
  ```

- [ ] **バリデーション**
  ```bash
  terraform validate
  # 出力: "Success! The configuration is valid."
  ```

### 2.2 Lint & セキュリティスキャン

- [ ] **TFLint 実行**
  ```bash
  cd infrastructure/terraform
  tflint --init
  tflint
  # AWS Best Practices に従っているか確認
  ```

- [ ] **Checkov セキュリティスキャン**
  ```bash
  checkov -d infrastructure/terraform --framework terraform
  # CKV_AWS_* 違反を確認し、許容可能か判断
  ```

- [ ] **Terraform モジュール検証**
  ```bash
  npm test -- terraform-modules.spec.ts
  # Jest による構造・出力検証: 40 test cases がすべて PASS
  ```

### 2.3 ドキュメント・設定値確認

- [ ] **各環境別設定ファイルの確認**
  - `environments/dev.tfvars`: 低スペック、自動デプロイ許可
  - `environments/staging.tfvars`: 中程度スペック、1 承認ワークフロー
  - `environments/prod.tfvars`: 高スペック、高可用性、2 承認ワークフロー

- [ ] **タグ戦略の確認**
  ```hcl
  Environment = var.environment
  Project = "todo-copilot"
  ManagedBy = "terraform"
  CostCenter = "<your-cost-center>"
  ```

- [ ] **destroy 保護の確認**
  - 本番環境リソースに `prevent_destroy = true` がセットされているか
  - 本番環境 tfvars に `prevent_destroy_enabled = true` が設定されているか

---

## Phase 3: Plan & Review (計画・レビュー)

### 3.1 Dev 環境での Plan

- [ ] **AWS 認証を有効化**
  ```bash
  export AWS_PROFILE=terraform-admin
  export AWS_REGION=ap-northeast-1
  aws sts get-caller-identity
  ```

- [ ] **Backend 初期化（Dev）**
  ```bash
  cd infrastructure/terraform
  terraform init -reconfigure
  terraform workspace new dev || terraform workspace select dev
  ```

- [ ] **Terraform plan 実行（Dev）**
  ```bash
  terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan
  ```

- [ ] **Plan 出力の確認**
  - リソース数: `Plan: XX to add, 0 to change, 0 to destroy.`
  - 破壊的変更がないか: データベース削除、Lambda 関数の再作成がないか
  - IAM ロール・ポリシーが適切か

- [ ] **Plan ファイルの保存**
  ```bash
  terraform show -json plan-dev.tfplan > plan-dev.json
  # Git に commit: git add plan-dev.* (または .gitignore から除外)
  ```

### 3.2 Staging & Prod Plan（本番前最終確認）

- [ ] **Staging Plan 実行**
  ```bash
  terraform workspace new staging || terraform workspace select staging
  terraform plan -var-file=environments/staging.tfvars -out=plan-staging.tfplan
  ```

- [ ] **Prod Plan 実行**
  ```bash
  terraform workspace new prod || terraform workspace select prod
  terraform plan -var-file=environments/prod.tfvars -out=plan-prod.tfplan
  ```

- [ ] **差分の確認**
  - 各環境のコスト想定
  - リソースの冗長性・可用性
  - ネットワーク設定・セキュリティグループ

---

## Phase 4: Pre-Apply Verification (適用前検証)

### 4.1 CI/CD パイプラインの確認

- [ ] **GitHub Actions ワークフロー確認**
  - Workflow file: `.github/workflows/terraform-ci.yml`
  - Trigger: PR on `002-aws-terraform-deploy` → `main` or `production`
  - Stages:
    1. ✅ terraform validate
    2. ✅ terraform fmt -check
    3. ✅ tflint
    4. ✅ checkov
    5. ✅ Jest module tests
    6. ⏳ (本番) Plan & Auto-comment on PR
    7. ⏳ (本番) Manual approval → terraform apply

- [ ] **PR レビュー設定確認**
  - CODEOWNERS ファイルが設定されているか
  - 承認要件: dev (0) / staging (1) / prod (2)
  - Status check 通過が必須か

### 4.2 監視・ログ設定確認

- [ ] **CloudWatch Logs 設定**
  - Lambda function logs: `/aws/lambda/todo-copilot-*`
  - Terraform state change logs: 記録可能か
  - Log retention period: 適切か

- [ ] **AWS CloudTrail 有効化**
  - API call logging: 本番環境で有効
  - 誤操作/権限変更の監査が可能か

### 4.3 Rollback 計画

- [ ] **Rollback 手順ドキュメント確認**
  - ファイル: `infrastructure/docs/DISASTER_RECOVERY.md`
  - `terraform destroy` による削除手順
  - S3 state ファイルのバージョン復元方法
  - DynamoDB ポイントインタイムリカバリー手順

- [ ] **Backup & Restore テスト**
  - S3 versioning 動作確認
  - DynamoDB backup ファイル所在確認
  - 復旧に要する時間見積もり

---

## Phase 5: Apply & Post-Apply Verification (適用・検証)

### 5.1 Dev 環境への Apply

- [ ] **Apply 実行前の最終確認**
  ```bash
  terraform workspace select dev
  terraform show plan-dev.tfplan
  # Plan の diff をもう一度確認
  ```

- [ ] **Apply 実行**
  ```bash
  terraform apply plan-dev.tfplan
  # 出力: Apply complete! Resources: XX added, 0 changed, 0 destroyed.
  ```

- [ ] **リソース作成状態確認**
  ```bash
  aws lambda list-functions --region ap-northeast-1 | jq '.Functions[] | {FunctionName, LastModified}'
  aws dynamodb list-tables --region ap-northeast-1
  aws apigateway get-rest-apis --region ap-northeast-1
  ```

### 5.2 Post-Apply Verification スクリプト実行

- [ ] **デプロイメント検証スクリプト**
  ```bash
  bash infrastructure/scripts/verify-deployment.sh
  # 出力確認: All checks passed / Failed checks
  ```

- [ ] **Constitution Check**
  ```bash
  bash infrastructure/scripts/constitution-check.sh
  # 目標: 71+ / 82 チェック合格
  ```

- [ ] **E2E テスト実行**
  ```bash
  npm run test:e2e -- --env dev
  # 実際の API 呼び出しが成功するか確認
  ```

### 5.3 Staging & Prod への段階的デプロイ

- [ ] **Staging Apply**
  - 承認ワークフロー: 1 人の承認が必要
  - Apply 実行
  - 検証スクリプト実行

- [ ] **Prod Apply**
  - 承認ワークフロー: 2 人の承認が必要 (通常: Tech Lead + Ops Lead)
  - Apply 実行
  - 検証スクリプト実行
  - 監視・ログ確認

---

## Phase 6: Post-Deployment (デプロイ後運用)

### 6.1 監視・アラート確認

- [ ] **CloudWatch ダッシュボード確認**
  - Lambda 呼び出し数、エラー率、実行時間
  - DynamoDB RCU/WCU の利用状況
  - API Gateway リクエスト数、レイテンシ

- [ ] **アラート通知設定確認**
  - SNS トピック/メール設定
  - PagerDuty/Slack 連携（あれば）

### 6.2 ドキュメント・運用手順の更新

- [ ] **README 更新**
  - デプロイ完了日
  - 本番環境 API endpoint URL
  - 監視・ログページへのリンク

- [ ] **トラブルシューティング記録**
  - 遭遇した問題と解決方法
  - パフォーマンスチューニング結果

### 6.3 継続的改善

- [ ] **Terraform State 定期バックアップ**
  ```bash
  aws s3 cp s3://todo-copilot-terraform-backend-<account>/prod/terraform.tfstate \
    ~/backups/terraform-state-$(date +%Y%m%d).backup
  ```

- [ ] **Cost Optimization レビュー（デプロイ後 1 週間）**
  - 実際のコスト vs 予想コスト
  - 不要なリソース削除
  - Reserved Instances / Savings Plans 検討

---

## Checklist Status Tracking

| Phase | Task | Status | Owner | Date |
|-------|------|--------|-------|------|
| 1.1 | AWS 認証設定 | ⏳ |  |  |
| 1.2 | Backend 準備 | ⏳ |  |  |
| 1.3 | ツール準備 | ⏳ |  |  |
| 2.1 | 構文検証 | ✅ |  | 2025-11-22 |
| 2.2 | Lint/Security | ✅ |  | 2025-11-22 |
| 2.3 | 設定ファイル | ⏳ |  |  |
| 3.1 | Dev Plan | ⏳ |  |  |
| 3.2 | Staging/Prod Plan | ⏳ |  |  |
| 4.1 | CI/CD 確認 | ⏳ |  |  |
| 4.2 | 監視設定 | ⏳ |  |  |
| 4.3 | Rollback 計画 | ⏳ |  |  |
| 5.1 | Dev Apply | ⏳ |  |  |
| 5.2 | Verification | ⏳ |  |  |
| 5.3 | Prod Apply | ⏳ |  |  |
| 6.1 | 監視・アラート | ⏳ |  |  |
| 6.2 | ドキュメント | ⏳ |  |  |

---

## References

- Terraform 公式ドキュメント: https://www.terraform.io/docs
- AWS ベストプラクティス: https://aws.amazon.com/jp/builders/aws-builders-flash/
- State Management: `infrastructure/docs/BACKEND.md`
- Disaster Recovery: `infrastructure/docs/DISASTER_RECOVERY.md`
- Troubleshooting: `infrastructure/docs/TROUBLESHOOTING.md`

---

**Last Updated**: 2025-11-22  
**Next Review**: After first production deployment
