import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { animate, motion, useInView, useReducedMotion, useSpring, type Variants } from 'motion/react'
import { EASE, KIOSK_PATH } from '@/landing/content'

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

const splitContainer = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
})
const splitWord: Variants = {
  hidden: { y: '115%', rotate: 4 },
  show: { y: '0%', rotate: 0, transition: { duration: 1.05, ease: EASE } },
}

/**
 * Headline whose words rise out of a mask one after another.
 * Syntax: *word* renders in the italic accent face, " | " starts a new line.
 */
export function SplitText({
  text,
  delay = 0,
  stagger = 0.07,
  play,
}: {
  text: string
  delay?: number
  stagger?: number
  /** Controlled start (hero). Omit to play when scrolled into view. */
  play?: boolean
}) {
  const trigger =
    play === undefined
      ? { whileInView: 'show', viewport: { once: true, margin: '0px 0px -10% 0px' } }
      : { animate: play ? 'show' : 'hidden' }
  const lines = text.split(' | ')

  return (
    <>
      <span className="lp-sr-only">{text.replaceAll('*', '').replaceAll(' | ', ' ')}</span>
      <motion.span className="lp-split" aria-hidden="true" initial="hidden" variants={splitContainer(stagger, delay)} {...trigger}>
        {lines.map((line, lineIndex) => (
          <span className="lp-split-line" key={lineIndex}>
            {line.split(' ').map((word, index) => {
              const accent = word.startsWith('*') && word.endsWith('*')
              const clean = word.replaceAll('*', '')
              return (
                <span key={index}>
                  <span className="lp-split-mask">
                    <motion.span className="lp-split-word" variants={splitWord}>
                      {accent ? <em>{clean}</em> : clean}
                    </motion.span>
                  </span>{' '}
                </span>
              )
            })}
          </span>
        ))}
      </motion.span>
    </>
  )
}

/** Drifts gently toward a mouse pointer and springs back when it leaves. */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const x = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 })
  const y = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 })
  const reduce = useReducedMotion()

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
  }
  function reset() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div className="lp-magnetic" style={{ x, y }} onPointerMove={onPointerMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  )
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The page's one call to action: opens the kiosk menu. */
export function OrderNowButton({ size = 'lg', label = 'Order now' }: { size?: 'sm' | 'lg'; label?: string }) {
  const navigate = useNavigate()
  return (
    <Magnetic strength={size === 'lg' ? 0.3 : 0.2}>
      <motion.a
        href={KIOSK_PATH}
        className={`lp-btn lp-btn-primary lp-btn-${size}`}
        whileTap={{ scale: 0.95 }}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          navigate(KIOSK_PATH)
        }}
      >
        <span className="lp-btn-label">{label}</span>
        <span className="lp-btn-icon">
          <ArrowIcon />
        </span>
      </motion.a>
    </Magnetic>
  )
}

/** Counts up from zero the first time the number scrolls into view. */
export function CountUp({ to, suffix = '', duration = 1.8 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!inView || !node) return
    if (reduce) {
      node.textContent = `${to}${suffix}`
      return
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (value) => {
        node.textContent = `${Math.round(value)}${suffix}`
      },
    })
    return () => controls.stop()
  }, [inView, to, suffix, duration, reduce])

  return (
    <>
      <span className="lp-sr-only">{`${to}${suffix}`}</span>
      <span ref={ref} aria-hidden="true">
        0{suffix}
      </span>
    </>
  )
}

/** A photo that is uncovered from the bottom up while settling from a slight zoom. */
export function RevealImage({ src, alt, className, delay = 0 }: { src: string; alt: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={`lp-reveal-image ${className ?? ''}`}
      initial={reduce ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={{ duration: 1.3, ease: EASE, delay }}
    >
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        initial={{ scale: 1.3 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: '0px 0px -15% 0px' }}
        transition={{ duration: 1.6, ease: EASE, delay }}
      />
    </motion.div>
  )
}
