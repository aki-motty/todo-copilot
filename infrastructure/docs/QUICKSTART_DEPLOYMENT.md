# 本番デプロイ準備ガイド（クイックスタート）

**プロジェクト**: Todo Copilot  
**ステータス**: デプロイ準備完了 ✅  
**作成日**: 2025-11-22

---

## 📋 現在の状態

| 項目 | ステータス | 詳細 |
|------|-----------|------|
| Terraform コード | ✅ 完成 | All syntax valid, lint passed, security scan OK |
| ユニットテスト | ✅ 合格 | 338/338 tests passed, 0 errors |
| 設計ドキュメント | ✅ 完成 | DDD/CQRS architecture validated |
| CI/CD パイプライン | ✅ 準備完了 | GitHub Actions workflow configured |
| デプロイ手順書 | ✅ 作成済み | 3つの詳細ガイド完成 |

---

## 🚀 本番デプロイまでの 3 ステップ

### **ステップ 1️⃣: 準備段階（15-30 分）**

**目標**: AWS アカウント・認証・バックエンドを準備

```bash
# 1. AWS CLI クレデンシャル設定
aws configure --profile terraform-admin

# 2. 認証確認
aws sts get-caller-identity

# 3. S3 Backend バケット作成（初回のみ）
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3api create-bucket \
  --bucket todo-copilot-terraform-backend-${ACCOUNT_ID} \
  --region ap-northeast-1

# 4. DynamoDB Lock Table 作成（初回のみ）
aws dynamodb create-table \
  --table-name todo-copilot-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

**詳細**: `infrastructure/docs/PRODUCTION_DEPLOYMENT.md` → 「認証・バックエンド準備」

---

### **ステップ 2️⃣: 検証段階（20-45 分、推奨）**

**目標**: LocalStack でリソース・ワークフロー全体を検証

```bash
# 1. LocalStack 起動
cd infrastructure
docker-compose up -d

# 2. LocalStack 用 Backend リソース作成
export LOCALSTACK_ENDPOINT=http://localhost:4566

aws s3api create-bucket \
  --bucket todo-copilot-terraform-state \
  --endpoint-url $LOCALSTACK_ENDPOINT

aws dynamodb create-table \
  --table-name todo-copilot-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url $LOCALSTACK_ENDPOINT

# 3. Terraform Plan & Apply
cd infrastructure/terraform
terraform init -reconfigure
terraform plan -var-file=environments/dev.tfvars -var="use_localstack=true"
terraform apply

# 4. 検証スクリプト実行
bash ../scripts/verify-localstack.sh

# 5. 統合テスト
npm test -- aws-integration.spec.ts

# 6. LocalStack 停止
docker-compose down
```

**詳細**: `infrastructure/docs/LOCALSTACK_GUIDE.md`

---

### **ステップ 3️⃣: 本番デプロイ段階（30-60 分、承認必須）**

**目標**: AWS 本番環境にリソース作成

```bash
# 1. 環境変数設定
export AWS_PROFILE=terraform-admin
export AWS_REGION=ap-northeast-1

# 2. Terraform 初期化（本番 Backend）
cd infrastructure/terraform
terraform init -reconfigure

# 3. Workspace 作成
terraform workspace new dev || terraform workspace select dev
terraform workspace new staging || terraform workspace select staging
terraform workspace new prod || terraform workspace select prod

# 4. Plan 実行（各環境）
terraform plan -var-file=environments/dev.tfvars -out=plan-dev.tfplan
terraform plan -var-file=environments/staging.tfvars -out=plan-staging.tfplan
terraform plan -var-file=environments/prod.tfvars -out=plan-prod.tfplan

# 5. Plan 確認（破壊的変更がないか確認）
terraform show plan-prod.tfplan | grep -E "Plan:|destroy"

# 6. Apply 実行（dev → staging → prod の順）
terraform workspace select dev && terraform apply plan-dev.tfplan
terraform workspace select staging && terraform apply plan-staging.tfplan
terraform workspace select prod && terraform apply plan-prod.tfplan

