import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from 'motion/react'
import { BrandMark } from '@/components/Header'
import { Nav } from '@/landing/Nav'
import { Hero } from '@/landing/Hero'
import { Marquee } from '@/landing/Marquee'
import { MenuShowcase } from '@/landing/MenuShowcase'
import { About, HowItWorks, Manifesto } from '@/landing/Story'
import { Gallery } from '@/landing/Gallery'
import { Contact, FinalCta, Footer } from '@/landing/Contact'
import { EASE } from '@/landing/content'
import './landing.css'

const INTRO_KEY = 'cafe.introSeen'
const INTRO_MS = 1300

// The intro plays once per visit, never for people who asked for less motion
function shouldPlayIntro() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return sessionStorage.getItem(INTRO_KEY) !== '1'
  } catch {
    return true
  }
}

export default function LandingPage() {
  const [intro, setIntro] = useState(shouldPlayIntro)
  const [ready, setReady] = useState(!intro)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  useEffect(() => {
    document.title = 'Campus Café · Coffee on campus'
    return () => {
      document.title = 'Campus Café'
    }
  }, [])

  useEffect(() => {
    if (!intro) return
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      // Private mode: the intro simply plays again next time
    }
    const start = setTimeout(() => setReady(true), INTRO_MS - 200)
    const end = setTimeout(() => setIntro(false), INTRO_MS)
    return () => {
      clearTimeout(start)
      clearTimeout(end)
    }
  }, [intro])

  return (
    <MotionConfig reducedMotion="user">
      <div className="lp">
        <motion.div className="lp-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <AnimatePresence>
          {intro && (
            <motion.div
              className="lp-intro"
              aria-hidden="true"
              exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
              transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
            >
              <motion.div
                className="lp-intro-mark"
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <BrandMark />
                <span>Campus Café</span>
              </motion.div>
              <motion.span
                className="lp-intro-bar"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: INTRO_MS / 1000 - 0.2, ease: EASE }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Nav ready={ready} />
        <main>
          <Hero ready={ready} />
          <Marquee items={['Espresso', 'Cold brew', 'Matcha', 'Frappés', 'Refreshers', 'Fresh juices', 'Pastries']} />
          <MenuShowcase />
          <Manifesto />
          <About />
          <Marquee
            tone="green"
            baseVelocity={-2}
            items={['Order at the kiosk', 'Pay at the counter', 'Pick up when your name lights up']}
          />
          <HowItWorks />
          <Gallery />
          <Contact />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
