#!/bin/bash

# AWS CLI Configuration Script
# このスクリプトは terraform-dev プロファイルを自動設定します

set -e

echo "🔐 AWS CLI Configuration Setup"
echo "=============================="
echo ""

# ディレクトリ作成
mkdir -p ~/.aws

# 認証情報の入力を促す
echo "AWS 認証情報を入力してください（IAM コンソールから取得）:"
echo ""
read -p "✓ AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -sp "✓ AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
echo ""
echo ""

# ~/.aws/credentials に設定を追加
echo "[terraform-dev]" >> ~/.aws/credentials
echo "aws_access_key_id = $AWS_ACCESS_KEY_ID" >> ~/.aws/credentials
echo "aws_secret_access_key = $AWS_SECRET_ACCESS_KEY" >> ~/.aws/credentials
echo "" >> ~/.aws/credentials

# ~/.aws/config に設定を追加
if [ ! -f ~/.aws/config ]; then
  touch ~/.aws/config
fi

echo "[profile terraform-dev]" >> ~/.aws/config
echo "region = ap-northeast-1" >> ~/.aws/config
echo "output = json" >> ~/.aws/config
echo "" >> ~/.aws/config

# 権限設定
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

# 検証
echo "✅ AWS CLI 設定完了"
echo ""
echo "検証中..."
aws sts get-caller-identity --profile terraform-dev

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 認証成功！"
  echo ""
  echo "これで以下のコマンドが使用可能になります:"
  echo "  aws lambda list-functions --profile terraform-dev"
  echo "  aws dynamodb list-tables --profile terraform-dev"
  echo "  terraform plan -var-file=environments/dev.tfvars"
else
  echo ""
  echo "❌ 認証失敗。アクセスキーを確認してください。"
  exit 1
fi
