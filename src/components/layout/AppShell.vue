<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { LogOut, Menu, Shield, UserRound } from '@lucide/vue'
import { adminNav, userNav, type NavItem } from '@/nav'
import Sheet from '@/components/ui/Sheet.vue'
import ThemeMenu from '@/components/layout/ThemeMenu.vue'
import ConfirmHost from '@/components/layout/ConfirmHost.vue'
import { useAuthStore } from '@/stores/auth'
import { useQuery } from '@tanstack/vue-query'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import { buildAvatarUrl } from '@/lib/avatar'
import type { Profile } from '@/lib/types'

const props = defineProps<{ nav: 'admin' | 'user' }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const nav = computed<NavItem[]>(() => (props.nav === 'admin' ? adminNav : userNav))
const inAdmin = computed(() => route.path.startsWith('/admin'))
const active = computed(() => nav.value.find((n) => route.path.startsWith(n.path)) ?? nav.value[0])
const bottom = computed(() => nav.value.slice(0, 4))
const overflow = computed(() => nav.value.slice(4))
const isAdmin = computed(() => auth.role === 'admin')
const profilePath = computed(() => (inAdmin.value ? '/admin/profile' : '/user/profile'))
const initial = computed(() => (auth.userName ?? '?').charAt(0))
const drawerOpen = ref(false)

const { data: profile } = useQuery<Profile>({
  queryKey: qk.profile,
  queryFn: () => Api<Profile>('/api/me/profile'),
  enabled: () => !!auth.role,
})
const avatarSrc = computed(() => buildAvatarUrl(profile.value))

function go(path: string) {
  drawerOpen.value = false
  router.push(path)
}
function logout() {
  auth.clear()
  router.push('/')
}
</script>

<template>
  <div class="min-h-dvh bg-bg text-text">
    <header
      class="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/70"
    >
      <div class="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:px-5">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-text md:hidden"
          aria-label="打开菜单"
          @click="drawerOpen = true"
        >
          <Menu class="h-5 w-5" />
        </button>
        <span class="truncate text-base font-semibold tracking-tight sm:text-lg">
          {{ active?.label ?? '' }}
        </span>
        <div class="ml-auto flex items-center gap-1">
          <ThemeMenu />
          <DropdownMenuRoot>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-surface-2"
                aria-label="账户"
              >
                <span
                  class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent-2 to-accent text-sm font-semibold text-accent-fg"
                >
                  <img
                    v-if="avatarSrc"
                    :src="avatarSrc"
                    :alt="auth.userName ?? ''"
                    class="h-full w-full object-cover"
                  />
                  <template v-else>{{ initial }}</template>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="end"
                :side-offset="6"
                class="z-50 w-52 rounded-xl border border-border bg-surface p-1 shadow-2xl data-[state=open]:anim-pop-in"
              >
                <DropdownMenuLabel class="truncate px-2 py-1.5 text-xs text-dim">
                  {{ auth.userName ?? '账户' }}
                </DropdownMenuLabel>
                <DropdownMenuSeparator class="my-1 h-px bg-border" />
                <DropdownMenuItem
                  v-if="isAdmin"
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
                  @select="go(inAdmin ? '/user/commissions' : '/admin/commissions')"
                >
                  <component :is="inAdmin ? UserRound : Shield" class="h-4 w-4" />
                  {{ inAdmin ? '用户门户' : '管理员门户' }}
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
                  @select="go(profilePath)"
                >
                  <UserRound class="h-4 w-4" />
                  个人设置
                </DropdownMenuItem>
                <DropdownMenuSeparator class="my-1 h-px bg-border" />
                <DropdownMenuItem
                  class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-danger outline-none data-[highlighted]:bg-surface-2"
                  @select="logout"
                >
                  <LogOut class="h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>
      </div>
    </header>

    <div class="mx-auto flex w-full max-w-7xl">
      <aside
        class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3 md:flex"
      >
        <div class="flex items-center gap-2 px-3 py-3">
          <span class="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
          <span class="text-base font-bold tracking-tight">代肝记录</span>
        </div>
        <nav class="flex flex-1 flex-col gap-1">
          <button
            v-for="n in nav"
            :key="n.path"
            type="button"
            class="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="
              route.path.startsWith(n.path)
                ? 'bg-accent/10 text-accent'
                : 'text-muted hover:bg-surface-2 hover:text-text'
            "
            @click="go(n.path)"
          >
            <span
              v-if="route.path.startsWith(n.path)"
              class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_10px_var(--accent)]"
            />
            <component :is="n.icon" class="h-5 w-5" />
            {{ n.label }}
          </button>
        </nav>
      </aside>

      <main class="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-5 md:pb-8">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur md:hidden"
    >
      <div class="mx-auto flex max-w-lg items-stretch">
        <button
          v-for="n in bottom"
          :key="n.path"
          type="button"
          class="relative flex flex-1 flex-col items-center gap-0.5 py-2 safe-bottom text-[11px] transition-colors"
          :class="route.path.startsWith(n.path) ? 'text-accent' : 'text-dim'"
          @click="go(n.path)"
        >
          <span
            v-if="route.path.startsWith(n.path)"
            class="absolute top-0 h-0.5 w-8 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]"
          />
          <component :is="n.icon" class="h-5 w-5" />
          <span class="truncate">{{ n.label }}</span>
        </button>
        <button
          v-if="overflow.length"
          type="button"
          class="flex flex-1 flex-col items-center gap-0.5 py-2 safe-bottom text-[11px] text-dim"
          @click="drawerOpen = true"
        >
          <Menu class="h-5 w-5" />
          <span>更多</span>
        </button>
      </div>
    </nav>

    <Sheet v-model:open="drawerOpen">
      <div class="flex flex-col gap-1">
        <button
          v-for="n in nav"
          :key="n.path"
          type="button"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            route.path.startsWith(n.path)
              ? 'bg-accent/10 text-accent'
              : 'text-muted hover:bg-surface-2 hover:text-text'
          "
          @click="go(n.path)"
        >
          <component :is="n.icon" class="h-5 w-5" />
          {{ n.label }}
        </button>
      </div>
    </Sheet>

    <ConfirmHost />
  </div>
</template>