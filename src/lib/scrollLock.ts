let count = 0

/**
 * 模态（Dialog/Sheet）打开时锁定应用内部滚动。
 * 页面滚动容器是 #app（文档本身不滚动），Reka 对 body 的锁不会影响它，
 * 所以这里自己加一个计数器来控制 #app 的滚动。
 */
export function lockAppScroll() {
  count += 1
  document.documentElement.classList.add('app-scroll-locked')
}

export function unlockAppScroll() {
  count = Math.max(0, count - 1)
  if (count === 0) document.documentElement.classList.remove('app-scroll-locked')
}