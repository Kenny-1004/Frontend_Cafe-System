import { useEffect, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { BrandMark } from '@/components/Header'
import { EASE, SECTIONS, scrollToSection } from '@/landing/content'
import { OrderNowButton } from '@/landing/primitives'

const SECTION_IDS = SECTIONS.map((section) => section.id)

/** The section crossing the middle of the viewport. */
function useActiveSection() {
  const [active, setActive] = useState<string>('home')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of SECTION_IDS) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [])
  return active
}

export function Nav({ ready }: { ready: boolean }) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection()

  // Tuck away while reading down the page, return as soon as the visitor scrolls up
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0
    setScrolled(y > 24)
    setHidden(y > previous && y > 480)
  })

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function go(id: string) {
    return (event: MouseEvent) => {
      event.preventDefault()
      setOpen(false)
      scrollToSection(id)
    }
  }

  return (
    <>
      <motion.header
        className={`lp-nav${scrolled ? ' is-scrolled' : ''}`}
        initial={{ y: -100, opacity: 0 }}
        animate={ready ? { y: hidden && !open ? -110 : 0, opacity: 1 } : { y: -100, opacity: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <a href="#home" className="lp-logo" onClick={go('home')} aria-label="Campus Café, back to top">
          <BrandMark />
          <span>Campus Café</span>
        </a>

        <nav className="lp-nav-links" aria-label="Sections">
          {SECTIONS.map((section) => {
            const isActive = active === section.id
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={go(section.id)}
                className={isActive ? 'is-active' : undefined}
                aria-current={isActive ? 'location' : undefined}
              >
                {isActive && (
                  <motion.span layoutId="lp-nav-pill" className="lp-nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                )}
                <span className="lp-nav-label">{section.label}</span>
              </a>
            )
          })}
        </nav>

        <div className="lp-nav-cta">
          <OrderNowButton size="sm" />
        </div>

        <button
          type="button"
          className={`lp-burger${open ? ' is-open' : ''}`}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="lp-mobile-menu"
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
      </motion.header>

      {/* Outside the header: a transformed parent would trap position: fixed */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="lp-mobile-menu"
            className="lp-mobile-menu"
            initial={{ clipPath: 'circle(0% at 92% 4%)' }}
            animate={{ clipPath: 'circle(150% at 92% 4%)' }}
            exit={{ clipPath: 'circle(0% at 92% 4%)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <nav aria-label="Sections">
              {SECTIONS.map((section, index) => (
                <motion.a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={go(section.id)}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.25 + index * 0.07 }}
                >
                  <span className="lp-mobile-index">0{index + 1}</span>
                  {section.label}
                </motion.a>
              ))}
            </nav>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.55 }}>
              <OrderNowButton />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
