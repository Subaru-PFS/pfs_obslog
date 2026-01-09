# Idle状態のDB接続が残る問題の原因調査

## 結論

既存プロジェクトでidle状態のDB接続が残っていた主な原因は、**モジュールレベルで作成されたグローバルなSQLAlchemyエンジンとセッションファクトリが、`ProcessPoolExecutor`によるforkベースの並列処理で子プロセスに継承され、接続プールが適切にクリーンアップされなかったこと**です。

## 詳細分析

### 既存プロジェクトの問題点

#### 1. グローバルエンジンの問題

[old-project/codebase/backend/src/pfs_obslog/db.py](../old-project/codebase/backend/src/pfs_obslog/db.py)では、モジュールのインポート時にエンジンとセッションファクトリがグローバルに作成されます：

```python
engine = create_engine(str(settings.dsn), future=True, echo=settings.echo_sql)
_DBSession: Callable[..., Session] = sessionmaker(bind=engine, autoflush=False)
```

これらはアプリケーションのインポート時に即座に実行され、DB接続プールが確立されます。

#### 2. Forkベースの並列処理

[old-project/codebase/backend/src/pfs_obslog/app/routers/asynctask.py](../old-project/codebase/backend/src/pfs_obslog/app/routers/asynctask.py)では、FITSファイルの画像変換などにforkベースの`ProcessPoolExecutor`を使用しています：

```python
class ProcessForkTaskExcutor(TaskExecutor):
    def run(self, target: Callable[[], T]) -> Awaitable[T]:
        with ProcessPoolExecutor(1, mp_context=settings.mp_context and multiprocessing.get_context() ) as pool:
            return asyncio.wrap_future(pool.submit(target))
```

設定ファイル（[old-project/codebase/backend/src/pfs_obslog/config.py](../old-project/codebase/backend/src/pfs_obslog/config.py)）でのデフォルト設定：

```python
asynctask_fork: bool = True
mp_context: Optional[Literal['fork', 'spawn']] = None  # Noneの場合、Linuxではforkがデフォルト
```

#### 3. Fork時の接続プール継承問題

Linuxの`fork()`システムコールでは、親プロセスのメモリ空間が子プロセスにコピーされます。これにより：

1. **グローバルエンジン**（`engine`）が子プロセスに継承される
2. **接続プール内の接続**がファイルディスクリプタレベルで共有される
3. 子プロセスが終了しても、親プロセス側では接続がまだ「使用中」として認識される
4. 子プロセス内で明示的にクローズされない接続がDBサーバー側でidle状態として残る

この問題は特に以下の使用箇所で発生していました：

- [fits.py](../old-project/codebase/backend/src/pfs_obslog/app/routers/fits.py)での`background_process(Fits2PngTask(...))`
- [pfsdesign.py](../old-project/codebase/backend/src/pfs_obslog/app/routers/pfsdesign.py)での`background_process(PlotDesignTask(...))`
- [plot.py](../old-project/codebase/backend/src/pfs_obslog/app/routers/plot.py)での`background_process(ColorScatterPlotPngTask(...))`

### 新プロジェクトで解消された理由

新プロジェクトでは以下の設計変更により問題が解消されました：

#### 1. 非同期DB接続の採用

[backend/src/pfs_obslog/database.py](../backend/src/pfs_obslog/database.py)では、`sqlalchemy.ext.asyncio`を使用：

```python
async_engine = create_async_engine(
    _db_url,
    echo=settings.database_echo,
    pool_pre_ping=True,  # 接続の有効性を確認
)
```

`pool_pre_ping=True`により、使用前に接続の有効性を確認し、問題のある接続を自動的に再接続します。

#### 2. ProcessPoolExecutor/forkの廃止

新プロジェクトでは、FITSファイルの画像変換などを行う際に`ProcessPoolExecutor`やforkベースの並列処理を**一切使用していません**。

具体的には、以下のように`async def`エンドポイント内で同期的な処理関数を直接呼び出す実装に変更されています：

**FITSプレビュー画像生成** ([backend/src/pfs_obslog/routers/fits.py](../backend/src/pfs_obslog/routers/fits.py)):
```python
# 既存プロジェクト: forkで別プロセス実行
png = await background_process(Fits2PngTask(filepath, SizeHint(...)))

# 新プロジェクト: 同期関数を直接呼び出し
png = _fits2png(filepath, max_width=width, max_height=height)
```

**MCSチャート生成** ([backend/src/pfs_obslog/routers/plot.py](../backend/src/pfs_obslog/routers/plot.py)):
```python
# 既存プロジェクト: forkで別プロセス実行
png = await background_process(ColorScatterPlotPngTask(x, y, peakvalue, width, height))

# 新プロジェクト: 同期関数を直接呼び出し
png_bytes = _create_color_scatter_plot(x, y, peakvalue, width, height)
```

**PFS Design一覧取得** ([backend/src/pfs_obslog/routers/pfs_designs.py](../backend/src/pfs_obslog/routers/pfs_designs.py)):
```python
# 既存プロジェクト: ThreadPoolExecutorで並列読み込み
design_list = list(await asyncio.gather(*(
    background_thread(DesignEntryTask(p)) for p in paths
)))

# 新プロジェクト: キャッシュ付き同期関数
cache = get_pfs_design_cache()
entries = [cache.get_entry(p) for p in paths]
```

これらの処理は元々CPU負荷の高い処理（画像変換、FITSファイル読み込み）でしたが、新プロジェクトでは以下の理由から同期処理で問題なく動作しています：

1. **FastAPIの非同期ワーカー**: `async def`で定義されたエンドポイント内の同期処理は、FastAPIが自動的にスレッドプールで実行するため、他のリクエストをブロックしません
2. **キャッシュの活用**: PFS Design一覧など頻繁にアクセスされるデータはキャッシュ化されており、重い処理の実行頻度が低下しています

この設計変更により、fork時の接続プール継承問題が根本的に解消されました。

#### 3. リクエストスコープのセッション管理

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()
```

各リクエストごとにセッションが作成され、リクエスト終了時に確実にクローズされます。

## まとめ

| 項目 | 既存プロジェクト | 新プロジェクト |
|------|------------------|----------------|
| エンジン作成 | モジュールレベルでグローバル | モジュールレベルだが非同期 |
| セッション管理 | `contextmanager`ベース | `async contextmanager`ベース |
| 並列処理 | `ProcessPoolExecutor` (fork) | なし |
| DB接続チェック | なし | `pool_pre_ping=True` |
| 問題発生 | あり | なし |

## 推奨される対策（既存プロジェクトを修正する場合）

もし既存プロジェクトを修正する必要がある場合、以下の対策が有効です：

1. **`spawn`コンテキストを使用する**
   ```python
   mp_context: Literal['fork', 'spawn'] = 'spawn'  # forkではなくspawnを使用
   ```
   これにより子プロセスが新しいPythonインタープリタとして開始され、親のDB接続を継承しません。

2. **`pool_pre_ping=True`を追加する**
   ```python
   engine = create_engine(str(settings.dsn), pool_pre_ping=True, ...)
   ```

3. **子プロセス内で`engine.dispose()`を呼ぶ**
   ```python
   def worker_init():
       engine.dispose()  # 継承された接続プールを破棄
   ```

4. **`NullPool`を使用する**（接続プーリングを完全に無効化）
   ```python
   from sqlalchemy.pool import NullPool
   engine = create_engine(str(settings.dsn), poolclass=NullPool, ...)
   ```
