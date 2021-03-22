## `Makefile`, `entrypoint.bash`, 環境変数について

* entrypoint.bash
    * Dockerでも使えるようなスタートアップスクリプト
    * 必要な初期化(secret_key_baseを生成するなどの)を行う

* 環境変数ポリシー
    * アプリ内ではなるべく`config.settings`を使う
    * 環境変数を設定しないで動くようにしたい

> My request was that it will be nice to see the plots from the viewpoint of spectrograph modules. For example, when you select a given FoV, a figure can be seen (optionally) to show the target/calibration/sky objects distribute along the slits.

* 装置のplot
* target/calibration/sky

> I'm late too.
My request was to have a way to select a pfsConfigId from your tool – no-one should be typing SHAs. A "copy to clipboard" would be a start.
If you're showing pfsDesigns on hscMap, I'd rather show the PFI instrument as well as the objects being targeted. So the fields of the auto guiders as well as the stars selected. The cobra patrol regions and small symbols for the selected objects, rather than large symbols for the selected objects. In general there will be many overlapping designs, so I think I'd just provide an overview of the designs (maybe just the field-of-view) and a way to select which designs to show. Also a way to only select a subset of designs (e.g. ones that could be observed at a given time.

* pfsConfigIdを取得する方法
    * copyToClipboard
* hscMapに表示するならobjectより装置
    * auto guiderも
    * コブラの patrol エリアと x 印の星
* おそらくpfsDesignは重なるので視野だけでいい
    * 表示するvisitを選択する方法が必要
    * 視野のサブセット(とある時間に観測できるなどの条件で)を選択する方法

* https://github.com/Subaru-PFS/datamodel/blob/eb84f9f8ed348fd9bc3198d1b9287def7a1a3c3d/datamodel.txt#L286


