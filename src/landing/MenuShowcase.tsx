import type { PointerEvent } from 'react'
import { useNavigate } from 'react-router'
import { motion, type Variants } from 'motion/react'
import { EASE, KIOSK_PATH } from '@/landing/content'
import { ArrowIcon, Reveal, SplitText } from '@/landing/primitives'

const CATEGORIES = [
  {
    name: 'Espresso & Hot Coffee',
    blurb: 'Pulled to order: lattes, flat whites, americanos and cappuccinos with velvet foam.',
    image: '/landing/hot-coffee.jpg',
    alt: 'A latte with rosetta art in a white cup',
    tag: 'House favourite',
  },
  {
    name: 'Iced Coffee',
    blurb: 'Cold, bold and layered over ice.',
    image: '/landing/iced-coffee.jpg',
    alt: 'Iced coffee swirling into milk in a tall glass',
  },
  {
    name: 'Matcha & Tea',
    blurb: 'Stone-ground green tea, whisked smooth.',
    image: '/landing/matcha.jpg',
    alt: 'A matcha latte with leaf art beside a laptop',
  },
  {
    name: 'Frappés',
    blurb: 'Blended, creamy and made for hot afternoons.',
    image: '/landing/iced-latte.jpg',
    alt: 'An iced latte with a straw',
  },
  {
    name: 'Refreshers',
    blurb: 'Fruit, ice and a little sparkle.',
    image: '/landing/refresher.jpg',
    alt: 'A strawberry refresher with mint and ice',
  },
  {
    name: 'Juices & Shakes',
    blurb: 'Bright, cold and squeezed fresh.',
    image: '/landing/juice.jpg',
    alt: 'A glass of fresh mango juice with lime',
  },
]

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const card: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: EASE } },
  hover: { y: -8, transition: { duration: 0.5, ease: EASE } },
}
// Children follow the card's hidden/show (from the grid) and hover states
const photo: Variants = { hidden: { scale: 1.02 }, show: { scale: 1.02 }, hover: { scale: 1.1 } }
const arrow: Variants = { hidden: { x: -8, opacity: 0 }, show: { x: -8, opacity: 0 }, hover: { x: 0, opacity: 1 } }

// A soft light follows the pointer across the card; CSS reads the position
function trackSpotlight(event: PointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
}

export function MenuShowcase() {
  const navigate = useNavigate()

  return (
    <section id="menu" className="lp-section lp-menu">
      <div className="lp-section-head">
        <Reveal>
          <p className="lp-eyebrow">The menu</p>
        </Reveal>
        <h2 className="lp-h2">
          <SplitText text="Something for every *mood.*" />
        </h2>
        <Reveal delay={0.15}>
          <p className="lp-section-lede">
            Thirteen categories and every drink in Tall, Grande or Venti. Here are a few places to start.
          </p>
        </Reveal>
      </div>

      <motion.div className="lp-menu-grid" variants={grid} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}>
        {CATEGORIES.map((category, index) => (
          <motion.a
            key={category.name}
            href={KIOSK_PATH}
            className={`lp-menu-card${index === 0 ? ' is-feature' : ''}`}
            variants={card}
            whileHover="hover"
            onPointerMove={trackSpotlight}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
              event.preventDefault()
              navigate(KIOSK_PATH)
            }}
          >
            <motion.img
              src={category.image}
              alt={category.alt}
              loading="lazy"
              decoding="async"
              variants={photo}
              transition={{ duration: 0.9, ease: EASE }}
            />
            <span className="lp-menu-shade" aria-hidden="true" />
            <span className="lp-menu-spot" aria-hidden="true" />
            {category.tag && <span className="lp-menu-tag">{category.tag}</span>}
            <span className="lp-menu-body">
              <span className="lp-menu-name">{category.name}</span>
              <span className="lp-menu-blurb">{category.blurb}</span>
              <span className="lp-menu-link">
                Order now
                <motion.span variants={arrow} transition={{ duration: 0.4, ease: EASE }}>
                  <ArrowIcon />
                </motion.span>
              </span>
            </span>
          </motion.a>
        ))}
      </motion.div>
    </section>
  )
}
