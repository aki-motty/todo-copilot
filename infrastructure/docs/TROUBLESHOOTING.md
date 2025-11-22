# Troubleshooting Guide

**Document**: よくある問題と解決方法  
**Target Audience**: 全チームメンバー  
**Last Updated**: 2025-11-22  
**Version**: 1.0

---

## AWS CLI エラー

### "Unable to locate credentials"

```bash
# 原因: AWS 認証情報が設定されていない

# 解決策 1: AWS CLI 設定
aws configure

# 解決策 2: 環境変数を使用
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=ap-northeast-1

# 確認
aws sts get-caller-identity
```

### "UnauthorizedOperation"

```bash
# 原因: IAM 権限不足

# 解決策:
# 1. ユーザー権限を確認
aws iam list-attached-user-policies --user-name [USERNAME]

# 2. 必要なポリシーをアタッチ
aws iam attach-user-policy \
  --user-name [USERNAME] \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# 一時的: root アカウントで操作
```

---

## Terraform エラー

### "Error acquiring the state lock"

```bash
# 原因: 別のプロセスが状態ロックを保持中

# 解決策 1: 実行中の操作を待つ
sleep 30
terraform plan

# 解決策 2: タイムアウト後に強制解除
terraform force-unlock [LOCK_ID]

# 解決策 3: DynamoDB から直接削除（最終手段）
aws dynamodb delete-item \
  --table-name terraform-lock-dev \
  --key '{"LockID":{"S":"todo-copilot/terraform.tfstate"}}'
```

### "Error reading state file"

```bash
# 原因: 状態ファイル破損、アクセス権限不足

# 解決策 1: キャッシュをリセット
rm -rf .terraform/

# 解決策 2: S3 から再ダウンロード
aws s3 cp s3://bucket/terraform.tfstate ./terraform.tfstate.backup
terraform init -reconfigure

# 解決策 3: 前のバージョンから復旧
aws s3api list-object-versions --bucket bucket --key terraform.tfstate
aws s3api get-object --bucket bucket --key terraform.tfstate \
  --version-id VERSION_ID terraform.tfstate.old
```

### "Resource has been deleted externally"

```bash
# 原因: AWS リソースが Terraform の管理外で削除

# 解決策 1: 状態をリフレッシュ
terraform refresh

# 解決策 2: 状態から削除してインポート
terraform state rm aws_lambda_function.todo_api
terraform import aws_lambda_function.todo_api todo-copilot-api-prod

# 解決策 3: リソースを再作成
terraform apply -auto-approve
```

### "Invalid backend configuration"

```bash
# 原因: バックエンド設定が正しくない

# 解決策 1: init.sh スクリプトを使用
./infrastructure/scripts/init.sh dev

# 解決策 2: 手動で設定
cd infrastructure/terraform
terraform init \
  -backend-config="bucket=todo-copilot-terraform-state-dev" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=ap-northeast-1" \
  -backend-config="dynamodb_table=terraform-lock-dev"
```

---

## Lambda エラー

### "Function code size exceeds maximum allowed size"

```bash
# 原因: Lambda 関数パッケージが大きすぎる

# 解決策 1: 依存関係を削除
npm prune --production

# 解決策 2: esbuild で最適化
npm install --save-dev esbuild
esbuild index.ts --bundle --minify --outfile=dist/index.js

# 解決策 3: Lambda レイヤーを使用
aws lambda publish-layer-version \
  --layer-name dependencies \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs18.x
```

### "Function timeout exceeded"

```bash
# 原因: Lambda 実行時間が制限を超えた

# 解決策 1: タイムアウト値を増加
terraform apply -var="lambda_timeout=300"

# 解決策 2: 非同期処理に変更
# 同期 → 非同期 (SQS/SNS)

# 解決策 3: メモリを増加（CPUも増加）
terraform apply -var="lambda_memory_size=1024"
```

---

## DynamoDB エラー

### "Throughput exceeds the current capacity"

