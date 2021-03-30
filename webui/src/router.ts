import { createRouter, createWebHashHistory } from "vue-router"
import { $g } from "./global"
import { sessionReload } from "./session"

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./routes/Home'), },
    {
      path: '/login',
      component: () => import('./routes/Login'),
      meta: { noLogin: true },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  if ($g.session === null && !to.meta.noLogin) {
    if (await sessionReload()) {
      next()
    } else {
      next('/login')
    }
  }
  else {
    next()
  }
})

export { router }
