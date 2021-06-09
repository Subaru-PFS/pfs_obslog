# PFS-OBSLOG WebUI

## 変数名ルール

* `$`
    * コンポーネントのreactive変数
* `$p`
    * コンポーネントの`props`
* `$c`
    * contex


## ajax

* `watch`でajaxを発火しない。
    * ajaxの終わりのタイミングがわからずボタンの無効化などの制御がしづらいため

## テーブルビュー

> One row per visit, lists fundamental information of telescope status, time, data type, and comments.

> Each raw has columns for SMs, MCS, AG, where one finds the link to details of each exposure (or sequence of exposures) as the current log shows.  Pop-up window would be also nice, as HSC's one.

* 1行1visitのテーブルビュー
* DBにある情報
    * ID
    * Description
    * Issued at
    * notes
    * SpSSequence
        * type
        * name
        * status
        * command
        * comments
        * notes
    * SpSVisit
        * type
        * exposures: SpSExposure[]
    * McsVisit
        * exposures: MCSExposure[]
* テーブルに表示する情報
    * VisitSet
        * ID
        * Name
        * Type
        * Status
    * VisitID
    * Desc.
    * IssuedAt
    * Avg(ExpTime)
    * number of MCSExposures
    * number of SpSExposures
    * VisitComments
