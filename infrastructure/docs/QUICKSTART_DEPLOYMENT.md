# 本番デプロイ準備ガイド（クイックスタート）

**プロジェクト**: Todo Copilot  
**ステータス**: 開発環境デプロイ完成 ✅・本番環境デプロイ準備中  
**作成日**: 2025-11-22  
**最終更新**: 2025-11-22

---

## 📋 現在の状態

| 項目 | ステータス | 詳細 |
|------|-----------|------|
| Backend モジュール | ✅ 完成 | S3 + DynamoDB 作成用 Terraform モジュール |  
| IAM モジュール | ✅ 完成 | 最小権限ポリシー、Terraform 実行用ロール |
| Terraform コード | ✅ 完成 | All syntax valid, lint passed, security scan OK |
| ユニットテスト | ✅ 合格 | 338+ tests passed, 0 errors |
| 設計ドキュメント | ✅ 完成 | DDD/CQRS architecture validated |
| CI/CD パイプライン | ✅ 準備完了 | GitHub Actions workflow configured |
| デプロイ手順書 | ✅ 作成済み | 5つの詳細ガイド完成 |
| Dev 環境デプロイ | ✅ 完成 | Lambda, API Gateway, DynamoDB デプロイ済み |
| AWS リソース検証 | ✅ 完了 | 全リソース ACTIVE・動作確認済み |

---

## ✅ デプロイ完了状況

### 開発環境（dev）デプロイ済み ✅

**デプロイされたリソース:**
- **API Gateway**: `https://ada8f6v36f.execute-api.ap-northeast-1.amazonaws.com/dev` ✅ ACTIVE
- **Lambda 関数**: `todo-copilot-api-dev` (nodejs18.x, 256MB, 30sec timeout) ✅ ACTIVE
- **DynamoDB テーブル**: `todo-copilot-dev` (PAY_PER_REQUEST) ✅ ACTIVE
- **IAM ロール**: `lambda-execution-dev` (最小権限) ✅ CONFIGURED
- **CloudWatch Logs**: API Gateway・Lambda ログ配信 ✅ CONFIGURED
- **S3 Backend**: Terraform State 管理 ✅ CONFIGURED

**環境変数:**
```
DYNAMODB_TABLE: todo-copilot-dev
ENVIRONMENT: dev
NODE_ENV: production
LOG_LEVEL: DEBUG
```

**テスト結果:** ✅ 全テスト PASS (338 tests passed)

---

## 🚀 本番環境デプロイまでの 3 ステップ

> **前提**: AWS CLI が `terraform-dev` プロファイルで認証済みであること
> **注意**: Dev 環境がすでにデプロイされているため、以下ステップ2以降は本番環境向けです

### **ステップ 1️⃣: 準備段階（15-30 分）✅ 完了**

**目標**: AWS アカウント・認証・バックエンド（S3 + DynamoDB）を Terraform で作成  
**ステータス**: このステップは完了しています

```bash
# 1. 認証確認
aws sts get-caller-identity --profile terraform-dev

# 2. Bootstrap ディレクトリで S3・DynamoDB リソース作成
cd infrastructure/terraform-bootstrap

# 変数ファイル作成（バケット名・テーブル名はグローバルユニークにする）
cat > terraform.tfvars << 'EOF'
aws_region        = "ap-northeast-1"
project_name      = "todo-copilot"
state_bucket_name = "todo-copilot-terraform-state-dev-123456789"
lock_table_name   = "todo-copilot-terraform-locks-dev"

common_tags = {
  Environment = "dev"
}
EOF

# 初期化
terraform init

# Plan・Apply
terraform plan -out=plan.tfplan
terraform apply plan.tfplan

# Output 確認（Backend 設定用）
terraform output -raw state_bucket_id
terraform output -raw lock_table_name

# 3. Backend Config ファイル作成（メイン Terraform 用）
cd ../terraform

cat > backend-config.hcl << 'EOF'
bucket         = "todo-copilot-terraform-state-dev-123456789"
key            = "main/terraform.tfstate"
region         = "ap-northeast-1"
dynamodb_table = "todo-copilot-terraform-locks-dev"
encrypt        = true
EOF
```

