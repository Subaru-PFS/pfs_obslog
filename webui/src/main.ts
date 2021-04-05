import 'date-input-polyfill'
import { createApp } from 'vue'
import App from './App'
import { router } from './router'
import "./style"
import "material-design-icons/iconfont/material-icons.css"

const app = createApp(App)
app.use(router)
app.mount('#app')
