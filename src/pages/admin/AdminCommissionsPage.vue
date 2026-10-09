<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { NotebookPen, Pencil, Plus, RefreshCw, Search, Trash2, Users } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Api } from '@/lib/api'
import { qk } from '@/lib/query'
import type { AdminUser, Commission, Game, GameGroup, GroupCommission } from '@/lib/types'
import Button from '@/components/ui/Button.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Modal from '@/components/ui/Modal.vue'
import MultiSelect from '@/components/ui/MultiSelect.vue'
import Panel from '@/components/ui/Panel.vue'
import Progress from '@/components/ui/Progress.vue'
import Select from '@/components/ui/Select.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Switch from '@/components/ui/Switch.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import CheckinButton from '@/components/common/CheckinButton.vue'
import { useConfirm } from '@/composables/useConfirm'

const qc = useQueryClient()
const confirm = useConfirm()

const search = ref('')
const groupSel = ref<string[]>([])
const gameSel = ref<string[]>([])
const status = ref('all')
const noteDrafts = reactive<Record<number, string>>({})

const { data: commissions, isLoading } = useQuery<Commission[]>({
  queryKey: qk.admin.commissions,
  queryFn: () => Api<Commission[]>('/api/admin/commissions'),
})
const { data: users } = useQuery<AdminUser[]>({
  queryKey: qk.admin.users,
  queryFn: () => Api<AdminUser[]>('/api/admin/users'),
})
const { data: games } = useQuery<Game[]>({
  queryKey: qk.admin.games,
  queryFn: () => Api<Game[]>('/api/admin/games'),
})
const { data: groups } = useQuery<GameGroup[]>({
  queryKey: qk.admin.groups,
  queryFn: () => Api<GameGroup[]>('/api/admin/groups'),
})
const { data: groupComms } = useQuery<GroupCommission[]>({
  queryKey: qk.admin.groupCommissions,
  queryFn: () => Api<GroupCommission[]>('/api/admin/group-commissions'),
})
const { data: notes } = useQuery<Record<string, string>>({
  queryKey: qk.admin.notes,
  queryFn: () => Api<Record<string, string>>('/api/admin/reminders/notes'),
})

/* ---- 筛选选项 ---- */
function groupKey(id: number | null) {
  return id == null ? 'ungrouped' : String(id)
}

const groupOptions = computed(() => {
  const opts = (groups.value ?? []).map((g) => ({ value: String(g.id), label: g.name }))
  if ((commissions.value ?? []).some((c) => c.group_id == null)) {
    opts.push({ value: 'ungrouped', label: '未分组' })
  }
  return opts
})

const gameOptions = computed(() => {
  const list = (games.value ?? []).map((g) => ({
    value: String(g.id),
    label: g.name,
    group: g.group_name ?? '未分组',
  }))
  return list.sort(
    (a, b) => (a.group ?? '').localeCompare(b.group ?? '', 'zh-CN') || a.label.localeCompare(b.label, 'zh-CN'),
  )
})

// 游戏组变化时裁剪越界的已选游戏
watch(groupSel, (sel) => {
  if (sel.length === 0) return
  const allowed = new Set(
    (games.value ?? [])
      .filter((g) => sel.includes(groupKey(g.group_id)))
      .map((g) => String(g.id)),
  )
  gameSel.value = gameSel.value.filter((id) => allowed.has(id))
})

