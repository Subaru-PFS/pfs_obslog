# PFS Design API 高速化提案

## 概要

PFS Design関連のAPIで発生している性能問題の分析と高速化提案をまとめます。

## 問題のあるエンドポイント

| エンドポイント | 処理時間（推定） | 主原因 |
|---------------|-----------------|--------|
| `GET /api/pfs_designs` | ~92秒（3,886ファイル時） | FITSファイル一括読み込み + Pydanticオブジェクト大量生成 |

---

## 1. Design一覧 API (`GET /api/pfs_designs`)

### 現状の問題

1. **全FITSファイルをシーケンシャルに読み込み**
   - 3,886ファイル × 23.7ms/ファイル = 約92秒

2. **Pydanticオブジェクトの大量生成**（主要ボトルネック）
   - `_fits_meta_from_hdul()` が全HDUの全ヘッダーカードを変換
   - 1ファイルあたり: 4 HDU × 約50カード = 約200オブジェクト
   - 全ファイル: 約77万Pydanticオブジェクト生成

3. **一覧表示に不要なデータの読み込み**
   - 一覧に必要なのは基本的なメタデータのみ
   - 全ヘッダーカードは詳細表示でのみ必要

### 処理時間の内訳

```
処理                        時間/ファイル    全ファイル(3,886件)
─────────────────────────────────────────────────────────────
ファイルI/O + astropy解析     7.1ms          27.5秒 (30%)
_fits_meta_from_hdul         12.9ms          50.1秒 (54%)  ← 主要ボトルネック
その他のPydantic変換           3.7ms          14.4秒 (16%)
─────────────────────────────────────────────────────────────
合計                         23.7ms          92秒
```

### 高速化提案

#### 提案1: ヘッダー変換の遅延評価（推奨、効果大）

一覧取得時は`FitsMeta`を生成せず、必要最小限のヘッダーのみ直接読み取る。

**現状のコード:**
```python
def _read_design_entry(path: Path) -> PfsDesignEntry:
    with afits.open(path) as hdul:
        meta = _fits_meta_from_hdul(path.name, hdul)  # 全ヘッダーを変換（遅い）
        return PfsDesignEntry(
            name=meta.hdul[0].header.value("DSGN_NAM") or "",
            ra=float(meta.hdul[0].header.value("RA") or 0.0),
            ...
        )
```

**改善案:**
```python
def _read_design_entry(path: Path) -> PfsDesignEntry:
    with afits.open(path) as hdul:
        header = hdul[0].header  # ヘッダーを直接参照
        return PfsDesignEntry(
            id=_pick_id(path.name),
            frameid=path.name,
            name=header.get("DSGN_NAM", ""),
            ra=float(header.get("RA", 0.0)),
            dec=float(header.get("DEC", 0.0)),
            arms=header.get("ARMS", "-"),
            ...
        )
```

**期待される効果:**
- `_fits_meta_from_hdul` の呼び出し削除で **約50秒短縮**
- 推定処理時間: 92秒 → 約42秒（**54%削減**）

#### 提案2: ファイルベースキャッシュの導入（推奨、効果大）

旧プロジェクトで実装されていた `PickleCache` を移植し、Design一覧をキャッシュする。

**実装方針:**
1. SQLiteベースのキャッシュメタデータ管理
2. ファイル更新日時（`st_mtime`）による無効化
3. 総サイズ制限とLRU eviction

**キャッシュキー設計:**
```python
cache_key = f"design_entry:{path.name}"
valid_after = path.stat().st_mtime
```

**期待される効果:**
- 2回目以降のリクエスト: 92秒 → **数百ミリ秒**（キャッシュヒット時）
- 初回は提案1と組み合わせて約42秒

#### 提案3: 並列処理の導入（効果中）

旧プロジェクトでは`asyncio.gather` + スレッドプールで並列化していた。

```python
# 旧プロジェクトの実装
design_list = list(await asyncio.gather(*(
    background_thread(DesignEntryTask(p)) for p in paths
)))
```

**実装案:**
```python
from concurrent.futures import ThreadPoolExecutor

def list_pfs_designs():
    paths = list(design_dir.glob("pfsDesign-0x*.fits"))
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        design_list = list(executor.map(_read_design_entry, paths))
    
    return sorted(design_list, key=lambda d: d.date_modified, reverse=True)
```

