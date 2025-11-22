# 📋 AWS OIDC & GitHub Environment Setup Guide

完全なセットアップ手順書。このガイドに従うことで、AWS OIDC 認証と GitHub 環境保護ルールを設定できます。

## 🎯 目標

- ✅ AWS OIDC プロバイダーを GitHub Actions に登録
- ✅ GitHub リポジトリに秘密を登録
- ✅ GitHub 環境 (develop/staging/production) を作成
- ✅ 環境保護ルール（開発者1人向けの緩い設定）を設定
  - develop: 自動デプロイ（検証用）
  - staging: ブランチ制限のみ（自動デプロイ）
  - production: 自分による1つの承認のみ（完全自動デプロイ防止）

---

## 📋 前提条件

以下がインストール済みであることを確認:

```bash
# Node.js & npm
node --version    # v18.x 以上
npm --version     # 9.x 以上

# Git & GitHub CLI
git --version     # 2.37 以上
gh --version      # 2.x 以上

# AWS CLI
aws --version     # 2.x 以上
```

認証状態を確認:

```bash
# GitHub 認証確認
gh auth status

# AWS 認証確認
aws sts get-caller-identity
```

---

## ⚡ クイックスタート (3 ステップ)

### Step 1: AWS OIDC プロバイダー登録 ✅ (既完了)

AWS OIDC プロバイダーは既に登録済みです:

```bash
# 確認コマンド
aws iam list-open-id-connect-providers
```

出力例:
```json
{
    "OpenIDConnectProviderList": [
        {
            "Arn": "arn:aws:iam::446713282258:oidc-provider/token.actions.githubusercontent.com"
        }
    ]
}
```

### Step 2: GitHub 秘密と環境を登録 (推奨: 自動スクリプト)

#### Option A: 自動スクリプト (推奨) ⭐

GitHub CLI がインストール済みであることを確認:

```bash
gh auth status
# 未認証の場合:
gh auth login
```

自動セットアップスクリプト実行:

```bash
cd /workspaces/todo-copilot

# GitHub CLI を使用して秘密と環境を自動作成
./infrastructure/scripts/setup-secrets-and-envs.sh \
  aki-motty \
  todo-copilot \
  446713282258 \
  ap-northeast-1
```

スクリプトが実施する内容:
- ✅ 6 個のリポジトリ秘密を登録 (AWS_ROLE_*, TF_STATE_BUCKET, TF_LOCK_TABLE, AWS_REGION)
- ✅ 秘密の登録を検証
- ℹ️ GitHub 環境は GitHub UI で手動作成（以下の Step 3 を参照）

#### Option B: 手動登録

AWS OIDC セットアップスクリプトの出力から秘密値をコピー:

```
AWS_ROLE_TO_ASSUME_DEV=arn:aws:iam::446713282258:role/github-actions-role-dev
AWS_ROLE_TO_ASSUME_STAGING=arn:aws:iam::446713282258:role/github-actions-role-staging
AWS_ROLE_TO_ASSUME_PROD=arn:aws:iam::446713282258:role/github-actions-role-prod
TF_STATE_BUCKET=todo-copilot-terraform-state-prod-446713282258
TF_LOCK_TABLE=todo-copilot-terraform-lock
AWS_REGION=ap-northeast-1
```

**GitHub UI で登録:**

1. GitHub リポジトリ画面で **Settings** をクリック
2. 左サイドバーから **Secrets and variables** → **Actions** をクリック
3. **New repository secret** をクリック

秘密を 1 つずつ追加:

| Name | Value |
|------|-------|
| `AWS_ROLE_TO_ASSUME_DEV` | `arn:aws:iam::446713282258:role/github-actions-role-dev` |
| `AWS_ROLE_TO_ASSUME_STAGING` | `arn:aws:iam::446713282258:role/github-actions-role-staging` |
| `AWS_ROLE_TO_ASSUME_PROD` | `arn:aws:iam::446713282258:role/github-actions-role-prod` |
| `TF_STATE_BUCKET` | `todo-copilot-terraform-state-prod-446713282258` |
| `TF_LOCK_TABLE` | `todo-copilot-terraform-lock` |
| `AWS_REGION` | `ap-northeast-1` |

### Step 3: GitHub 環境保護ルール設定 (手動 UI) 🖱️

GitHub では環境保護ルールを UI から設定します。

**方針**: 開発者が 1 人であるため、完全自動デプロイを避けつつ、過度な承認要件を排除した設定にします：
- **develop**: 検証用なので保護ルールなし（自動デプロイ）
- **staging**: ブランチ制限のみ（main からのみ、自動デプロイ）
- **production**: 自分による 1 つの承認のみ（完全自動化を防止）

#### 3-1. develop 環境 (自動デプロイ - 保護ルールなし)

1. GitHub リポジトリ **Settings** → **Environments** をクリック
2. **New environment** をクリック
3. 環境名: `develop` → **Configure Environment** をクリック
4. **Protection rules** セクションは **スキップ** (保護ルールなし)
5. **Save protection rules** をクリック

結果: develop にプッシュされたコードは即座にデプロイ

#### 3-2. staging 環境 (デプロイ前の手動確認)

1. **New environment** → 環境名: `staging` → **Configure Environment**
2. **Deployment branches and environments** セクションで **Restrict deployments to specific branches or environments** にチェック
3. ブランチ: `main` のみを許可
4. **Required reviewers** チェックボックスには チェック **しない** ✅（自動デプロイのみ）
5. **Save protection rules** をクリック

