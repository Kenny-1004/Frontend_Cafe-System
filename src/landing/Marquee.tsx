import { useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'

const wrap = (min: number, max: number, value: number) => {
  const range = max - min
  return ((((value - min) % range) + range) % range) + min
}

/**
 * An endless ribbon of words. It drifts on its own, speeds up with scroll speed
 * and flips direction when the visitor scrolls back up.
 */
export function Marquee({ items, baseVelocity = 2.5, tone = 'gold' }: { items: string[]; baseVelocity?: number; tone?: 'gold' | 'green' }) {
  const reduce = useReducedMotion()
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false })
  // Two identical halves: wrapping at -50% makes the loop seamless
  const x = useTransform(baseX, (value) => `${wrap(-50, 0, value)}%`)
  const direction = useRef(-1)

  useAnimationFrame((_, delta) => {
    if (reduce) return
    const factor = velocityFactor.get()
    if (factor < 0) direction.current = 1
    else if (factor > 0) direction.current = -1
    let moveBy = direction.current * baseVelocity * (delta / 1000)
    moveBy += direction.current * Math.abs(moveBy * factor)
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div className={`lp-marquee lp-marquee-${tone}`} aria-hidden="true">
      <motion.div className="lp-marquee-track" style={{ x }}>
        {[0, 1].map((copy) => (
          <span className="lp-marquee-group" key={copy}>
            {[...items, ...items].map((item, index) => (
              <span className="lp-marquee-item" key={index}>
                {item}
                <span className="lp-marquee-star">✦</span>
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
