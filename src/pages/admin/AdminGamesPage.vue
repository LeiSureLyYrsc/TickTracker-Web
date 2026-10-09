<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { FolderPlus, Gamepad2, Pencil, Plus, Settings2, Trash2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { Game, GameGroup, GameGroupGame } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Modal from '@/components/ui/Modal.vue'
import Panel from '@/components/ui/Panel.vue'
import Select from '@/components/ui/Select.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { useConfirm } from '@/composables/useConfirm'

const qc = useQueryClient()
const confirm = useConfirm()
const UNGROUPED = 'ungrouped'

const { data: groups, isLoading } = useQuery<GameGroup[]>({
  queryKey: qk.admin.groups,
  queryFn: () => Api<GameGroup[]>('/api/admin/groups'),
})
const { data: allGames } = useQuery<Game[]>({
  queryKey: qk.admin.games,
  queryFn: () => Api<Game[]>('/api/admin/games'),
})

const invalidate = () => {
  qc.invalidateQueries({ queryKey: qk.admin.groups })
  qc.invalidateQueries({ queryKey: qk.admin.games })
}

const ungrouped = computed<GameGroupGame[]>(() =>
  (allGames.value ?? [])
    .filter((g) => g.group_id == null)
    .map((g) => ({ id: g.id, name: g.name, created_at: g.created_at ?? '', aliases: g.aliases ?? [] })),
)

const groupOptions = computed(() => [
  { value: UNGROUPED, label: '未分组' },
  ...(groups.value ?? []).map((g) => ({ value: String(g.id), label: g.name })),
])

/* 新建游戏组 */
const groupOpen = ref(false)
const groupName = ref('')
const { mutate: createGroup, isPending: creatingGroup } = useMutation({
  mutationFn: () => Api('/api/admin/groups', { method: 'POST', body: JSON.stringify({ name: groupName.value.trim() }) }),
  onSuccess: () => {
    toast.success('游戏组已创建')
    groupOpen.value = false
    groupName.value = ''
    qc.invalidateQueries({ queryKey: qk.admin.groups })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '创建失败'),
})

/* 改名 */
const renaming = ref<GameGroup | null>(null)
const renameName = ref('')
watch(renaming, (g) => {
  if (g) renameName.value = g.name
})
const { mutate: renameGroup, isPending: renamingBusy } = useMutation({
  mutationFn: () => Api(`/api/admin/groups/${renaming.value?.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameName.value.trim() }) }),
  onSuccess: () => {
    toast.success('已改名')
    renaming.value = null
    invalidate()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

async function removeGroup(g: GameGroup) {
  const ok = await confirm({
    title: '删除游戏组',
    message: `删除「${g.name}」？组内游戏将变为未分组。`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await Api(`/api/admin/groups/${g.id}`, { method: 'DELETE' })
    toast.success('游戏组已删除')
    invalidate()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

/* 新建游戏 */
const gameOpen = ref(false)
const gameForm = reactive({ name: '', groupId: UNGROUPED })
const { mutate: createGame, isPending: creatingGame } = useMutation({
  mutationFn: () =>
    Api('/api/admin/games', {
      method: 'POST',
      body: JSON.stringify({
        name: gameForm.name.trim(),
        group_id: gameForm.groupId === UNGROUPED ? null : Number(gameForm.groupId),
      }),
    }),
  onSuccess: () => {
    toast.success('游戏已创建')
    gameOpen.value = false
    gameForm.name = ''
    gameForm.groupId = UNGROUPED
    invalidate()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '创建失败'),
})

/* 管理游戏 */
const managing = ref<{ id: number; name: string; aliases: string[] } | null>(null)
const manageForm = reactive({ groupId: UNGROUPED, alias: '' })
watch(managing, (g) => {
  if (!g) return
  const cur = (groups.value ?? []).find((grp) => (grp.games ?? []).some((x) => x.id === g.id))
  manageForm.groupId = cur ? String(cur.id) : UNGROUPED
  manageForm.alias = ''
})
const { mutate: moveGame, isPending: moving } = useMutation({
  mutationFn: () =>
    Api(`/api/admin/games/${managing.value?.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ group_id: manageForm.groupId === UNGROUPED ? null : Number(manageForm.groupId) }),
    }),
  onSuccess: () => {
    toast.success('已移动')
    invalidate()
    managing.value = null
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '移动失败'),
})
const { mutate: addGameAlias } = useMutation({
  mutationFn: () => Api(`/api/admin/games/${managing.value?.id}/aliases`, { method: 'POST', body: JSON.stringify({ alias: manageForm.alias.trim() }) }),
  onSuccess: () => {
    toast.success('别名已添加')
    manageForm.alias = ''
    invalidate()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '添加失败'),
})
async function removeGameAlias(a: string) {
  try {
    await Api(`/api/admin/games/${managing.value?.id}/aliases/${encodeURIComponent(a)}`, { method: 'DELETE' })
    toast.success('别名已删除')
    invalidate()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}
async function deleteGame() {
  try {
    await Api(`/api/admin/games/${managing.value?.id}`, { method: 'DELETE' })
    toast.success('游戏已删除')
    invalidate()
    managing.value = null
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-4xl flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="subtle" @click="groupOpen = true"><FolderPlus />新建游戏组</Button>
      <Button variant="subtle" @click="gameOpen = true"><Plus />新建游戏</Button>
    </div>

    <Skeleton v-if="isLoading" class="h-40 w-full" />
    <EmptyState
      v-else-if="(groups?.length ?? 0) === 0 && ungrouped.length === 0"
      title="暂无游戏"
    >
      <template #icon><Gamepad2 class="h-8 w-8 text-dim" /></template>
    </EmptyState>
    <template v-else>
      <Panel
        v-for="grp in groups"
        :key="grp.id"
        class="anim-fade-up p-4"
      >
        <div class="mb-2 flex items-center gap-2">
          <FolderPlus class="h-5 w-5 text-accent" />
          <h3 class="truncate font-semibold">{{ grp.name }}</h3>
          <div class="ml-auto flex gap-1">
            <Button variant="outline" size="icon" aria-label="改名" @click="renaming = grp"><Pencil /></Button>
            <Button variant="outline" size="icon" aria-label="删除" @click="removeGroup(grp)"><Trash2 /></Button>
          </div>
        </div>
        <div class="flex flex-col divide-y divide-border">
          <p v-if="(grp.games?.length ?? 0) === 0" class="py-3 text-sm text-muted">暂无游戏</p>
          <div
            v-for="g in grp.games"
            :key="g.id"
            class="flex flex-wrap items-center gap-2 py-2.5"
          >
            <Gamepad2 class="h-4 w-4 text-dim" />
            <span class="font-medium">{{ g.name }}</span>
            <span v-for="a in g.aliases" :key="a" class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-dim">{{ a }}</span>
            <Button variant="ghost" size="sm" class="ml-auto" @click="managing = { id: g.id, name: g.name, aliases: g.aliases }">
              <Settings2 />管理
            </Button>
          </div>
        </div>
      </Panel>

      <Panel v-if="ungrouped.length" class="anim-fade-up p-4">
        <h3 class="mb-2 font-semibold">未分组</h3>
        <div class="flex flex-col divide-y divide-border">
          <div v-for="g in ungrouped" :key="g.id" class="flex flex-wrap items-center gap-2 py-2.5">
            <Gamepad2 class="h-4 w-4 text-dim" />
            <span class="font-medium">{{ g.name }}</span>
            <span v-for="a in g.aliases" :key="a" class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-dim">{{ a }}</span>
            <Button variant="ghost" size="sm" class="ml-auto" @click="managing = { id: g.id, name: g.name, aliases: g.aliases }">
              <Settings2 />管理
            </Button>
          </div>
        </div>
      </Panel>
    </template>

    <Modal v-model:open="groupOpen" title="新建游戏组" class="sm:max-w-sm">
      <div><Label>名称</Label><Input v-model="groupName" /></div>
      <template #footer>
        <Button variant="ghost" @click="groupOpen = false">取消</Button>
        <Button variant="primary" :disabled="creatingGroup || !groupName.trim()" @click="createGroup()">创建</Button>
      </template>
    </Modal>

    <Modal
      :open="!!renaming"
      title="游戏组改名"
      class="sm:max-w-sm"
      @update:open="(v: boolean) => { if (!v) renaming = null }"
    >
      <Input v-model="renameName" />
      <template #footer>
        <Button variant="ghost" @click="renaming = null">取消</Button>
        <Button variant="primary" :disabled="renamingBusy || !renameName.trim()" @click="renameGroup()">保存</Button>
      </template>
    </Modal>

    <Modal v-model:open="gameOpen" title="新建游戏" class="sm:max-w-sm">
      <div class="flex flex-col gap-3">
        <div><Label>名称</Label><Input v-model="gameForm.name" /></div>
        <div><Label>所属游戏组</Label><Select v-model="gameForm.groupId" :options="groupOptions" /></div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="gameOpen = false">取消</Button>
        <Button variant="primary" :disabled="creatingGame || !gameForm.name.trim()" @click="createGame()">创建</Button>
      </template>
    </Modal>

    <Modal
      :open="!!managing"
      :title="`管理「${managing?.name ?? ''}」`"
      description="移动分组、管理别名"
      class="sm:max-w-sm"
      @update:open="(v: boolean) => { if (!v) managing = null }"
    >
      <div class="flex flex-col gap-3">
        <div>
          <Label>所属游戏组</Label>
          <Select v-model="manageForm.groupId" :options="groupOptions" />
          <Button class="mt-2" variant="subtle" size="sm" :disabled="moving" @click="moveGame()">移动</Button>
        </div>
        <div>
          <Label>别名</Label>
          <div class="mb-2 flex flex-wrap gap-2">
            <span v-for="a in managing?.aliases ?? []" :key="a" class="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs">
              {{ a }}
              <button type="button" aria-label="删除别名" @click="removeGameAlias(a)"><X class="h-3 w-3" /></button>
            </span>
          </div>
          <div class="flex gap-2">
            <Input v-model="manageForm.alias" placeholder="新增别名" />
            <Button variant="subtle" :disabled="!manageForm.alias.trim()" @click="addGameAlias()">添加</Button>
          </div>
        </div>
      </div>
      <template #footer>
        <Button variant="danger" class="sm:mr-auto" @click="deleteGame"><Trash2 />删除游戏</Button>
        <Button variant="ghost" @click="managing = null">关闭</Button>
      </template>
    </Modal>
  </div>
</template>