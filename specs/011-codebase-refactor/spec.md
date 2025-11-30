# Feature Specification: Codebase Refactoring & Quality Improvement

**Feature Branch**: `011-codebase-refactor`  
**Created**: 2025-11-29  
**Status**: Complete  
**Completed**: 2025-11-30
**Input**: User description: "現状のコードをリファクタリングしたいです。デグレを検知できるようにテストをしっかりと拡充したいです。DDD、クリーンアーキテクチャに則っているかどうかも確認したいです。ドキュメントも最新化したいです。動作確認などで使っているコマンドの名前も再検討したいです。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - テストカバレッジ拡充によるデグレ検知 (Priority: P1)

開発者として、コードベース全体のテストカバレッジを80%以上に引き上げ、今後の変更によるデグレッションを早期に検知できるようにしたい。

**Why this priority**: テストなしにリファクタリングを行うと、予期せぬバグを生む可能性が高い。まずテストを拡充してセーフティネットを構築することが最優先。

**Independent Test**: 全てのテストが合格し、カバレッジレポートで80%以上のカバレッジが達成されていることを確認できる。

**Acceptance Scenarios**:

1. **Given** 現在のテストカバレッジが32%程度, **When** テストを追加して実行, **Then** 全体のステートメントカバレッジが80%以上になる
2. **Given** 新しいテストスイート, **When** `npm test` を実行, **Then** 全てのテストが合格する
3. **Given** Lambdaハンドラーにテストがない状態, **When** ハンドラーのユニットテストを追加, **Then** エンドポイントごとの正常系・異常系がカバーされる
4. **Given** API Clientにテストがない状態, **When** API Clientのテストを追加, **Then** 各APIメソッドの動作が検証される

---

### User Story 2 - DDD/クリーンアーキテクチャ準拠性の確認と改善 (Priority: P2)

アーキテクトとして、コードベースがDDDとクリーンアーキテクチャの原則に従っているか確認し、違反している箇所を修正したい。

**Why this priority**: テスト拡充の次に、アーキテクチャの健全性を確保することで、長期的なメンテナンス性を向上させる。

**Independent Test**: 依存関係が内向きのみであることを確認でき、各レイヤーの責務が明確に分離されている。

**Acceptance Scenarios**:

1. **Given** 現在のコード構造, **When** 依存関係を分析, **Then** Domain層が他のレイヤーに依存していない
2. **Given** Application層, **When** インポート文を確認, **Then** Infrastructure層への直接依存がない（インターフェース経由のみ）
3. **Given** Domain層のエンティティ, **When** ビジネスロジックを確認, **Then** 外部サービスやフレームワークへの依存がない
4. **Given** Repository実装, **When** インターフェースを確認, **Then** Domain層で定義されたインターフェースを実装している
5. **Given** アーキテクチャ違反が発見された場合, **When** 違反を検出, **Then** 本フィーチャー内でリファクタリングして修正する

---

### User Story 3 - ドキュメント最新化 (Priority: P3)

新規参加者として、プロジェクトの現在の状態を正確に理解できるドキュメントを参照したい。

**Why this priority**: コードの品質が確保された後、ドキュメントを更新することで、知識の共有と将来の開発効率を向上させる。

**Independent Test**: README、API.md、DEVELOPMENT.mdが現在の実装と一致している。

**Acceptance Scenarios**:

1. **Given** README.md, **When** 記載された手順を実行, **Then** 開発環境が正常に起動する
2. **Given** API.md, **When** 記載されたエンドポイントを確認, **Then** 実際の実装と一致している
3. **Given** DEVELOPMENT.md, **When** 記載されたテストコマンドを実行, **Then** テストが正常に実行される

---

### User Story 4 - NPMスクリプト名の整理 (Priority: P4)

開発者として、一貫性があり直感的に理解できるNPMスクリプト名を使用したい。

**Why this priority**: 日常的な開発作業の効率化に寄与するが、機能に影響しないため優先度は低め。

**Independent Test**: `npm run` を実行して、全てのスクリプト名が一貫した命名規則に従っている。

**Acceptance Scenarios**:

1. **Given** 現在のスクリプト名, **When** 命名規則を確認, **Then** `環境:アクション` 形式（例: `local:dev`, `local:db:start`, `aws:deploy`）の一貫したプレフィックスが使われている
2. **Given** 重複や曖昧なスクリプト名, **When** 整理後, **Then** 各スクリプトの目的が名前から明確に分かる
3. **Given** README.md, **When** スクリプト名変更後, **Then** ドキュメントが新しいスクリプト名を反映している

---

### Edge Cases

- テストカバレッジ向上時に、テストが壊れやすくならないよう、実装詳細ではなく振る舞いをテストする
- リファクタリング中にAPIの互換性を保つ
- スクリプト名変更時にCI/CDパイプラインへの影響を確認する

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: テストカバレッジがDomain層とApplication層でステートメント、ブランチ、行、関数すべてで80%以上を達成すること（Infrastructure層は対象外）
- **FR-002**: Domain層は外部ライブラリ（React、AWS SDKなど）に依存しないこと
- **FR-003**: Application層はInfrastructure層に直接依存せず、インターフェース経由で依存すること
- **FR-004**: 全てのパブリックAPIエンドポイントがドキュメント化されていること
- **FR-005**: NPMスクリプトが `環境:アクション` 形式の一貫した命名規則に従うこと
- **FR-006**: 既存の機能が全てデグレなく動作すること（E2Eテストで検証）

### Key Entities

- **Todo**: タスクを表すアグリゲートルート（id, title, completed, subtasks, tags）
- **Subtask**: サブタスクを表すエンティティ（Todo配下）
- **Tag**: タスクに付与できるタグを表す値オブジェクト
- **TodoTitle**: タイトルのバリデーションを担う値オブジェクト

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: テストカバレッジがDomain層・Application層で全カテゴリ80%以上（Infrastructure層は除外）
- **SC-002**: 全ての既存テスト（382件）が合格を維持
- **SC-003**: 新規追加テストを含めて450件以上のテストが存在
- **SC-004**: `npm run lint` がエラー0で完了
- **SC-005**: E2Eテストが全て合格（デグレなし確認）
- **SC-006**: README.mdの手順に従って、新規環境で5分以内に開発環境を起動できる
