import { StatusCodes } from "http-status-codes"
import { createRouter, createWebHashHistory } from "vue-router"
import { apiThrowsError } from "./api"
import { $g } from "./global"

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
  if ($g.session.account_name === null && !to.meta.noLogin) {
    try {
      await apiThrowsError(StatusCodes.FORBIDDEN).sessionShow()
      next()
    }
    catch {
      next('/login')
    }
  }
  else {
    next()
  }
})

export { router }