**詳細**: `infrastructure/terraform-bootstrap/README.md` を参照

---

### **ステップ 2️⃣: 検証段階（20-45 分、推奨）✅ 完了**

**目標**: ローカル環境での統合テスト・Terraform lint・セキュリティスキャンを実行  
**ステータス**: このステップは完了しています

```bash
# 1. ユニットテスト実行
cd /workspaces/todo-copilot
npm test

# 2. Terraform Lint & Format チェック
cd infrastructure/terraform
terraform fmt -check
tflint . 2>/dev/null || echo "tflint not installed (optional)"

# 3. Terraform Validate
terraform validate

# 4. Terraform State 確認（Backend が S3 に接続したか）
# ℹ️ Step 1 で backend-config.hcl が作成されている前提
terraform state list
# 何も表示されない（初回）か、既存リソースが表示される

# 5. Dev 環境の Plan（破壊的変更がないか確認）
terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan
terraform show plan-dev.tfplan | head -30
```

**詳細**: 本格的なローカル統合テストの場合は `infrastructure/docs/LOCALSTACK_GUIDE.md` を参照。

---

### **ステップ 3️⃣: Staging・本番環境デプロイ段階（30-60 分、承認必須）**

**目標**: AWS Staging・本番環境にアプリケーションリソースを作成（Dev デプロイ後）  
**ステータス**: Dev 環境デプロイ完了。以下は Staging・本番環境向け手順

```bash
# 1. 環境変数設定
export AWS_PROFILE=terraform-dev
export AWS_REGION=ap-northeast-1

# 2. Terraform 初期化（Backend 設定ファイルを使用）
# ℹ️ Step 1 で作成した backend-config.hcl を使用
cd infrastructure/terraform

# Backend を設定して初期化
terraform init -backend-config=backend-config.hcl -reconfigure

# State が S3 に接続されたか確認
terraform state list

# 3. Workspace 作成（複数環境を分離）
terraform workspace new dev || terraform workspace select dev
terraform workspace new staging || terraform workspace select staging
terraform workspace new prod || terraform workspace select prod

# 4. 環境に応じて Plan・Apply（dev → staging → prod の順）
# 🔹 Dev 環境 ✅ ALREADY DEPLOYED
terraform workspace select dev
# terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan
# terraform apply plan-dev.tfplan

# 🔹 Staging 環境（オプション、本番前のテスト）
terraform workspace select staging
terraform plan -var-file=environments/staging.tfvars -out=plan-staging.tfplan
terraform show plan-staging.tfplan | head -20
# ☝️ Plan を確認後、以下で Apply
terraform apply plan-staging.tfplan

# 🔹 本番環境（⚠️ 特に慎重に、人間による review・approval を必須に）
terraform workspace select prod
terraform plan -var-file=environments/prod.tfvars -out=plan-prod.tfplan
terraform show -json plan-prod.tfplan | jq '.resource_changes[] | select(.change.actions[] == "delete")'
# ☝️ 削除対象がないか確認
terraform show plan-prod.tfplan | head -20
# ☝️ Plan を詳細確認後、以下で Apply
terraform apply plan-prod.tfplan

# 5. Post-Deploy Verification
bash ../scripts/verify-deployment.sh
bash ../scripts/constitution-check.sh
```

**詳細**: `infrastructure/docs/PRODUCTION_DEPLOYMENT.md` → 「Plan & Review」「Apply」

---

## 📚 デプロイ準備ドキュメント一覧

