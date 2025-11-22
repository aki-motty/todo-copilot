# Bootstrap Guide - Terraform State Management Resources

このディレクトリはワンタイムセットアップ用です。S3 バケット・DynamoDB テーブルを作成してメイン Terraform の backend を準備します。

## 前提条件

- AWS CLI が `terraform-dev` プロファイルで認証済み
- `terraform >= 1.6` がインストール済み
- S3 バケット名とリージョンが決定済み

## 実行手順

### 1. 変数ファイル作成

`terraform.tfvars` を作成してリソース情報を指定します：

```bash
cd /workspaces/todo-copilot/infrastructure/terraform-bootstrap

cat > terraform.tfvars << 'EOF'
aws_region        = "ap-northeast-1"
project_name      = "todo-copilot"
state_bucket_name = "todo-copilot-terraform-state-dev-123456789"  # グローバルユニーク
lock_table_name   = "todo-copilot-terraform-locks-dev"

common_tags = {
  Environment = "dev"
  Team        = "DevOps"
}
EOF
```

> **注意**: `state_bucket_name` はグローバルでユニークである必要があります。例: `<project>-terraform-state-<env>-<account-id>`

### 2. 初期化・Plan・Apply

```bash
# AWS プロファイルを設定
export AWS_PROFILE=terraform-dev

# 初期化
terraform init

# Plan を実行
terraform plan -out=plan.tfplan

# Apply
terraform apply plan.tfplan

# Output を確認
terraform output -json
```

### 3. Backend Config ファイルの作成

Apply 成功後、メイン Terraform directory の Backend 設定ファイルを作成：

```bash
# Output から Backend 設定を取得
terraform output -json backend_config | jq -r 'to_entries[] | "\(.key) = \(.value | @json)"' > ../terraform/backend-config.hcl

# または手動作成
cat > ../terraform/backend-config.hcl << 'EOF'
bucket         = "todo-copilot-terraform-state-dev-123456789"
key            = "main/terraform.tfstate"
region         = "ap-northeast-1"
dynamodb_table = "todo-copilot-terraform-locks-dev"
encrypt        = true
EOF
```

### 4. メイン Terraform を初期化

```bash
cd ../terraform

# Backend config を指定して初期化
terraform init -backend-config=backend-config.hcl -reconfigure

# これで State が S3 に保存されます
terraform state list
```

## 次のステップ

1. `infrastructure/terraform/` で `terraform plan/apply` を実行してアプリケーションリソースをデプロイ
2. State ファイルが S3 に保存・ロック管理されることを確認
3. `terraform-bootstrap/` は保存しておく（バックアップ・再作成時に必要）

## 注意事項

- **Local State**: `terraform-bootstrap/` は Local State を使用します（`.terraform/terraform.tfstate`）
- **ワンタイム**: 通常、このディレクトリはセットアップ後は使用しません
- **Backup**: State ファイル（`.terraform/terraform.tfstate`）はバックアップしておくことを推奨
- **Destroy**: `terraform destroy` は慎重に実行してください（S3・DynamoDB が削除されます）

---

**Last Updated**: 2025-11-22  
**Related Docs**: `../docs/QUICKSTART_DEPLOYMENT.md`, `../docs/PRODUCTION_DEPLOYMENT.md`
