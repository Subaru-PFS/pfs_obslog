# Sky Viewer カメラ・天頂・時刻の関係

このドキュメントでは、Design Viewer の Sky Viewer コンポーネントにおけるカメラ、天頂、時刻の関係について説明します。

## 概要

Sky Viewerは、指定された時刻のすばる望遠鏡から見た星空を表示します。天頂からの相対位置（仰角・方位角）は時刻が変わっても固定され、星空が動くように見えます。

## stellar-globe ライブラリのカメラパラメータ

`stellar-globe` ライブラリのカメラは以下のパラメータで構成されます：

### 視点パラメータ

| パラメータ | 説明 |
|-----------|------|
| `theta` | 天頂からの角度（0=天頂、π/2=地平線） |
| `phi` | 方位角 |
| `fovy` | 視野角（ラジアン） |
| `roll` | ロール角 |

### 天頂パラメータ

| パラメータ | 説明 |
|-----------|------|
| `za` | 天頂の赤経（α、ラジアン） |
| `zd` | 天頂の赤緯（δ、ラジアン） |
| `zp` | 天頂周りの回転角 |

## dateUtils.zenithSkyCoord

`dateUtils.zenithSkyCoord({ when, where })` は、指定された時刻と観測地点から天頂の赤道座標を計算します。

```typescript
const { za, zd, zp } = dateUtils.zenithSkyCoord({
  when: new Date(),
  where: { lat: 19.825, lon: -155.476 }  // すばる望遠鏡の位置
})
```

返り値：
- `za`: 天頂の赤経（ラジアン）
- `zd`: 天頂の赤緯（ラジアン）
- `zp`: 天頂周りの回転角（ラジアン）

## 実装の詳細

### 初期化時

1. カメラの天頂パラメータを設定: `{ za, zd: zd + TILT, zp }`
   - `TILT = π/2` を加えることで、カメラは天頂ではなく地平線付近を向く
   - これにより、星空の全体像が見やすくなる

2. AltAz グリッドを追加:
   ```typescript
   draft.modelMatrix = () => {
     const { za, zd, zp } = globe.camera
     return matrixUtils.izenith4(za, zd - TILT, zp)
   }
   ```
   - グリッドのモデル行列はカメラの天頂パラメータを参照
   - `zd - TILT` により、グリッドは天頂が極になるように表示される

### グリッドの色

| グリッド | 色 | 意味 |
|---------|-----|------|
| デフォルト | 青 `[0, 0.25, 1, 1]` | AltAz グリッド |
| thetaLine[9] | オレンジ `[1, 0.5, 0, 1]` | 地平線（theta = 90°） |
| phiLine[12] | 赤 `[1, 0, 0, 1]` | 方位角の基準線 |
| 赤道座標グリッド | 薄い白 `[1, 1, 1, 0.125]` | RA/Dec グリッド |

### 時刻変更時

時刻が変わると、`zenithZaZd` が更新されます。このとき：

1. カメラの `za`, `zd`, `zp` のみを更新
2. `theta`, `phi` は維持される
3. グリッドのモデル行列はカメラの値を参照しているため、自動的に更新される

結果：
- カメラの仰角・方位角（`theta`, `phi`）は固定
- 星空が時間とともに動く
- 青いAltAzグリッドは常に天頂を中心に表示（カメラ視点に対して固定）

### Center Zenith

「Center Zenith」ボタンをクリックすると：

```typescript
const coord = SkyCoord.fromDeg(zenithSkyCoord.ra, zenithSkyCoord.dec)
globe.camera.jumpTo(
  { fovy: 2 },
  { coord, duration: 500 }
)
```

- `coord` オプションを使って、指定した赤道座標にカメラを向ける
- これにより、`theta`, `phi` が更新され、カメラが天頂を向く

## 座標系の関係図

```
          天頂 (zenith)
            ↑
            |  theta (天頂からの角度)
            |
    ←----- カメラ視点 -----→  phi (方位角)
            |
            |
          -------- 地平線 (theta = π/2)
```

カメラの天頂パラメータ（za, zd, zp）を時刻に応じて更新することで、星空の見え方が変化します。`theta` と `phi` を維持することで、天頂からの相対位置は固定されます。
