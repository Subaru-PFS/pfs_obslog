import 'date-input-polyfill'
import "material-icons/iconfont/material-icons.css"
import { createApp } from 'vue'
import App from './App'
import { router } from './router'
import "./style"
import 'splitpanes/dist/splitpanes.css'
import './utils/tooltip'


const app = createApp(App)
app.use(router)
app.mount('#app')