**期待される効果:**
- I/Oバウンドな処理の並列化で**2〜4倍高速化**
- 提案1と組み合わせ: 42秒 → 約10〜20秒

#### 提案4: ページネーションの導入（効果中）

全ファイルを一度に読み込まず、必要な分だけ読み込む。

**課題:**
- 日付順ソートには全ファイルの`st_mtime`取得が必要
- `stat()`のみなら高速（3,886ファイルで約0.5秒）

**実装案:**
1. 全ファイルの`(path, st_mtime)`リストを取得（高速）
2. ソートしてページ分だけFITSを読み込み

```python
@router.get("")
def list_pfs_designs(
    offset: int = 0,
    limit: int = 100,
):
    # 1. 全ファイルのstat情報を取得（高速）
    files = [(p, p.stat().st_mtime) for p in design_dir.glob("pfsDesign-0x*.fits")]
    files.sort(key=lambda x: x[1], reverse=True)
    
    # 2. 必要なページ分だけFITSを読み込み
    page_files = files[offset:offset + limit]
    return [_read_design_entry(p) for p, _ in page_files]
```

**期待される効果:**
- 100件表示時: 92秒 → 約2.4秒（limit=100の場合）

#### 提案5: インデックスファイルの生成（効果大、複雑度高）

Design一覧のメタデータをJSONファイルに事前キャッシュする。

**実装案:**
1. バックグラウンドジョブで定期的にインデックスを更新
2. ファイル変更検出（inotify/watchdog）で差分更新
3. APIはインデックスファイルを読み込むだけ

```json
// /var/cache/pfs-obslog/pfs_designs_index.json
{
  "updated_at": "2025-12-31T12:00:00Z",
  "designs": [
    {
      "id": "1234567890abcdef",
      "frameid": "pfsDesign-0x1234567890abcdef.fits",
      "name": "...",
      "date_modified": "2025-12-30T10:00:00Z",
      ...
    }
  ]
}
```

**期待される効果:**
- API応答時間: **数十ミリ秒**
- 要件: バックグラウンドプロセスの運用

---

## 実装優先度

| 優先度 | 提案 | 対象API | 効果 | 工数 |
|--------|------|---------|------|------|
| 1 | ヘッダー変換の遅延評価 | 一覧 | 大（54%削減） | 小 |
| 2 | ファイルベースキャッシュ | 一覧 | 大（2回目以降99%削減） | 中 |
| 3 | 並列処理 | 一覧 | 中（2-4倍） | 小 |
| 4 | ページネーション | 一覧 | 中 | 中 |
| 5 | インデックスファイル | 一覧 | 大 | 大 |

### 推奨実装順序

1. **フェーズ1**（即効性重視）
   - 提案1: ヘッダー変換の遅延評価
   - 提案3: 並列処理の導入
   - **期待結果**: 92秒 → 10〜20秒

2. **フェーズ2**（キャッシュ基盤）
   - 提案2: ファイルベースキャッシュの導入
   - **期待結果**: 2回目以降 → 数百ミリ秒

3. **フェーズ3**（将来対応）
   - 提案4: ページネーション（フロントエンド対応も必要）
   - 提案5: インデックスファイル（運用要件に応じて）

---

## 補足: 旧プロジェクトとの比較

| 項目 | 旧プロジェクト | 新プロジェクト（現状） |
|------|---------------|----------------------|
| キャッシュ | PickleCache（SQLite + ファイル） | なし |
| 並列処理 | asyncio + ThreadPoolExecutor | なし（シーケンシャル） |
| ヘッダー変換 | 全ヘッダー変換（同様の問題あり） | 全ヘッダー変換 |

旧プロジェクトでもヘッダー変換の遅延評価は実装されていなかったが、キャッシュにより実用的な速度を実現していた。新プロジェクトではキャッシュ基盤の導入が必要。

---

## 参考資料

- [docs/slowtests.md](slowtests.md) - 遅いテストの調査レポート
- 旧プロジェクト実装: `old-project/codebase/backend/src/pfs_obslog/app/routers/pfsdesign.py`
- 旧プロジェクトキャッシュ: `old-project/codebase/backend/src/pfs_obslog/filecache/__init__.py`
