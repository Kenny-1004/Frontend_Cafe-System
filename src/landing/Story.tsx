import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { EASE } from '@/landing/content'
import { CountUp, Reveal, RevealImage, SplitText } from '@/landing/primitives'

const MANIFESTO =
  'We believe a great cup should never cost you a long line. Order at the kiosk, pay at the counter, and watch your name light up the moment your drink is ready.'

/** Each word lights up as the paragraph scrolls through the viewport. */
export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] })
  const words = MANIFESTO.split(' ')

  return (
    <section className="lp-manifesto" aria-label="Our promise">
      <p ref={ref} className="lp-manifesto-text">
        <span className="lp-sr-only">{MANIFESTO}</span>
        {words.map((word, index) => (
          <Word key={index} progress={scrollYProgress} range={[index / words.length, (index + 1) / words.length]}>
            {word}
          </Word>
        ))}
      </p>
    </section>
  )
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1])
  const highlight = ['line.', 'name', 'ready.'].includes(children)
  return (
    <span className="lp-manifesto-word" aria-hidden="true">
      <motion.span style={{ opacity }} className={highlight ? 'is-accent' : undefined}>
        {children}
      </motion.span>{' '}
    </span>
  )
}

export function About() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  // Two photos moving at different speeds give the stack real depth
  const backY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 60, reduce ? 0 : -60])
  const frontY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 160, reduce ? 0 : -140])
  const badgeRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 280])

  return (
    <section id="about" ref={ref} className="lp-section lp-about">
      <div className="lp-about-visual">
        <motion.div className="lp-about-photo lp-about-photo-back" style={{ y: backY }}>
          <RevealImage src="/landing/pour-over.jpg" alt="A barista pouring hot water over a pour-over coffee" />
        </motion.div>
        <motion.div className="lp-about-photo lp-about-photo-front" style={{ y: frontY }}>
          <RevealImage src="/landing/latte-pour.jpg" alt="Steamed milk being poured into a latte" delay={0.2} />
        </motion.div>
        <motion.div className="lp-about-badge" style={{ rotate: badgeRotate }} aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <defs>
              <path id="lp-badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
            </defs>
            <text>
              <textPath href="#lp-badge-circle" textLength="486" lengthAdjust="spacing">
                FRESHLY BREWED · MADE TO ORDER · ON CAMPUS ·
              </textPath>
            </text>
          </svg>
          <span className="lp-about-badge-core">☕</span>
        </motion.div>
      </div>

      <div className="lp-about-copy">
        <Reveal>
          <p className="lp-eyebrow">About us</p>
        </Reveal>
        <h2 className="lp-h2">
          <SplitText text="A campus café for the *in-between* moments." />
        </h2>
        <Reveal delay={0.1}>
          <p>
            Campus Café started with a simple idea: the ten minutes between classes should be enough for a really good
            drink. We pull every espresso to order, whisk matcha by hand and keep over a hundred fresh ingredients on our
            shelves, so your usual tastes the same every single day.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p>
            Nobody likes a queue, so we built our own ordering: choose at the kiosk, pay at the counter, and pick up when
            your name appears on the screen.
          </p>
        </Reveal>

        <dl className="lp-stats">
          <Reveal delay={0.1} className="lp-stat">
            <dt>Fresh ingredients</dt>
            <dd>
              <CountUp to={100} suffix="+" />
            </dd>
          </Reveal>
          <Reveal delay={0.2} className="lp-stat">
            <dt>Menu categories</dt>
            <dd>
              <CountUp to={13} />
            </dd>
          </Reveal>
          <Reveal delay={0.3} className="lp-stat">
            <dt>Cup sizes</dt>
            <dd>
              <CountUp to={3} />
            </dd>
          </Reveal>
        </dl>
      </div>
    </section>
  )
}

const STEPS = [
  {
    title: 'Order at the kiosk',
    text: 'Browse the full menu, pick a size and add notes like “less ice”. You get an order number right away.',
  },
  {
    title: 'Pay at the counter',
    text: 'Tell the cashier your number and pay in cash. Your drink goes to the bar the moment you pay.',
  },
  {
    title: 'Watch for your name',
    text: 'Your number and first name appear on the pick-up screen and light up green when it’s ready.',
  },
]

/** Three steps joined by a line that draws itself as you scroll. */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.75', 'end 0.6'] })

  return (
    <section ref={ref} className="lp-section lp-steps" aria-labelledby="lp-steps-title">
      <div className="lp-section-head lp-center">
        <Reveal>
          <p className="lp-eyebrow">How it works</p>
        </Reveal>
        <h2 className="lp-h2" id="lp-steps-title">
          <SplitText text="From craving to cup in *three* steps." />
        </h2>
      </div>

      <div className="lp-steps-track">
        <div className="lp-steps-line" aria-hidden="true">
          <motion.span className="lp-steps-line-fill is-x" style={{ scaleX: scrollYProgress }} />
          <motion.span className="lp-steps-line-fill is-y" style={{ scaleY: scrollYProgress }} />
        </div>
        <ol className="lp-steps-list">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              className="lp-step"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -15% 0px' }}
              transition={{ duration: 0.9, ease: EASE, delay: index * 0.15 }}
            >
              <span className="lp-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
