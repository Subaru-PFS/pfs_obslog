<template>
  <router-view v-slot="{ Component }">
    <transition :name="effectName">
      <keep-alive>
        <component class="fixed" :is="Component" />
      </keep-alive>
    </transition>
  </router-view>
</template>

<script>
import { routeTransition } from "./router";
export default {
  name: "App",
  computed: {
    effectName() {
      return routeTransition.name;
    },
  },
};
</script>

<style lang="scss" scoped>
@mixin active-base {
  position: absolute;
  width: 100%;
  height: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slideLeft-enter-from {
  transform: translateX(100%);
}
.slideLeft-leave-to {
  transform: translateX(-100%);
}
.slideLeft-enter-active,
.slideLeft-leave-active {
  transition: transform 0.2s ease-out;
  @include active-base();
}

.slideRight-enter-from {
  transform: translateX(-100%);
}
.slideRight-leave-to {
  transform: translateX(100%);
}
.slideRight-enter-active,
.slideRight-leave-active {
  transition: transform 0.2s ease-out;
  @include active-base();
}
</style>