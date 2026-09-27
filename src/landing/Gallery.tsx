import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { SplitText } from '@/landing/primitives'

const PHOTOS = [
  { src: '/landing/cafe-counter.jpg', alt: 'A bright café counter with hanging bulbs and an espresso machine', caption: 'The bar', size: 'tall' },
  { src: '/landing/latte-plants.jpg', alt: 'Two lattes on a table beside green plants', caption: 'Slow mornings', size: 'wide' },
  { src: '/landing/espresso-bar.jpg', alt: 'A portafilter of fresh coffee grounds beside a latte', caption: 'Ground to order', size: 'square' },
  { src: '/landing/cheers.jpg', alt: 'Friends clinking two coffee cups together', caption: 'Better together', size: 'tall' },
  { src: '/landing/tasting.jpg', alt: 'Coffee tasting flight with beans and a latte', caption: 'Bean to cup', size: 'wide' },
  { src: '/landing/cortado.jpg', alt: 'A cortado in a small glass in the sunlight', caption: 'Golden hour', size: 'square' },
  { src: '/landing/cafe-garden.jpg', alt: 'A leafy café with tables among plants', caption: 'Your study spot', size: 'tall' },
] as const

/**
 * A pinned strip of photos that slides sideways while the page scrolls down.
 * The section is made exactly tall enough for the strip to travel its own width.
 */
export function Gallery() {
  const reduce = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const travel = useMotionValue(0)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const x = useTransform(() => -scrollYProgress.get() * travel.get())
  const smoothX = useSpring(x, { stiffness: 140, damping: 30, mass: 0.4 })
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track || reduce) return
    const measure = () => {
      const distance = Math.max(0, track.scrollWidth - window.innerWidth)
      travel.set(distance)
      section.style.height = `${distance + window.innerHeight}px`
    }
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      section.style.height = ''
    }
  }, [reduce, travel])

  return (
    <section ref={sectionRef} className={`lp-gallery${reduce ? ' is-static' : ''}`} aria-labelledby="lp-gallery-title">
      <div className="lp-gallery-sticky">
        <motion.div ref={trackRef} className="lp-gallery-track" style={reduce ? undefined : { x: smoothX }}>
          <div className="lp-gallery-intro">
            <p className="lp-eyebrow lp-eyebrow-light">Inside the café</p>
            <h2 className="lp-h2" id="lp-gallery-title">
              <SplitText text="Come for the coffee, *stay* for the light." />
            </h2>
            <p className="lp-gallery-hint" aria-hidden="true">
              Keep scrolling <span>→</span>
            </p>
          </div>
          {PHOTOS.map((photo) => (
            <figure key={photo.src} className={`lp-gallery-item is-${photo.size}`}>
              <div className="lp-gallery-photo">
                <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
              </div>
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </motion.div>
        {!reduce && (
          <div className="lp-gallery-progress" aria-hidden="true">
            <motion.span style={{ scaleX: progress }} />
          </div>
        )}
      </div>
    </section>
  )
}