/* ---- 打卡 ---- */
const { mutate: checkin, isPending: checkinPending, variables: checkinVars } = useMutation({
  mutationFn: (vars: { userId: number; gameId: number }) =>
    Api('/api/admin/checkin', {
      method: 'POST',
      body: JSON.stringify({ user_id: vars.userId, game_id: vars.gameId, count: 1 }),
    }),
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: qk.admin.commissions })
    const prev = qc.getQueryData<Commission[]>(qk.admin.commissions)
    qc.setQueryData<Commission[]>(qk.admin.commissions, (old) =>
      old?.map((c) =>
        c.user_id === vars.userId && c.game_id === vars.gameId
          ? { ...c, completed_count: c.completed_count + 1, checked_in: true, last_checked_in_at: new Date().toISOString() }
          : c,
      ),
    )
    return { prev }
  },
  onError: (e: unknown, _v, ctx: { prev?: Commission[] } | undefined) => {
    if (ctx?.prev) qc.setQueryData(qk.admin.commissions, ctx.prev)
    toast.error(e instanceof Error ? e.message : '打卡失败')
  },
  onSuccess: () => toast.success('打卡成功'),
  onSettled: () => {
    qc.invalidateQueries({ queryKey: qk.admin.commissions })
    qc.invalidateQueries({ queryKey: qk.user.commissions })
    qc.invalidateQueries({ queryKey: qk.user.progress })
  },
})

/* ---- 视图 ---- */
interface GroupView {
  key: string
  group_id: number | null
  group_name: string
  gcId: number | null
  total: number | null
  games: Commission[]
}
interface UserView {
  user_id: number
  user_name: string
  aliases: string[]
  groups: GroupView[]
  gamesCount: number
  checkedCount: number
}

const aliasMap = computed(() => {
  const map = new Map<number, string[]>()
  for (const u of users.value ?? []) map.set(u.id, u.aliases ?? [])
  return map
})

const gcIndex = computed(() => {
  const map = new Map<string, GroupCommission>()
  for (const gc of groupComms.value ?? []) map.set(`${gc.user_id}:${gc.game_group_id}`, gc)
  return map
})

function passes(c: Commission) {
  if (groupSel.value.length && !groupSel.value.includes(groupKey(c.group_id))) return false
  if (gameSel.value.length && !gameSel.value.includes(String(c.game_id))) return false
  if (status.value === 'checked' && !c.checked_in) return false
  if (status.value === 'unchecked' && c.checked_in) return false
  return true
}

const views = computed<UserView[]>(() => {
  const byUser = new Map<number, UserView>()
  for (const c of commissions.value ?? []) {
    if (!passes(c)) continue
    let uv = byUser.get(c.user_id)
    if (!uv) {
      uv = {
        user_id: c.user_id,
        user_name: c.user_name,
        aliases: aliasMap.value.get(c.user_id) ?? [],
        groups: [],
        gamesCount: 0,
        checkedCount: 0,
      }
      byUser.set(c.user_id, uv)
    }
    const k = groupKey(c.group_id)
    let gv = uv.groups.find((g) => g.key === k)
    if (!gv) {
      const gc = groupIndexSafe(c.user_id, c.group_id)
      gv = {
        key: k,
        group_id: c.group_id,
        group_name: c.group_name ?? '未分组',
        gcId: gc?.id ?? null,
        total: gc?.total_count ?? null,
        games: [],
      }
      uv.groups.push(gv)
    }
    gv.games.push(c)
    uv.gamesCount += 1
    if (c.checked_in) uv.checkedCount += 1
  }
  for (const uv of byUser.values()) {
    uv.groups.sort((a, b) => a.group_name.localeCompare(b.group_name, 'zh-CN'))
  }
  return [...byUser.values()].sort((a, b) => a.user_id - b.user_id)
})

function groupIndexSafe(userId: number, groupId: number | null) {
  if (groupId == null) return undefined
  return gcIndex.value.get(`${userId}:${groupId}`)
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return views.value
  return views.value.filter(
    (v) =>
      String(v.user_id).includes(q) ||
      v.user_name.toLowerCase().includes(q) ||
      v.aliases.some((a) => a.toLowerCase().includes(q)),
  )
})

const hasFilter = computed(
  () => !!search.value || groupSel.value.length > 0 || gameSel.value.length > 0 || status.value !== 'all',
)

function clearFilters() {
  search.value = ''
  groupSel.value = []
  gameSel.value = []
  status.value = 'all'
}