```bash
# 原因: DynamoDB のスループット制限に達した

# 解決策 1: テーブル設定を確認
aws dynamodb describe-table --table-name todo-copilot-dev

# 解決策 2: 容量を増加
aws dynamodb update-table \
  --table-name todo-copilot-dev \
  --billing-mode PAY_PER_REQUEST

# 解決策 3: キャッシュを追加
aws elasticache create-cache-cluster \
  --cache-cluster-id todo-cache \
  --engine memcached
```

### "Item size has exceeded the maximum allowed size"

```bash
# 原因: DynamoDB 項目が 400KB を超えている

# 解決策 1: 大きなデータを S3 に移動
# 参照: S3 URL を DynamoDB に保存

# 解決策 2: データを分割
# 1つの項目 → 複数の項目に分割

# 解決策 3: 圧縮
gzip data | base64 encode
```

---

## API Gateway エラー

### "Unable to integrate Lambda with API Gateway"

```bash
# 原因: Lambda 権限不足

# 解決策 1: Lambda 権限を追加
aws lambda add-permission \
  --function-name todo-copilot-api-dev \
  --statement-id apigateway-access \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com

# 解決策 2: IAM ロール確認
aws iam get-role --role-name lambda-execution-role
```

### "502 Bad Gateway"

```bash
# 原因: Lambda 実行エラー、タイムアウト

# 解決策 1: CloudWatch Logs を確認
aws logs tail /aws/lambda/todo-copilot-api-dev --follow

# 解決策 2: Lambda テスト実行
aws lambda invoke \
  --function-name todo-copilot-api-dev \
  --payload '{"test":"data"}' \
  response.json

# 解決策 3: トレーシングを有効
aws lambda update-function-configuration \
  --function-name todo-copilot-api-dev \
  --tracing-config Mode=Active
```

---

## ネットワークエラー

### "Unable to connect to S3 backend"

```bash
# 原因: ネットワーク接続性の問題

# 解決策 1: S3 接続テスト
aws s3 ls

# 解決策 2: VPC エンドポイントを確認
aws ec2 describe-vpc-endpoints

# 解決策 3: DNS 解決
nslookup s3.ap-northeast-1.amazonaws.com
```

### "Connection timeout"

```bash
# 原因: ファイアウォール、リージョン設定

# 解決策 1: リージョン設定を確認
echo $AWS_REGION
aws configure set region ap-northeast-1

# 解決策 2: ファイアウォール設定を確認
# ⚠️ ファイアウォール設定が必要な場合は管理者に連絡
```

---

## パフォーマンス問題

### "Terraform plan is very slow"

```bash
# 原因: リソースが多い、API 呼び出しが遅い

# 解決策 1: 並列処理を増加
terraform plan -parallelism=10

# 解決策 2: ターゲットを限定
terraform plan -target aws_lambda_function.todo_api

# 解決策 3: ローカルに状態をキャッシュ
terraform state pull > state.backup.json
```

---

## デバッグ方法

### Terraform デバッグモード

```bash
# 詳細ログを出力
export TF_LOG=DEBUG
terraform plan

# ファイルに保存
export TF_LOG=DEBUG
export TF_LOG_PATH="./terraform.log"
terraform plan
```

### AWS CLI デバッグ

```bash
# デバッグモードで実行
aws --debug s3 ls

# ログを保存
aws s3 ls --debug 2>&1 | tee aws-debug.log
```

---

## チェックリスト

実装前に以下を確認してください：

- [ ] AWS 認証情報が正しく設定されている
- [ ] IAM 権限が十分である
- [ ] Terraform CLI が 1.6+ にアップデートされている
- [ ] AWS CLI が v2+ にアップデートされている
- [ ] .gitignore に機密情報が含まれている
- [ ] S3 バージョニングが有効になっている
- [ ] DynamoDB ロックテーブルが作成されている
- [ ] CloudTrail が有効になっている（本番環境）

---

**作成者**: DevOps チーム  
**最終更新**: 2025-11-22
