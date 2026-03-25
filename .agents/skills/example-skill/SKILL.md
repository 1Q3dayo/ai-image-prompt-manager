---
name: example-skill
description: このスキルの説明と、どのような場面で使用するかを記述します。Codexがスキルを自動選択する際の判断材料になります。
argument-hint: [引数のヒント]
# disable-model-invocation: true  # Codexによる自動呼び出しを無効化する場合はコメント解除
# user-invocable: false           # ユーザーからの直接呼び出しを無効化する場合はコメント解除
# allowed-tools: Read, Grep, Glob # 使用可能なツールを制限する場合
# context: fork                   # サブエージェントで実行する場合
# agent: Explore                  # context: fork 使用時のエージェントタイプ
---

# スキル名

## 概要

このスキルが何をするかの説明を記述します。

## 指示

以下の手順に従って $ARGUMENTS を処理してください：

1. **ステップ1**: 最初の作業内容
2. **ステップ2**: 次の作業内容
3. **ステップ3**: 最後の作業内容

## ルール

- ルール1: 守るべきこと
- ルール2: 注意点
- ルール3: 出力形式など

## 追加リソース

必要に応じて、補足ドキュメントへのリンクを記述します。

<!--
使用例:
/example-skill 引数

動的コンテキストの例:
- 現在のブランチ: !`git branch --show-current`
- 最新コミット: !`git log -1 --oneline`
-->
