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

重いFITS処理は同期的に処理するか、あるいは完全に非同期なアプローチを採用しています。これにより、fork時の接続プール継承問題が根本的に解消されました。

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