# 7. Post-Deploy Verification
bash ../scripts/verify-deployment.sh
bash ../scripts/constitution-check.sh
```

**詳細**: `infrastructure/docs/PRODUCTION_DEPLOYMENT.md` → 「Plan & Review」「Apply」

---

## 📚 デプロイ準備ドキュメント一覧

| ドキュメント | 用途 | 対象者 |
|-------------|------|-------|
| **DEPLOYMENT_CHECKLIST.md** | 6 フェーズ、50+ チェック項目 | 全チーム |
| **PRODUCTION_DEPLOYMENT.md** | ステップバイステップ本番デプロイ | DevOps/Infra エンジニア |
| **LOCALSTACK_GUIDE.md** | ローカル環境での統合テスト | 開発エンジニア |
| **BACKEND.md** | State 管理・バックエンド設定 | 運用者 |
| **DISASTER_RECOVERY.md** | Rollback・リカバリー手順 | 運用者 |
| **TROUBLESHOOTING.md** | よくある問題と解決方法 | 全チーム |

---

## ✅ チェックリスト（実施前の確認）

**デプロイ前に以下を確認してください：**

- [ ] AWS アカウント・認証情報が正しく設定されている
- [ ] S3 backend バケット・DynamoDB lock table が作成されている
- [ ] `terraform validate` が成功している（構文OK）
- [ ] `terraform fmt -check` が成功している（フォーマットOK）
- [ ] `tflint` / `checkov` でセキュリティ警告がない
- [ ] `npm test` が全て PASS している
- [ ] LocalStack でのテストが全て PASS している（推奨）
- [ ] PR レビューが完了している（本番環境）
- [ ] Rollback 手順を理解している
- [ ] 監視・ログダッシュボードが設定されている

---

## 🚨 重要な注意事項

### ⚠️ 本番環境での Apply 前に必ず確認してください

1. **Terraform Plan の確認**
   ```bash
   terraform show plan-prod.tfplan | grep "Plan:"
   # リソース数が期待値か確認
   ```

2. **破壊的変更の確認**
   ```bash
   terraform show -json plan-prod.tfplan | jq '.resource_changes[] | select(.change.actions[] == "delete")'
   # 削除対象のリソースがないか確認
   ```

3. **IAM 権限の確認**
   ```bash
   aws sts get-caller-identity
   # 実行ユーザーが正しいか確認
   ```

4. **バックアップ作成**
   ```bash
   aws s3 cp s3://todo-copilot-terraform-backend-<ACCOUNT>/prod/terraform.tfstate \
     ~/terraform-state-backup-$(date +%Y%m%d-%H%M%S)
   ```

### 🔒 本番環境特有の設定

- **destroy 保護**: `prevent_destroy = true` が有効
- **高可用性**: DynamoDB on-demand billing、Lambda concurrency 設定
- **セキュリティ**: S3 encryption、IAM 最小権限原則
- **監視**: CloudWatch Logs、CloudTrail ロギング有効

---

## 📞 トラブルシューティング

**デプロイ中に問題が発生した場合：**

1. **エラーログを確認**
   ```bash
   export TF_LOG=DEBUG
   terraform plan -var-file=environments/prod.tfvars 2>&1 | tee debug.log
   ```

2. **AWS CLI でリソース確認**
   ```bash
   aws lambda list-functions
   aws dynamodb list-tables
   aws apigateway get-rest-apis
   ```

3. **Rollback（必要な場合）**
   ```bash
   # 前の State 復元
   aws s3 cp s3://.../<version-id> terraform.tfstate
   terraform destroy -var-file=environments/prod.tfvars
   ```

詳細は `infrastructure/docs/TROUBLESHOOTING.md` を参照。

---

## 📊 デプロイメント後の確認事項

デプロイ完了後、以下を確認してください：

```bash
# 1. リソース作成確認
aws lambda list-functions --query 'Functions[?contains(FunctionName, `todo`)]'
aws dynamodb list-tables
aws apigateway get-rest-apis

# 2. ログ確認
aws logs tail /aws/lambda/todo-copilot-prod --follow

# 3. メトリクス確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=todo-copilot-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# 4. E2E テスト実行
npm run test:e2e
```

---

## 📞 サポート & 参照

- **Terraform 公式**: https://www.terraform.io/docs
- **AWS ベストプラクティス**: https://docs.aws.amazon.com/
- **プロジェクトリポジトリ**: https://github.com/aki-motty/todo-copilot
- **Issue トラッカー**: GitHub Issues

---

**Last Updated**: 2025-11-22  
**Next Review**: After first production deployment  
**Maintainer**: DevOps / Infrastructure Team