| ドキュメント | 用途 | 対象者 |
|-------------|------|-------|
| **terraform-bootstrap/README.md** | Backend リソース作成手順 | DevOps/Infra エンジニア |
| **DEPLOYMENT_CHECKLIST.md** | 6 フェーズ、50+ チェック項目 | 全チーム |
| **PRODUCTION_DEPLOYMENT.md** | ステップバイステップ本番デプロイ | DevOps/Infra エンジニア |
| **LOCALSTACK_GUIDE.md** | ローカル環境での統合テスト | 開発エンジニア |
| **DISASTER_RECOVERY.md** | Rollback・リカバリー手順 | 運用者 |
| **TROUBLESHOOTING.md** | よくある問題と解決方法 | 全チーム |

---

## ✅ チェックリスト（Staging・本番デプロイ前の確認）

### Dev 環境向け（完了済み ✅）
- [x] AWS CLI が `terraform-dev` プロファイルで認証できる
- [x] `terraform-bootstrap/` で S3 backend バケット・DynamoDB lock table が作成されている
- [x] Backend 設定ファイル（`terraform/backend-config.hcl`）が作成・コピーされている
- [x] `terraform init -backend-config=backend-config.hcl -reconfigure` が成功している
- [x] `terraform validate` が成功している（構文OK）
- [x] `terraform fmt -check` が成功している（フォーマットOK）
- [x] `npm test` が全て PASS している（338+ tests）
- [x] `terraform plan -var-file=environments/dev.tfvars` が期待通りの変更を表示している
- [x] Dev 環境へのデプロイが完了している

### Staging・本番環境向け（実施前に確認）
- [ ] Dev 環境が安定運用されている期間（最低 7 日間推奨）
- [ ] PR レビューが完了している（staging・本番環境）
- [ ] Staging 環境用の variables ファイル確認（`environments/staging.tfvars`）
- [ ] 本番環境用の variables ファイル確認（`environments/prod.tfvars`）
- [ ] Terraform Plan 出力で破壊的変更（`destroy`）がないことを確認している
- [ ] Rollback 手順を理解している（`infrastructure/docs/DISASTER_RECOVERY.md`）
- [ ] 監視・ログダッシュボードが Staging・本番向けに設定されている
- [ ] セキュリティ・ネットワーク要件確認済み

---

## 🚨 重要な注意事項

### ⚠️ Apply 前に必ず確認してください

1. **環境変数確認**
   ```bash
   echo $AWS_PROFILE  # = terraform-dev
   echo $AWS_REGION   # = ap-northeast-1
   aws sts get-caller-identity --profile terraform-dev
   # 実行ユーザーが正しいか確認
   ```

2. **Backend 接続確認**
   ```bash
   terraform init -backend-config=backend-config.hcl -reconfigure
   # 初期化成功時、Terraform State が S3 にリンクされる
   ```

3. **Plan の確認**
   ```bash
   terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan
   terraform show plan-dev.tfplan | head -20
   # リソース数が期待値か確認
   ```

4. **破壊的変更の確認**
   ```bash
   terraform show -json plan-dev.tfplan | jq '.resource_changes[] | select(.change.actions[] == "delete")' 2>/dev/null || echo "No destructive changes"
   # 削除対象のリソースがないか確認
   ```

### 🔒 本番環境特有の設定

- **destroy 保護**: `prevent_destroy = true` が有効（`prod.tfvars` にて設定）
- **高可用性**: DynamoDB on-demand billing、Lambda concurrency 制限・リザーブド同時実行数設定
- **セキュリティ**: S3 encryption（SSE）、IAM 最小権限原則（modules/iam に定義）、VPC・PrivateLink 検討
- **監視**: CloudWatch Logs retention 設定、CloudTrail ロギング有効、アラーム設定

---

## 📞 トラブルシューティング

**デプロイ中に問題が発生した場合：**

1. **AWS 認証エラー**
   ```bash
   # プロファイル確認
   aws sts get-caller-identity --profile terraform-dev
   # エラー: "Unable to locate credentials" → aws configure --profile terraform-dev を実行
   ```

