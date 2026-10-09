import { ref } from 'vue'
import type { Profile } from './types'

/** 头像缓存版本：上传/删除后自增，为同一 URL 追加查询参数以强制浏览器重新加载 */
export const avatarVersion = ref(0)

export function bumpAvatar() {
  avatarVersion.value++
}

type AvatarSource = Pick<Profile, 'avatar_url' | 'qq_id'>

/** 自定义头像优先，其次 QQ 头像，最后 null（由调用方回退为用户名首字母） */
export function buildAvatarUrl(profile: AvatarSource | null | undefined): string | null {
  if (!profile) return null
  if (profile.avatar_url) {
    const sep = profile.avatar_url.includes('?') ? '&' : '?'
    return `${profile.avatar_url}${sep}v=${avatarVersion.value}`
  }
  if (profile.qq_id) {
    return `https://q1.qlogo.cn/g?b=qq&nk=${profile.qq_id}&s=640`
  }
  return null
}