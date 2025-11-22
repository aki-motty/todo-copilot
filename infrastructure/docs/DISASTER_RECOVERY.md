# Disaster Recovery Guide

**Document**: 災害復旧とリカバリー手順ガイド  
**Target Audience**: DevOps エンジニア、インシデント対応チーム  
**Last Updated**: 2025-11-22  
**Version**: 1.0

---

## 概要

本ドキュメントでは、Terraform インフラストラクチャの障害復旧手順を説明します。

---

## 災害シナリオと対応

### Scenario 1: DynamoDB テーブルの削除

**状況**: 本番環境の DynamoDB テーブルが誤削除された

**復旧手順**:

```bash
# 1. ポイントインタイムリカバリ（PITR）を使用
aws dynamodb restore-table-to-point-in-time \
  --source-table-name todo-copilot-prod \
  --target-table-name todo-copilot-prod-restored \
  --restore-date-time 2025-11-22T10:00:00Z \
  --region ap-northeast-1

# 2. テーブルが復旧されるまで待機
aws dynamodb wait table-exists \
  --table-name todo-copilot-prod-restored

# 3. データの検証
aws dynamodb scan \
  --table-name todo-copilot-prod-restored \
  --limit 5

# 4. Terraform に復旧テーブルをインポート
./infrastructure/scripts/import.sh prod \
  aws_dynamodb_table \
  todo-copilot-prod-restored \
  todo_table_restored

# 5. 検証後、名前を変更
aws dynamodb update-table-replica \
  --table-name todo-copilot-prod-restored \
  --replica-updates '[{"RegionName":"ap-northeast-1","Create":{}}]'

# 6. DNS・ロードバランサーを復旧テーブルにポイント
# （詳細な実装は業務処理に依存）

# 7. 監視を復旧テーブルに変更
aws cloudwatch put-metric-alarm \
  --alarm-name prod-dynamodb-restored \
  --metric-name ConsumedWriteCapacityUnits \
  --namespace AWS/DynamoDB \
  --dimensions Name=TableName,Value=todo-copilot-prod-restored
```

**推定復旧時間**: 5-10 分

---

### Scenario 2: Lambda 関数の破損

**状況**: Lambda コードが破損してデプロイされた

**復旧手順**:

```bash
# 1. 前のバージョンを確認
aws lambda list-versions-by-function \
  --function-name todo-copilot-api-prod

# 2. 前のバージョンに切り替え
aws lambda update-alias \
  --function-name todo-copilot-api-prod \
  --name LIVE \
  --function-version 5

# または Terraform ロールバック
git revert HEAD
./infrastructure/scripts/plan.sh prod
./infrastructure/scripts/apply.sh prod --auto-approve

# 3. ヘルスチェック実行
curl https://api.example.com/health
```

**推定復旧時間**: 2-5 分

---

### Scenario 3: Terraform 状態ファイル破損

**状況**: S3 の状態ファイルが破損

**復旧手順**:

```bash
# 1. バージョン履歴から復旧
aws s3api list-object-versions \
  --bucket todo-copilot-terraform-state-prod \
  --key terraform.tfstate

# 2. 前のバージョンをダウンロード
aws s3api get-object \
  --bucket todo-copilot-terraform-state-prod \
  --key terraform.tfstate \
  --version-id "VERSION_ID" \
  terraform.tfstate.recovered

# 3. ローカルキャッシュをリセット
rm -rf infrastructure/terraform/.terraform*

# 4. 復旧ファイルを使用して init
cp terraform.tfstate.recovered infrastructure/terraform/

cd infrastructure/terraform
terraform init -reconfigure

# 5. リソース状態の検証
terraform state list
terraform plan

# 6. 必要に応じてリソースをインポート
terraform import aws_lambda_function.todo_api todo-copilot-api-prod
```

**推定復旧時間**: 10-15 分

---

### Scenario 4: S3 バックエンドバケット削除

**状況**: 状態管理用 S3 バケットが削除された

**復旧手順**:

```bash
# 1. バックアップバケットから復旧
aws s3 cp s3://backup-bucket/terraform-state-backups/terraform.tfstate.20251122 \
  s3://todo-copilot-terraform-state-prod/terraform.tfstate

# 2. バケットの再設定（必要な場合）
./infrastructure/scripts/init.sh prod

# 3. リソース状態の検証
terraform state list

# 4. AWS リソースとの同期確認
terraform plan | head -20

# 5. 継続的バックアップの再設定
aws s3api put-bucket-versioning \
  --bucket todo-copilot-terraform-state-prod \
  --versioning-configuration Status=Enabled
```

**推定復旧時間**: 15-20 分

---

## 復旧優先度

| 優先度 | 障害 | 復旧時間 | 影響範囲 |
|-------|-----|--------|--------|
| **P1** | API 完全ダウン | < 5 分 | 全ユーザー |
| **P1** | データ喪失 | < 10 分 | 業務継続不可 |
| **P2** | API 遅延 | < 30 分 | 部分的影響 |
| **P3** | ログ喪失 | < 1 時間 | 監査のみ |

---

## バックアップスケジュール

```
毎日 2:00 AM (JST)
├── S3 状態ファイル→別バケット
├── DynamoDB→バックアップ作成
├── ログ→S3アーカイブ
└── 検証ジョブ実行
```

---

## 復旧テスト

```bash
# 月 1 回の復旧テスト
./infrastructure/scripts/destroy.sh staging --force
./infrastructure/scripts/init.sh staging
./infrastructure/scripts/apply.sh staging --auto-approve

# DynamoDB 復旧テスト
aws dynamodb restore-table-to-point-in-time \
  --source-table-name todo-copilot-staging \
  --target-table-name todo-copilot-staging-restore-test \
  --restore-date-time $(date -d '1 hour ago' -Iseconds)

# テスト後クリーンアップ
aws dynamodb delete-table --table-name todo-copilot-staging-restore-test
```

---

**作成者**: DevOps チーム  
**最終更新**: 2025-11-22
