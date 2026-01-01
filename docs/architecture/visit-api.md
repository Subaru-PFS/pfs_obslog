# Visit一覧エンドポイント仕様

既存プロジェクト (`old-project/codebase/backend/src/pfs_obslog/app/routers/visit/visit.py`) の調査結果をまとめる。

## エンドポイント

### GET /api/visits

Visit一覧を取得するエンドポイント。

#### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|---------|------|
| `sql` | `Optional[str]` | `None` | フィルタリング用のSQL WHERE句（特殊なDSL） |
| `offset` | `int` | `0` | ページネーションのオフセット |
| `limit` | `Optional[int]` | `50` | 取得件数上限（負の値でnull＝無制限） |

#### レスポンス: `VisitList`

```python
class VisitList(BaseModel):
    visits: list[VisitListEntry]   # Visit一覧
    iic_sequence: list[IicSequence]  # 関連するシーケンス情報
    count: int                       # 総件数（ページネーション用）
```

#### VisitListEntry の構造

```python
class VisitListEntry(BaseModel):
    # 基本情報
    id: int                          # pfs_visit_id
    description: Optional[str]       # pfs_visit_description
    issued_at: Optional[datetime]    # 発行日時
    visit_set_id: Optional[int]      # iic_sequence_id（所属するシーケンス）
    
    # 露出数（集計値）
    n_sps_exposures: int             # SpS露出数
    n_mcs_exposures: int             # MCS露出数
    n_agc_exposures: int             # AGC露出数
    
    # 平均値（各サブシステムから算出）
    avg_exptime: Optional[float]     # 平均露出時間（SpS > MCS > AGC の優先順位）
    avg_azimuth: Optional[float]     # 平均方位角（tel_statusから）
    avg_altitude: Optional[float]    # 平均高度（tel_statusから）
    avg_ra: Optional[float]          # 平均赤経（tel_statusから）
    avg_dec: Optional[float]         # 平均赤緯（tel_statusから）
    avg_insrot: Optional[float]      # 平均回転角（tel_statusから）
    
    # メモ
    notes: list[VisitNote]           # Visitに紐づくメモ一覧
    
    # QA情報（別DB: QADBから取得）
    seeing_median: Optional[float]   # シーイング中央値
    transparency_median: Optional[float]  # 透明度中央値
    effective_exposure_time_b: Optional[float]  # 有効露出時間（青）
    effective_exposure_time_r: Optional[float]  # 有効露出時間（赤）
    effective_exposure_time_n: Optional[float]  # 有効露出時間（NIR）
    effective_exposure_time_m: Optional[float]  # 有効露出時間（中）
    
    # 設計ID
    pfs_design_id: Optional[str]     # 16進数文字列として返却
```

## データ取得の詳細

### 関連テーブル

主キー: `pfs_visit.pfs_visit_id`

| テーブル | 結合方法 | 取得データ |
|---------|---------|-----------|
| `pfs_visit` | ベーステーブル | 基本情報（id, description, issued_at, pfs_design_id） |
| `mcs_exposure` | LEFT JOIN + GROUP BY | 露出数、平均露出時間 |
| `sps_exposure` | LEFT JOIN + GROUP BY | 露出数、平均露出時間 |
| `agc_exposure` | LEFT JOIN + GROUP BY | 露出数、平均露出時間 |
| `tel_status` | LEFT JOIN + GROUP BY | 平均方位角、高度、RA、Dec、回転角 |
| `sps_visit` | LEFT JOIN | SpS関連情報 |
| `visit_set` | LEFT JOIN | シーケンスID（iic_sequence_id） |
| `obslog_visit_note` | selectinload | メモ一覧 |

### 集計サブクエリ

各サブシステムのデータは以下のように集計：

```python
# MCS露出の集計例
mcs_exposure = (
    select(
        M.mcs_exposure.pfs_visit_id,
        func.avg(M.mcs_exposure.mcs_exptime).label('mcs_exposure_avg_exptime'),
        func.count().label('mcs_exposure_count'),
    )
    .filter(M.mcs_exposure.pfs_visit_id.in_(ids))
    .group_by(M.mcs_exposure.pfs_visit_id)
    .subquery('mcs_exposure')
)

# tel_statusの集計例
tel_status = (
    select(
        M.tel_status.pfs_visit_id,
        func.avg(M.tel_status.altitude).label('tel_status_altitude'),
        func.avg(M.tel_status.azimuth).label('tel_status_azimuth'),
        func.avg(M.tel_status.insrot).label('tel_status_insrot'),
        func.avg(M.tel_status.tel_ra).label('tel_status_ra'),
        func.avg(M.tel_status.tel_dec).label('tel_status_dec'),
    )
    .filter(M.tel_status.pfs_visit_id.in_(ids))
    .group_by(M.tel_status.pfs_visit_id)
    .subquery('tel_status')
)
```

### IicSequence の取得

レスポンスには、取得したVisitに関連するIicSequence（シーケンス）情報も含まれる：

```python
iic_sequence_q = (
    ctx.db.query(M.iic_sequence)
    .filter(M.iic_sequence.iic_sequence_id.in_(
        ctx.db.query(M.visit_set.iic_sequence_id)
        .filter(M.visit_set.pfs_visit_id.in_(v.id for v in visits))
    ))
    .options(selectinload('obslog_notes'))
    .options(selectinload('iic_sequence_status'))
    .options(selectinload('sequence_group'))
)
```

#### IicSequence の構造

```python
class IicSequence(BaseModel):
    visit_set_id: int                # iic_sequence_id
    sequence_type: Optional[str]     # シーケンスタイプ
    name: Optional[str]              # シーケンス名
    comments: Optional[str]          # コメント
    cmd_str: Optional[str]           # ICSコマンド文字列
    status: Optional[IicSequenceStatus]  # ステータス情報
    notes: list[VisitSetNote]        # シーケンスに紐づくメモ
    group: SequenceGroup | None      # グループ情報
```

## QA情報の取得（QADB）

QADBは別データベースで、以下のテーブルからデータを取得：

| テーブル | カラム |
|---------|--------|
| `seeing` | `pfs_visit_id`, `seeing_median` |
| `transparency` | `pfs_visit_id`, `transparency_median` |
| `exposure_time` | `pfs_visit_id`, `effective_exposure_time_b/r/n/m` |

QADBへの接続が失敗した場合は、QA情報はすべてNullになる。

## SQL フィルタリング機能

`sql` パラメータで特殊なWHERE句を指定可能。詳細は `pfs_obslog/visitquery.py` を参照。

### 使用可能なカラム例

- `visit_id`, `id` - VisitID
- `issued_at` - 発行日時
- `sequence_type` - シーケンスタイプ
- `comments` - コメント
- `visit_note` - Visitメモ
- `status` - ステータス
- `is_sps_visit`, `is_mcs_visit`, `is_agc_visit` - サブシステム判定
- `visit_set_id` - シーケンスID
- `sequence_group_id`, `sequence_group_name` - グループ
- `proposal_id` - プロポーザルID

## 処理フロー

1. WHERE句のパース（sqlパラメータ）
2. 対象VisitIDの抽出（ページネーション適用）
3. 総件数のカウント
4. VisitListEntryの構築（複数テーブルJOIN）
5. QA情報の取得（QADB）
6. 関連IicSequenceの取得
7. レスポンス構築

## 注意点

- `pfs_design_id`は内部ではBigIntegerだが、レスポンスでは16進数文字列（`hex()`）に変換
- 露出時間の平均値はSpS > MCS > AGCの優先順位で最初に値があるものを使用
- QADBへの接続は任意（失敗時はQA情報がnull）
