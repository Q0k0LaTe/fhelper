import { motion } from 'framer-motion'

export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" /> 正在加载…
    </div>
  )
}

export function Empty({ icon = '📭', children }) {
  return (
    <div className="empty">
      <span className="em-ico">{icon}</span>
      {children}
    </div>
  )
}

// 入场动画。每个 Item 自带 initial/animate 独立淡入上浮，并按 index 错峰。
// 不再依赖父级 staggerChildren 编排——该编排在嵌套结构或较长列表下会
// 偶发漏掉最后入场的元素（停留在 opacity:0），改为各自驱动更稳。
export const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

export function FadeIn({ children, className, style }) {
  // 仅作布局容器（卡片 / 栅格），入场动画交给内部的 Item。
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

export function Item({ children, className, style, index = 0, ...rest }) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={rise}
      initial="hidden"
      animate="show"
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index, 10) * 0.05,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