```
The design of a PFI setup, i.e., the targetting of fibers, is a PfsDesign:

    "pfsDesign-0x%016x.fits" % (pfsDesignId)

The choice of a hex format is because the the pfsDesignId is a SHA-1
of the intended fiber positions.

FITS file format:

HDU #0 PDU
HDU #1          FITS binary table named "DESIGN"
HDU #2          FITS binary table named "PHOTOMETRY"
HDU #3          FITS binary table named "GUIDESTARS"

The PDU contains the following keys:

      DSGN_NAME Human-readable name for the design
      RA        Intended telescope boresight Right Ascension (degrees)
      DEC       Intended telescope boresight Declination (degrees)
      POSANG    Intended Position Angle of the PFI (degrees).
                    This corresponds to the angle
                    from the North Celestial Pole to the PFI_Y axis,
                    measured clockwise looking along the positive PFI_Z axis
                    (ie., the telescope pointing direction).
      ARMS      The arms that will be exposed.
                    This can be any combination
                    of the arms 'b', 'r', 'm', and 'n'
                    (where each arm can
                    appear only once
                    and 'r' and 'm' cannot be present
                    in the same combination)
                    examples: 'brn', 'bmn', 'rb'.

The DESIGN table lists for each object:
      fiberId        32-bit int
      catId          32-bit int
      tract          32-bit int
      patch          string
      objId          64-bit int
      ra             64-bit float (degrees)
      dec            64-bit float (degrees)
      targetType     32-bit int (enumerated type: e.g. SCIENCE,SKY,FLUXSTD)
      fiberStatus    32-bit int (enumerated type: e.g. GOOD,BROKENFIBER,BLOCKED,BLACKSPOT)
      pfiNominal     pair of 32-bit floats (millimeters on the PFI)

Note that:
* the fiberIds start at 1.
* the combination of (catId, objId) must be unique
    [with the exception where (catId=-1 objId=-1) which corresponds to an untargeted fiber.]

The 'targetType' in the DESIGN table is an enumerated type, with values:
      SCIENCE = 1: the fiber is intended to be on a science target.
      SKY = 2: the fiber is intended to be on blank sky, and used for sky subtraction.
      FLUXSTD = 3: the fiber is intended to be on a flux standard, and used for flux calibration.
      UNASSIGNED = 4: the fiber is not targeted on anything in particular.
      ENGINEERING = 5: the fiber is an engineering fiber.
      SUNSS_IMAGING = 6: the fiber goes to the SuNSS imaging leg
      SUNSS_DIFFUSE = 7: the fiber goes to the SuNSS diffuse leg

The 'fiberStatus' in the DESIGN table is an enumerated type, with values:
      GOOD = 1: the fiber is working normally.
      BROKENFIBER = 2: the fiber is broken, and any flux should be ignored.
      BLOCKED = 3: the transmission through the fiber is temporarily blocked. Any flux should be ignored.
      BLACKSPOT = 4: the fiber is hidden behind its spot, and any flux should be ignored.
      UNILLUMINATED = 5: the fiber is not being illuminated.

The PHOTOMETRY table lists:
      fiberId            32-bit int
      fiberFlux    [nJy] 32-bit float
      psfFlux      [nJy] 32-bit float
      totalFlux    [nJy] 32-bit float
      fiberFluxErr [nJy] 32-bit float
      psfFluxErr   [nJy] 32-bit float
      totalFluxErr [nJy] 32-bit float
      filterName         string

Where the:
    * fiberFlux corresponds to the integrated flux within an aperture of a fiber
        (approx 1 arcsec in diameter). This is seeing-corrected.
    * psfFlux is the flux computed by fitting the appropriate PSF to the image,
        to an infinite radius.
    * totalFlux is the complete flux for that object. This is the same as the psfFlux
        for unresolved sources, but for extended sources the appropriate extended model
        is applied to compute the flux.


A fiberId may be listed multiple times in the PHOTOMETRY table in order to
provide measurements in multiple filters for a single object.

The 'filterName' values in the PHOTOMETRY table will specify particular
transmission curves used by the pipeline, and therefore the range of
permitted values is limited to a set to be specified by the DRP team.
There will be a mechanism for adding to this set.

The GUIDESTARS table lists:
      objId          64-bit int
      epoch          7-digit string
      ra             64-bit float (degrees)
      dec            64-bit float (degrees)
      pmRa           32-bit float (mas/year)
      pmDec          32-bit float (mas/year)
      parallax       32-bit float (mas)
      magnitude      32-bit float
      passband       string
      color          32-bit float
      agId           32-bit int
      agX            32-bit float (pixels)
      agY            32-bit float (pixels)

Where the:
    * objId corresponds to the unique object identifer for the guide star
    * epoch corresponds to the reference epoch for the stellar parameters,
      in the form PYYYY.x, where P is the prefix (J for Julian or B for Besselian epochs),
      YYYY is the whole year for the epoch,
      and x is the fraction of Julian years from the whole year, or 0 for Besselian epochs.
    * ra corresponds to the Right Ascension of the guide star
    * dec corresponds to the Declination of the guide star
    * pmRa is the proper motion of the guide star along the RA direction
    * pmDec is the proper motion of the guide star along the DEC direction
    * parallax is the observed parallax of the guide star
    * magnitude is the magnitude for the guide star
    * passband is the passband over which the magnitude is measured.
    * color is the Gaia broadband BP-RP color for that guide star.
    * agId is the identifier for the AG camera that will observe that guide star.
        This can have a value from 0 to 5 inclusive.
    * agX is the X-position on the corresponding AG camera where the guide star
          is expected to be detected
    * agY is the Y-position on the corresponding AG camera where the guide star
          is expected to be detected

Additional keywords are required for the GUIDESTARS HDU:
    * EPOCH the reference epoch for the guide star data.
        All the guide star information share the same epoch.
        This should be accurate to the order of weeks to ensure that the
        parallax can be incorporated into the measurements.
        The format for the time is the ISO-8601 yyyy-mm-ddThh:mm:ss format
        and the time coordinate is TCB.
    * TEL_ELEV the telescope elevation (degrees)
    * GS_CATID the identifier of the catalogue containing the guide stars.
        This implies that all the guide stars in this table originate from
        a single catalogue.

```