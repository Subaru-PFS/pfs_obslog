import { createRouter, createWebHashHistory, LocationQuery } from "vue-router"
import { $g } from "./global"
import { sessionReload } from "./session"

const devMode = import.meta.env.DEV

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./routes/Home'), },
    { path: '/attachements', component: () => import('./routes/Attachments'), },
    {
      path: '/login',
      component: () => import('./routes/Login'),
      meta: { noLogin: true },
    },
    {
      path: '/help',
      component: () => import('./routes/Help'),
      meta: { noLogin: true },
    },
    ...(devMode ? [
      {
        path: '/devel',
        component: () => import('./routes/Devel'),
      }
    ] : []),
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

export function pushQuery(query: LocationQuery) {
  router.push({
    query:
      { ...router.currentRoute.value.query, ...query }
  })
}
