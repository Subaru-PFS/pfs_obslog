import { reactive } from "vue"
import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router"
import { refreshSession } from "./session"
import { $g } from "./store"
import Login from './views/Login'
import Main from "./views/VisitSetSearch"
import Devel from './views/Devel'

const routerHistory = createWebHashHistory()

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: Main,
  },
  {
    name: 'login',
    path: '/login',
    component: Login,
  },
  {
    path: '/devel',
    component: Devel,
  }
]

export const router = createRouter({
  history: routerHistory,
  routes,
})

router.beforeEach(async (to, from, next) => {
  if ($g.session === null && to.name !== 'login') {
    try {
      await refreshSession()
    }
    catch {
      next({ name: 'login' })
    }
  }
  next()
})

type EffectName = 'fade' | 'slideLeft' | 'slideRight'

export const routeTransition = reactive({
  name: 'fade' as EffectName,
})

export function go(path: string, effectName: EffectName = 'fade') {
  routeTransition.name = effectName
  router.push(path)
}
