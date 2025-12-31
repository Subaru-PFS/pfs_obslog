* [x] エラーの修正

      ↓のエラーが出ます。修正してください。

      ```
      2:44:51 AM [vite] Internal server error: Failed to resolve import "./FitsHeaderPanel" from "src/pages/Home/VisitDetail/VisitDetail.tsx". Does the file exist?
      Plugin: vite:import-analysis
      File: /export/home/pfs/devel/pfs-obslog2/frontend/src/pages/Home/VisitDetail/VisitDetail.tsx:22:32
      21 |  import { IicSequenceInfo } from "./IicSequenceInfo";
      22 |  import { SequenceGroupInfo } from "./SequenceGroupInfo";
      23 |  import { FitsHeaderPanel } from "./FitsHeaderPanel";
      |                                   ^
      24 |  import { getExposureColorStyle } from "../../../utils/exposureColors";
      25 |  import styles from "./VisitDetail.module.scss";
            at TransformPluginContext._formatLog (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:28998:43)
            at TransformPluginContext.error (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:28995:14)
            at normalizeUrl (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:27118:18)
            at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
            at async file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:27176:32
            at async Promise.all (index 15)
            at async TransformPluginContext.transform (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:27144:4)
            at async EnvironmentPluginContainer.transform (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:28796:14)
            at async loadAndTransform (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:22669:26)
            at async viteTransformMiddleware (file:///export/home/pfs/devel/pfs-obslog2/frontend/node_modules/vite/dist/node/chunks/config.js:24541:20)
      ```      


* [x] 追加の依頼がないか指示者に確認する

  copilot/ask_for_instructionsを利用して。

## 完了


