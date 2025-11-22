# 本番デプロイ準備ガイド（クイックスタート）

**プロジェクト**: Todo Copilot  
**ステータス**: Backend モジュール完成 ✅・本番環境デプロイ準備中  
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

---

## 🚀 デプロイまでの 3 ステップ

> **前提**: AWS CLI が `terraform-dev` プロファイルで認証済みであること

### **ステップ 1️⃣: 準備段階（15-30 分）**

**目標**: AWS アカウント・認証・バックエンド（S3 + DynamoDB）を Terraform で作成

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

### **ステップ 2️⃣: 検証段階（20-45 分、推奨）**

**目標**: ローカル環境での統合テスト・Terraform lint・セキュリティスキャンを実行

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

### **ステップ 3️⃣: 本番デプロイ段階（30-60 分、承認必須）**

**目標**: AWS 本番環境にアプリケーションリソースを作成（Backend 作成後）

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
# 🔹 Dev 環境
terraform workspace select dev
terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan
terraform show plan-dev.tfplan | head -20
terraform apply plan-dev.tfplan

# 🔹 Staging 環境（オプション、本番前のテスト）
# terraform workspace select staging
# terraform plan -var-file=environments/staging.tfvars -out=plan-staging.tfplan
# terraform apply plan-staging.tfplan

# 🔹 本番環境（⚠️ 特に慎重に、人間による review・approval を必須に）
# terraform workspace select prod
# terraform plan -var-file=environments/prod.tfvars -out=plan-prod.tfplan
# terraform show -json plan-prod.tfplan | jq '.resource_changes[] | select(.change.actions[] == "delete")'
# # ☝️ 削除対象がないか確認
# terraform apply plan-prod.tfplan

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

## ✅ チェックリスト（実施前の確認）

**デプロイ前に以下を確認してください：**

- [ ] AWS CLI が `terraform-dev` プロファイルで認証できる（`aws sts get-caller-identity --profile terraform-dev`）
- [ ] `terraform-bootstrap/` で S3 backend バケット・DynamoDB lock table が作成されている
- [ ] Backend 設定ファイル（`terraform/backend-config.hcl`）が作成・コピーされている
- [ ] `terraform init -backend-config=backend-config.hcl -reconfigure` が成功している
- [ ] `terraform validate` が成功している（構文OK）
- [ ] `terraform fmt -check` が成功している（フォーマットOK）
- [ ] `npm test` が全て PASS している（338+ tests）
- [ ] `terraform plan -var-file=environments/dev.tfvars` が期待通りの変更を表示している
- [ ] Plan 出力に破壊的変更（`destroy`）がないことを確認している
- [ ] PR レビューが完了している（本番環境）
- [ ] Rollback 手順を理解している（`infrastructure/docs/DISASTER_RECOVERY.md`）
- [ ] 監視・ログダッシュボードが設定されている

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

デプロイ完了後、以下を確認してください：

```bash
# 設定
export AWS_PROFILE=terraform-dev
export AWS_REGION=ap-northeast-1

# 1. Terraform State 確認
cd infrastructure/terraform
terraform state list  # リソース一覧
terraform output      # Output 確認

# 2. AWS リソース確認
aws lambda list-functions --profile terraform-dev --region $AWS_REGION --query 'Functions[?contains(FunctionName, `todo`)]'
aws dynamodb list-tables --profile terraform-dev --region $AWS_REGION
aws apigateway get-rest-apis --profile terraform-dev --region $AWS_REGION

# 3. ログ確認
aws logs describe-log-groups --profile terraform-dev --region $AWS_REGION | grep todo-copilot

# 4. E2E テスト実行（オプション）
cd /workspaces/todo-copilot
npm run test:e2e

# 5. Constitution Check（推奨）
bash infrastructure/scripts/constitution-check.sh
```

---

## 📞 サポート & 参照

- **Terraform 公式**: https://www.terraform.io/docs
- **AWS ベストプラクティス**: https://docs.aws.amazon.com/
- **プロジェクトリポジトリ**: https://github.com/aki-motty/todo-copilot
- **Issue トラッカー**: GitHub Issues

---

## 🔧 追加情報

### AWS Profile & 環境変数
- **ローカル開発**: `AWS_PROFILE=terraform-dev`（ステップ 1 で設定）
- **本番環境**: 別の IAM ロール / MFA 設定推奨

### Backend モジュール
- **場所**: `infrastructure/terraform-bootstrap/`
- **作成物**: S3 bucket（versioning・encryption 有効）、DynamoDB lock table
- **初期化**: ワンタイムセットアップ用、State は Local で管理

### メイン Terraform
- **場所**: `infrastructure/terraform/`
- **Backend**: S3 + DynamoDB（`bootstrap/` で作成）
- **State**: S3 に保存・管理、DynamoDB による lock 機構

### 次のステップ（本番前）
- [ ] GitHub Actions OIDC 信頼ポリシー設定（CI から assume する場合）
- [ ] IAM ロール・ポリシーレビュー（最小権限原則の確認）
- [ ] KMS キー作成（S3・DynamoDB 暗号化用）
- [ ] CloudTrail・CloudWatch Logs 設定

---

**Last Updated**: 2025-11-22  
**Next Review**: After first production deployment  
**Maintainer**: DevOps / Infrastructure Team
