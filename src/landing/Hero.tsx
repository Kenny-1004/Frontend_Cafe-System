import { useRef, type PointerEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { EASE, scrollToSection } from '@/landing/content'
import { OrderNowButton, SplitText } from '@/landing/primitives'

const TILT_SPRING = { stiffness: 120, damping: 20, mass: 0.6 }

export function Hero({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  // Scroll away: copy drifts up and fades, the photo sinks and slowly zooms
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -140])
  const copyOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '14%'])
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.15])

  // Pointer: the frame tilts toward the mouse, floating cards drift at their own depth
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-7, 7]), TILT_SPRING)
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [6, -6]), TILT_SPRING)

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (reduce || event.pointerType !== 'mouse') return
    pointerX.set(event.clientX / window.innerWidth - 0.5)
    pointerY.set(event.clientY / window.innerHeight - 0.5)
  }
  function onPointerLeave() {
    pointerX.set(0)
    pointerY.set(0)
  }

  const intro = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    transition: { duration: 1, ease: EASE, delay },
  })

  return (
    <section id="home" ref={ref} className="lp-hero" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="lp-hero-glow" aria-hidden="true">
        <span className="lp-blob lp-blob-a" />
        <span className="lp-blob lp-blob-b" />
      </div>

      <motion.div className="lp-hero-copy" style={{ y: copyY, opacity: copyOpacity }}>
        <motion.p className="lp-eyebrow lp-eyebrow-light" {...intro(0.05)}>
          <span className="lp-live-dot" aria-hidden="true" />
          Now brewing on campus
        </motion.p>

        <h1 className="lp-hero-title">
          <SplitText text="Crafted *slowly.* | Served *fast.*" play={ready} delay={0.15} stagger={0.09} />
        </h1>

        <motion.p className="lp-hero-lede" {...intro(0.75)}>
          Hand-pulled espresso, whisked matcha and bright refreshers. Order in seconds at our kiosk and we
          start making your drink the moment you pay.
        </motion.p>

        <motion.div className="lp-hero-actions" {...intro(0.9)}>
          <OrderNowButton />
          <a
            href="#menu"
            className="lp-btn lp-btn-ghost lp-btn-lg"
            onClick={(event) => {
              event.preventDefault()
              scrollToSection('menu')
            }}
          >
            Explore the menu
          </a>
        </motion.div>

        <motion.ul className="lp-hero-facts" {...intro(1.05)}>
          <li>
            <strong>100+</strong> fresh ingredients
          </li>
          <li>
            <strong>3</strong> cup sizes
          </li>
          <li>
            <strong>Live</strong> pick-up screen
          </li>
        </motion.ul>
      </motion.div>

      <div className="lp-hero-visual">
        <motion.div
          className="lp-hero-frame"
          style={{ rotateX, rotateY }}
          // Clip-path is not a transform, so reduced motion has to skip the wipe explicitly
          initial={reduce ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
          animate={ready ? { clipPath: 'inset(0% 0% 0% 0%)' } : {}}
          transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
        >
          <motion.div
            className="lp-hero-photo"
            initial={{ scale: 1.35 }}
            animate={ready ? { scale: 1 } : {}}
            transition={{ duration: 2.2, ease: EASE, delay: 0.2 }}
          >
            <motion.img
              src="/landing/hero-lattes.jpg"
              alt="Two lattes with leaf art on a round wooden table, surrounded by monstera leaves"
              fetchPriority="high"
              style={{ y: photoY, scale: photoScale }}
            />
          </motion.div>
        </motion.div>

        <FloatingCard className="lp-float-a" ready={ready} delay={1.1} depth={28} pointerX={pointerX} pointerY={pointerY}>
          <span className="lp-float-icon" aria-hidden="true">☕</span>
          <span>
            <strong>Tall · Grande · Venti</strong>
            <small>Every drink, your size</small>
          </span>
        </FloatingCard>

        <FloatingCard className="lp-float-b" ready={ready} delay={1.3} depth={-36} pointerX={pointerX} pointerY={pointerY}>
          <span className="lp-float-status" aria-hidden="true" />
          <span>
            <strong>#24 · Maria</strong>
            <small>Ready for pick-up</small>
          </span>
        </FloatingCard>
      </div>

      <motion.button
        type="button"
        className="lp-scroll-cue"
        aria-label="Scroll to the menu"
        onClick={() => scrollToSection('menu')}
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <span className="lp-scroll-mouse">
          <motion.span
            className="lp-scroll-wheel"
            animate={reduce ? {} : { y: [0, 10, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
        <span>Scroll</span>
      </motion.button>
    </section>
  )
}

/** Glass card that enters late, bobs gently, and drifts with the pointer at its own depth. */
function FloatingCard({
  children,
  className,
  ready,
  delay,
  depth,
  pointerX,
  pointerY,
}: {
  children: ReactNode
  className: string
  ready: boolean
  delay: number
  depth: number
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
}) {
  const reduce = useReducedMotion()
  const x = useSpring(useTransform(pointerX, [-0.5, 0.5], [-depth, depth]), TILT_SPRING)
  const y = useSpring(useTransform(pointerY, [-0.5, 0.5], [-depth, depth]), TILT_SPRING)

  return (
    <motion.div
      className={`lp-float ${className}`}
      initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
      animate={ready ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      <motion.div style={{ x, y }}>
        <motion.div
          className="lp-float-card"
          animate={reduce ? {} : { y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: delay * 0.7 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