/* ---- 备注 ---- */
const saveNote = useMutation({
  mutationFn: (vars: { userId: number; content: string }) =>
    Api(`/api/admin/reminders/notes/${vars.userId}`, {
      method: 'PUT',
      body: JSON.stringify({ content: vars.content }),
    }),
  onSuccess: (_d, vars) => {
    toast.success(vars.content ? '备注已保存' : '备注已清除')
    qc.setQueryData<Record<string, string>>(qk.admin.notes, (old) => {
      const next = { ...(old ?? {}) }
      if (vars.content) next[String(vars.userId)] = vars.content
      else delete next[String(vars.userId)]
      return next
    })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

/* ---- 新增记录 ---- */
const addOpen = ref(false)
const addForm = reactive({ userName: '', gameId: '' })
const { mutate: addRecord, isPending: adding } = useMutation({
  mutationFn: () => {
    const g = (games.value ?? []).find((x) => String(x.id) === addForm.gameId)
    return Api('/api/admin/commissions', {
      method: 'POST',
      body: JSON.stringify({ user_name: addForm.userName.trim(), game_name: g?.name }),
    })
  },
  onSuccess: () => {
    toast.success('记录已添加')
    addOpen.value = false
    addForm.userName = ''
    addForm.gameId = ''
    qc.invalidateQueries({ queryKey: qk.admin.commissions })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '添加失败'),
})

function submitAdd() {
  if (!addForm.userName.trim()) {
    toast.error('请填写用户名')
    return
  }
  if (!addForm.gameId) {
    toast.error('请选择游戏')
    return
  }
  addRecord()
}

/* ---- 修改已完成/打卡 ---- */
const editRecord = ref<Commission | null>(null)
const editForm = reactive({ count: 0, checked: false })
watch(editRecord, (r) => {
  if (r) {
    editForm.count = r.completed_count
    editForm.checked = r.checked_in
  }
})
const { mutate: saveRecord, isPending: savingRecord } = useMutation({
  mutationFn: () =>
    Api(`/api/admin/commissions/${editRecord.value?.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed_count: editForm.count, checked_in: editForm.checked }),
    }),
  onSuccess: () => {
    toast.success('已保存')
    editRecord.value = null
    qc.invalidateQueries({ queryKey: qk.admin.commissions })
    qc.invalidateQueries({ queryKey: qk.user.commissions })
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

/* ---- 修改应得 ---- */
interface TotalTarget {
  userId: number
  userName: string
  groupId: number
  groupName: string
  gcId: number | null
  total: number
}
const totalTarget = ref<TotalTarget | null>(null)
const totalValue = ref(0)
watch(totalTarget, (t) => {
  if (t) totalValue.value = t.total
})

const { mutate: saveTotal, isPending: savingTotal } = useMutation({
  mutationFn: () => {
    const t = totalTarget.value!
    if (t.gcId != null) {
      return Api(`/api/admin/group-commissions/${t.gcId}`, {
        method: 'PATCH',
        body: JSON.stringify({ total_count: totalValue.value }),
      })
    }
    return Api('/api/admin/group-commissions', {
      method: 'POST',
      body: JSON.stringify({ user_name: t.userName, game_group_id: t.groupId, total_count: totalValue.value }),
    })
  },
  onSuccess: () => {
    toast.success('应得次数已保存')
    totalTarget.value = null
    invalidateTotals()
  },
  onError: (e: unknown) => toast.error(e instanceof Error ? e.message : '保存失败'),
})

async function deleteTotal() {
  const t = totalTarget.value
  if (!t?.gcId) return
  const ok = await confirm({
    title: '删除应得记录',
    message: `确认删除 ${t.userName} 在「${t.groupName}」的应得次数？`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await Api(`/api/admin/group-commissions/${t.gcId}`, { method: 'DELETE' })
    toast.success('应得记录已删除')
    totalTarget.value = null
    invalidateTotals()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

function invalidateTotals() {
  qc.invalidateQueries({ queryKey: qk.admin.groupCommissions })
  qc.invalidateQueries({ queryKey: qk.admin.commissions })
  qc.invalidateQueries({ queryKey: qk.user.groupCommissions })
}

async function removeGame(r: Commission) {
  const ok = await confirm({
    title: '删除游戏记录',
    message: `确认删除 ${r.user_name} 的「${r.game_name}」记录？`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await Api(`/api/admin/commissions/${r.id}`, { method: 'DELETE' })
    toast.success('记录已删除')
    qc.invalidateQueries({ queryKey: qk.admin.commissions })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '删除失败')
  }
}

function openTotal(uv: UserView, gv: GroupView) {
  if (gv.group_id == null) return
  totalTarget.value = {
    userId: uv.user_id,
    userName: uv.user_name,
    groupId: gv.group_id,
    groupName: gv.group_name,
    gcId: gv.gcId,
    total: gv.total ?? 0,
  }
}

const addGameOptions = computed(() =>
  (games.value ?? []).map((g) => ({
    value: String(g.id),
    label: g.group_name ? `${g.group_name} / ${g.name}` : g.name,
  })),
)
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-40 flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
        <Input v-model="search" class="pl-9" placeholder="搜索 ID / 用户名 / 别名" />
      </div>
      <MultiSelect v-model="groupSel" :options="groupOptions" placeholder="游戏组" class="w-44" />
      <MultiSelect v-model="gameSel" :options="gameOptions" placeholder="游戏（可搜索）" class="w-52" />
      <Select
        v-model="status"
        class="w-28"
        :options="[
          { value: 'all', label: '全部状态' },
          { value: 'unchecked', label: '未打卡' },
          { value: 'checked', label: '已打卡' },
        ]"
      />
      <Button variant="primary" @click="addOpen = true"><Plus />新增</Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="刷新"
        @click="qc.invalidateQueries({ queryKey: qk.admin.commissions })"
      >
        <RefreshCw />
      </Button>
    </div>

    <div v-if="hasFilter" class="flex items-center justify-between text-xs text-dim">
      <span>已启用筛选，显示 {{ filtered.length }} 位用户</span>
      <button type="button" class="text-accent hover:underline" @click="clearFilters">清除筛选</button>
    </div>

    <div v-if="isLoading" class="flex flex-col gap-3">
      <Skeleton class="h-48 w-full" />
      <Skeleton class="h-48 w-full" />
    </div>
    <EmptyState
      v-else-if="filtered.length === 0"
      :title="hasFilter ? '无匹配记录' : '暂无记录'"
      :hint="hasFilter ? '试试清除筛选' : undefined"
    >
      <template #icon><Users class="h-8 w-8 text-dim" /></template>
    </EmptyState>
    <div v-else class="flex flex-col gap-3">
      <Panel v-for="uv in filtered" :key="uv.user_id" class="anim-fade-up p-4">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <h3 class="truncate font-semibold">{{ uv.user_name }}</h3>
          <span class="rounded-full border border-border px-2 py-0.5 text-xs text-dim tnum">#{{ uv.user_id }}</span>
          <span
            v-for="a in uv.aliases"
            :key="a"
            class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-dim"
            >{{ a }}</span
          >
          <span class="ml-auto text-xs text-dim tnum">
            应得合计 {{ uv.groups.reduce((s, g) => s + (g.total ?? 0), 0) }} · 已打卡 {{ uv.checkedCount }}/{{
              uv.gamesCount
            }}
          </span>
        </div>

        <div class="mb-3 flex items-center gap-2">
          <NotebookPen class="h-4 w-4 shrink-0 text-dim" />
          <Input
            :model-value="noteDrafts[uv.user_id] ?? notes?.[String(uv.user_id)] ?? ''"
            placeholder="当日备注"
            @update:model-value="(v: string | number) => (noteDrafts[uv.user_id] = String(v))"
          />
          <Button
            size="sm"
            variant="subtle"
            @click="saveNote.mutate({ userId: uv.user_id, content: (noteDrafts[uv.user_id] ?? notes?.[String(uv.user_id)] ?? '').trim() })"
          >
            保存
          </Button>
        </div>

        <div class="flex flex-col gap-3">
          <div v-for="gv in uv.groups" :key="gv.key" class="rounded-lg border border-border p-3">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ gv.group_name }}</span>
              <button
                v-if="gv.group_id != null"
                type="button"
                class="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25 tnum"
                @click="openTotal(uv, gv)"
              >
                应得 {{ gv.total ?? 0 }}
                <Pencil class="h-3 w-3" />
              </button>
              <span class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-dim tnum">
                已完 {{ gv.games.reduce((s, r) => s + r.completed_count, 0) }}
              </span>
              <span class="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-dim tnum">
                已打卡 {{ gv.games.filter((r) => r.checked_in).length }}/{{ gv.games.length }}
              </span>
            </div>
            <Progress
              v-if="gv.total != null && gv.total > 0"
              class="mb-2"
              :value="gv.games.reduce((s, r) => s + r.completed_count, 0)"
              :max="gv.total"
            />
            <div class="flex flex-col divide-y divide-border">
              <div
                v-for="r in gv.games"
                :key="r.id"
                class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ r.game_name }}</p>
                  <p class="text-xs text-dim tnum">已完成 {{ r.completed_count }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <StatusBadge :checked="r.checked_in" />
                  <CheckinButton
                    :checked="r.checked_in"
                    :pending="checkinPending && checkinVars?.userId === r.user_id && checkinVars?.gameId === r.game_id"
                    class="flex-1 sm:flex-none"
                    @click="checkin({ userId: r.user_id, gameId: r.game_id })"
                  />
                  <Button variant="outline" size="icon" aria-label="修改" @click="editRecord = r">
                    <Pencil />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="删除" @click="removeGame(r)">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>

    <!-- 新增记录 -->
    <Modal v-model:open="addOpen" title="新增代肝记录" description="用户名支持名称或别名" class="sm:max-w-md">
      <div class="flex flex-col gap-3">
        <div>
          <Label>用户名 / 别名</Label>
          <Input v-model="addForm.userName" />
        </div>
        <div>
          <Label>选择游戏</Label>
          <Select v-model="addForm.gameId" :options="addGameOptions" placeholder="请选择游戏" />
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="addOpen = false">取消</Button>
        <Button
          variant="primary"
          :disabled="adding"
          @click="submitAdd"
        >
          添加
        </Button>
      </template>
    </Modal>

    <!-- 修改已完成/打卡 -->
    <Modal
      :open="!!editRecord"
      :title="`修改「${editRecord?.game_name ?? ''}」`"
      :description="editRecord?.user_name"
      class="sm:max-w-sm"
      @update:open="(v: boolean) => { if (!v) editRecord = null }"
    >
      <div class="flex flex-col gap-3">
        <div>
          <Label>已完成次数</Label>
          <Input :model-value="editForm.count" type="number" inputmode="numeric" min="0" @update:model-value="(v: string | number) => (editForm.count = Math.max(0, Number(v) || 0))" />
        </div>
        <label class="flex items-center justify-between gap-2">
          <span class="text-sm">今日已打卡</span>
          <Switch v-model="editForm.checked" />
        </label>
      </div>
      <template #footer>
        <Button variant="ghost" @click="editRecord = null">取消</Button>
        <Button variant="primary" :disabled="savingRecord" @click="saveRecord()">保存</Button>
      </template>
    </Modal>

    <!-- 设置应得次数 -->
    <Modal
      :open="!!totalTarget"
      title="设置应得次数"
      :description="totalTarget ? `${totalTarget.userName} · ${totalTarget.groupName}` : ''"
      class="sm:max-w-sm"
      @update:open="(v: boolean) => { if (!v) totalTarget = null }"
    >
      <div>
        <Label>应得次数</Label>
        <Input :model-value="totalValue" type="number" inputmode="numeric" min="0" @update:model-value="(v: string | number) => (totalValue = Math.max(0, Number(v) || 0))" />
      </div>
      <template #footer>
        <Button v-if="totalTarget?.gcId" variant="danger" class="sm:mr-auto" @click="deleteTotal">删除记录</Button>
        <Button variant="ghost" @click="totalTarget = null">取消</Button>
        <Button variant="primary" :disabled="savingTotal" @click="saveTotal()">保存</Button>
      </template>
    </Modal>
  </div>
</template>