結果: staging へのデプロイは main ブランチからのみ実行可能（ワークフロー実行確認後に自動デプロイ）

#### 3-3. production 環境 (最小限の安全策 - 自分による確認)

1. **New environment** → 環境名: `production` → **Configure Environment**
2. **Deployment branches and environments** セクションで **Restrict deployments to specific branches or environments** にチェック
3. ブランチ: `main` のみを許可
4. **Required reviewers** チェックボックスに チェック
5. **Minimum number of reviewers**: `1` を設定（自分による確認）
6. **Save protection rules** をクリック

結果: production へのデプロイには自分による 1 つの承認・確認が必要（完全自動デプロイを防止）

---

## 🔍 検証手順

### 1. AWS IAM ロール確認

```bash
# dev ロール確認
aws iam get-role --role-name github-actions-role-dev

# staging ロール確認
aws iam get-role --role-name github-actions-role-staging

# prod ロール確認
aws iam get-role --role-name github-actions-role-prod
```

### 2. GitHub 秘密確認

```bash
# GitHub CLI で秘密一覧表示
gh secret list --repo aki-motty/todo-copilot

# 出力例:
# AWS_REGION                 2025-11-22T16:36:02Z
# AWS_ROLE_TO_ASSUME_DEV     2025-11-22T16:35:59Z
# AWS_ROLE_TO_ASSUME_PROD    2025-11-22T16:36:00Z
# AWS_ROLE_TO_ASSUME_STAGING 2025-11-22T16:36:00Z
# TF_LOCK_TABLE              2025-11-22T16:36:01Z
# TF_STATE_BUCKET            2025-11-22T16:36:01Z
```

### 3. GitHub 環境確認 (手動 UI)

GitHub CLI では環境一覧を表示するコマンドがないため、GitHub UI から直接確認します:

1. GitHub リポジトリ画面で **Settings** をクリック
2. 左サイドバーから **Environments** をクリック
3. 以下の 3 つの環境が表示されていることを確認:
   - ✅ `develop` (保護ルールなし)
   - ✅ `staging` (ブランチ制限のみ)
   - ✅ `production` (1 承認が必要)

各環境をクリックして詳細を確認できます。

### 4. 環境保護ルール確認

GitHub UI から確認:
1. **Settings** → **Environments**
2. 各環境をクリックして Protection rules を確認

---

## 🚀 本番デプロイ前チェックリスト

デプロイ前に以下をすべて確認:

- [ ] AWS OIDC プロバイダー登録済み
- [ ] IAM ロール 3 個作成済み (dev/staging/prod)
- [ ] GitHub 秘密 6 個登録済み
- [ ] GitHub 環境 3 個作成済み (develop/staging/production)
- [ ] develop: 保護ルールなし（自動デプロイ） ✅
- [ ] staging: ブランチ制限のみ（main のみ、自動デプロイ） ✅
- [ ] production: 自分による 1 つの承認が必要 ✅
- [ ] main ブランチに 003-github-actions-deploy ブランチをマージ
- [ ] terraform-ci.yml ワークフロー実行確認

---

## 📖 詳細ドキュメント

詳細な設定手順については以下を参照:

- **AWS OIDC セットアップ**: `GITHUB_ACTIONS_SETUP.md`
- **GitHub 秘密・環境**: `SECRETS_AND_ENVIRONMENTS.md`
- **環境保護ルール**: `ENVIRONMENT_PROTECTION.md`（注: 本ガイドの緩い設定を優先）
- **トラブルシューティング**: `OIDC_TROUBLESHOOTING.md`

**本ガイドが優先**: 開発者 1 人用のシンプルな承認ルール設定です。チーム拡大時は段階的に承認要件を厳しくしてください。

---

## ⚠️ トラブルシューティング

### GitHub CLI で秘密登録に失敗

```bash
# 1. GitHub 認証状態確認
gh auth status

# 2. 再認証
gh auth logout
gh auth login

# 3. リポジトリ権限確認
gh repo view
```

### AWS OIDC トークン生成に失敗

```bash
# 1. OIDC プロバイダー確認
aws iam list-open-id-connect-providers

# 2. IAM ロール信頼ポリシー確認
aws iam get-role --role-name github-actions-role-dev
aws iam get-role-policy --role-name github-actions-role-dev --policy-name trust-policy

# 3. 診断スクリプト実行
./infrastructure/docs/OIDC_TROUBLESHOOTING.md を参照
```

### 環境保護ルール設定エラー

GitHub UI では以下を確認:
- ブランチ保護ルール (main ブランチの保護設定)
- Organization の権限設定
- リポジトリの「Environments」機能が有効化

---

## 📞 次のステップ

1. ✅ AWS OIDC セットアップ完了
2. 🔄 GitHub 秘密・環境を自動/手動で登録
3. 🎛️ GitHub 環境保護ルール設定（本ガイドの緩い設定）
4. 🚀 main ブランチへのプッシュでデプロイ実行

### デプロイの流れ

```
Push to main
    ↓
develop → 🟢 自動デプロイ（検証用）
    ↓
staging → 🟢 自動デプロイ（GitHub Actions 実行確認後）
    ↓
production → 🟡 自分による確認・承認後にデプロイ（安全保障）
```

すべて完了したら、GitHub Actions ワークフローが自動的にトリガーされます！

---

**作成日**: 2025-11-22  
**最終更新**: 2025-11-22
