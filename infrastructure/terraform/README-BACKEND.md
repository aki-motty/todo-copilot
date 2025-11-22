**Purpose**: このディレクトリには Terraform のステート保管用 S3 バケットと DynamoDB ロックテーブルを作成するためのモジュールが含まれます。

手順（開発者向け、`terraform-dev` プロファイルを使用）:

1. AWS CLI にプロファイルが設定されていることを確認します:

```bash
aws sts get-caller-identity --profile terraform-dev
```

2. 変数を設定して backend を作成します（例）:

```bash
cd infrastructure/terraform

# 例: state バケット名と lock テーブル名はユニークにすること
terraform init
terraform plan -var='state_bucket_name=my-project-terraform-state-dev' -var='lock_table_name=my-project-terraform-locks-dev' -var='region=us-east-1' -out=plan-backend.tfplan
terraform apply -var='state_bucket_name=my-project-terraform-state-dev' -var='lock_table_name=my-project-terraform-locks-dev' -var='region=us-east-1' -auto-approve
```

3. 作成後、`bucket_arn` と `dynamodb_table_arn` を取得し、ルートの `terraform` 設定で backend を構成してください。

注意:
- S3 バケット名はグローバルでユニークである必要があります。
- 本番環境ではバージョニングと暗号化、適切な KMS キーの利用を検討してください。
