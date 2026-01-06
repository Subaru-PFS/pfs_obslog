# Sky Viewer Camera, Zenith, and Time Relationships

This document explains the relationships between camera, zenith, and time in the Sky Viewer component of Design Viewer.

## Overview

Sky Viewer displays the starry sky as seen from the Subaru Telescope at a specified time. The relative position from the zenith (altitude/azimuth) remains fixed as time changes, making the starry sky appear to move.

## stellar-globe Library Camera Parameters

The `stellar-globe` library camera consists of the following parameters:

### View Parameters

| Parameter | Description |
|-----------|-------------|
| `theta` | Angle from zenith (0=zenith, π/2=horizon) |
| `phi` | Azimuth angle |
| `fovy` | Field of view angle (radians) |
| `roll` | Roll angle |

### Zenith Parameters

| Parameter | Description |
|-----------|-------------|
| `za` | Zenith's right ascension (α, radians) |
| `zd` | Zenith's declination (δ, radians) |
| `zp` | Rotation angle around zenith |

## dateUtils.zenithSkyCoord

`dateUtils.zenithSkyCoord({ when, where })` calculates the zenith's equatorial coordinates from the specified time and observation location.

```typescript
const { za, zd, zp } = dateUtils.zenithSkyCoord({
  when: new Date(),
  where: { lat: 19.825, lon: -155.476 }  // Subaru Telescope location
})
```

Return values:
- `za`: Zenith's right ascension (radians)
- `zd`: Zenith's declination (radians)
- `zp`: Rotation angle around zenith (radians)

## Implementation Details

### At Initialization

1. Set camera zenith parameters: `{ za, zd: zd + TILT, zp }`
   - Adding `TILT = π/2` makes the camera point toward the horizon instead of zenith
   - This makes the overall starry sky easier to view

2. Add AltAz grid:
   ```typescript
   draft.modelMatrix = () => {
     const { za, zd, zp } = globe.camera
     return matrixUtils.izenith4(za, zd - TILT, zp)
   }
   ```
   - Grid model matrix references camera zenith parameters
   - `zd - TILT` makes the grid display with zenith as the pole

### Grid Colors

| Grid | Color | Meaning |
|------|-------|---------|
| Default | Blue `[0, 0.25, 1, 1]` | AltAz grid |
| thetaLine[9] | Orange `[1, 0.5, 0, 1]` | Horizon (theta = 90°) |
| phiLine[12] | Red `[1, 0, 0, 1]` | Azimuth reference line |
| Equatorial grid | Faint white `[1, 1, 1, 0.125]` | RA/Dec grid |

### On Time Change

When time changes, `zenithZaZd` is updated. At this point:

1. Only update camera's `za`, `zd`, `zp`
2. `theta`, `phi` are maintained
3. Grid model matrix references camera values, so it updates automatically

Result:
- Camera altitude/azimuth (`theta`, `phi`) are fixed
- Starry sky moves with time
- Blue AltAz grid always displays centered on zenith (fixed relative to camera view)

### Center Zenith

When clicking the "Center Zenith" button:

```typescript
const coord = SkyCoord.fromDeg(zenithSkyCoord.ra, zenithSkyCoord.dec)
globe.camera.jumpTo(
  { fovy: 2 },
  { coord, duration: 500 }
)
```

- Use `coord` option to point camera at specified equatorial coordinates
- This updates `theta`, `phi` to point camera at zenith

## Coordinate System Relationship Diagram

```
          Zenith
            ↑
            |  theta (angle from zenith)
            |
    ←----- Camera view -----→  phi (azimuth)
            |
            |
          -------- Horizon (theta = π/2)
```

By updating camera zenith parameters (za, zd, zp) according to time, the appearance of the starry sky changes. Maintaining `theta` and `phi` keeps the relative position from zenith fixed.
