* WebUI
  * https://www.solidjs.com
  * https://github.com/skovy/typed-scss-modules
  * https://github.com/ajaishankar/openapi-typescript-fetch
  * https://github.com/vueuse/vueuse/blob/main/packages/core/useElementVisibility/index.ts
  * https://split.js.org
    * splitter
  * https://flatpickr.js.org
    * datepicker

## pfsDesignとは

* https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt

> The design of a PFI setup, i.e., the targetting of fibers, is a PfsDesign: 

> fiberのセッティングがpfsDesign

* ファイル名
  ```python
  "pfsDesign-0x%016x.fits" % (pfsDesignId)
  ```

  ID部分はfiber positionのハッシュ値

* ファイル構造

  4つのHDUがある。
  * `[0]`: Primary Data Unit
    * design name, ra, dec, poasing, arms
  * `[1]`: Design
  * `[2]`: Photometry
  * `[3]`: Guid Stars

* リスト
  * 画面左側にリスト一覧を表示する
  * 内容
    * ID
    * design name
    * ra, dec, poasing

* hscMap
  * https://github.com/Subaru-PFS/pfs_utils/blob/master/notebooks/pfsDesign-rhl.ipynb