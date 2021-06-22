import { AsyncComponentLoader, Component, defineAsyncComponent, nextTick } from "vue"
import { createRouter, createWebHashHistory, LocationQuery } from "vue-router"
import Loading from "./components/Loading"
import { $g } from "./global"
import { sessionReload } from "./session"

const devMode = import.meta.env.DEV

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./routes/Home'), },
    { path: '/attachments', component: () => import('./routes/Attachments'), },
    {
      path: '/login',
      component: asyncComponent(() => import('./routes/Login')),
      meta: { noLogin: true },
    },
    {
      path: '/help',
      component: asyncComponent( () => import('./routes/Help')),
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
  nextTick(() => {
    // this nextTick is to prevent `router.currentRoute` to be tracked as callee's dependency
    router.push({
      query:
        { ...router.currentRoute.value.query, ...query }
    })
  })
}

function asyncComponent(component: AsyncComponentLoader) {
  return defineAsyncComponent({
    loader: component,
    loadingComponent: Loading,
    delay: 400,
  })
}