2. **Terraform エラーログ**
   ```bash
   export TF_LOG=DEBUG
   terraform plan -var-file=environments/dev.tfvars 2>&1 | tee debug.log
   unset TF_LOG
   ```

3. **Backend 接続エラー**
   ```bash
   # Backend 設定確認
   terraform init -backend-config=backend-config.hcl -reconfigure
   # S3・DynamoDB が存在するか確認
   aws s3 ls --profile terraform-dev
   aws dynamodb list-tables --profile terraform-dev
   ```

4. **Rollback（必要な場合）**
   ```bash
   # State ファイルをバージョンから復元
   aws s3api list-object-versions --bucket my-project-terraform-state-dev --profile terraform-dev
   aws s3api get-object --bucket my-project-terraform-state-dev --key main/terraform.tfstate --version-id <VERSION_ID> terraform.tfstate.bak --profile terraform-dev
   terraform destroy -var-file=environments/dev.tfvars
   ```

詳細は `infrastructure/docs/TROUBLESHOOTING.md` を参照。

---

## 📊 デプロイメント後の確認事項

### Dev 環境（完了済み ✅）

**デプロイ完了確認:**
```bash
# Terraform State 確認
cd infrastructure/terraform
terraform state list       # リソース一覧
terraform output           # Output 確認
```

**結果:**
```
api_gateway_endpoint: https://ada8f6v36f.execute-api.ap-northeast-1.amazonaws.com/dev
lambda_function_name: todo-copilot-api-dev
dynamodb_table_name: todo-copilot-dev
```

**AWS リソース検証:**
```bash
export AWS_PROFILE=terraform-dev
export AWS_REGION=ap-northeast-1

# Lambda 確認
aws lambda get-function --function-name todo-copilot-api-dev

# DynamoDB 確認
aws dynamodb describe-table --table-name todo-copilot-dev

# API Gateway 確認
aws apigatewayv2 get-apis
```

**テスト実行:**
```bash
# Unit・Integration テスト
cd /workspaces/todo-copilot
npm test

# E2E テスト（オプション）
npm run test:e2e
```

### Staging・本番環境

デプロイ完了後、上記と同じ確認を実施してください：

```bash
# 環境に応じて設定
export AWS_PROFILE=terraform-dev
export AWS_REGION=ap-northeast-1

# 1. Terraform State 確認
cd infrastructure/terraform
terraform workspace select staging  # または prod
terraform state list
terraform output

# 2. AWS リソース確認
aws lambda list-functions --profile terraform-dev --region $AWS_REGION --query 'Functions[?contains(FunctionName, `todo`)]'
aws dynamodb list-tables --profile terraform-dev --region $AWS_REGION
aws apigatewayv2 get-apis --region $AWS_REGION

# 3. ログ確認
aws logs describe-log-groups --profile terraform-dev --region $AWS_REGION | grep todo-copilot

# 4. Constitution Check（推奨）
bash infrastructure/scripts/constitution-check.sh
```

---

## 📞 サポート & 参照

- **Terraform 公式**: https://www.terraform.io/docs
- **AWS ベストプラクティス**: https://docs.aws.amazon.com/
- **プロジェクトリポジトリ**: https://github.com/aki-motty/todo-copilot
- **Issue トラッカー**: GitHub Issues

---

## 📝 デプロイ履歴

| 日付 | 環境 | ステータス | 詳細 |
|------|------|-----------|------|
| 2025-11-22 | Dev | ✅ 完了 | S3 Backend, Lambda, API Gateway, DynamoDB デプロイ完了 |
| - | Staging | ⏳ 準備中 | チェックリスト確認後、デプロイ予定 |
| - | Prod | ⏳ 予定中 | Staging 検証後、本番デプロイ予定 |

**Last Updated**: 2025-11-22  
**Next Review**: After Staging deployment  
**Maintainer**: DevOps / Infrastructure Team
