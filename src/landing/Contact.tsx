import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { BrandMark } from '@/components/Header'
import { CAFE, EASE, SECTIONS, scrollToSection } from '@/landing/content'
import { OrderNowButton, Reveal, SplitText } from '@/landing/primitives'

export function Contact() {
  const [sent, setSent] = useState(false)

  // No mail server behind the site: the message opens in the visitor's own email app
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject = `Hello from ${data.get('name')}`
    const body = `${data.get('message')}\n\n${data.get('name')} · ${data.get('email')}`
    window.location.href = `mailto:${CAFE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return (
    <section id="contact" className="lp-section lp-contact">
      <div className="lp-contact-info">
        <Reveal>
          <p className="lp-eyebrow">Contact us</p>
        </Reveal>
        <h2 className="lp-h2">
          <SplitText text="Come say *hello.*" />
        </h2>
        <Reveal delay={0.1}>
          <p className="lp-section-lede">Questions, catering for your org, or feedback on your last latte: we read everything.</p>
        </Reveal>

        <div className="lp-contact-cards">
          <Reveal delay={0.15} className="lp-contact-card">
            <h3>Visit</h3>
            {CAFE.address.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Reveal>
          <Reveal delay={0.25} className="lp-contact-card">
            <h3>Hours</h3>
            <dl>
              {CAFE.hours.map(([days, time]) => (
                <div key={days}>
                  <dt>{days}</dt>
                  <dd>{time}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.35} className="lp-contact-card">
            <h3>Email</h3>
            <a className="lp-underline" href={`mailto:${CAFE.email}`}>
              {CAFE.email}
            </a>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.2} className="lp-contact-form-wrap">
        <form className="lp-contact-form" onSubmit={onSubmit}>
          <h3>Send us a note</h3>
          <Field name="name" label="Your name" autoComplete="name" />
          <Field name="email" label="Email" type="email" autoComplete="email" />
          <Field name="message" label="Message" multiline />
          <motion.button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-block" whileTap={{ scale: 0.97 }}>
            <span className="lp-btn-label">Send message</span>
          </motion.button>
          <AnimatePresence>
            {sent && (
              <motion.p
                className="lp-form-note"
                role="status"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                Your email app should open with the message ready to send.
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </Reveal>
    </section>
  )
}

function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  multiline = false,
}: {
  name: string
  label: string
  type?: string
  autoComplete?: string
  multiline?: boolean
}) {
  const id = `lp-field-${name}`
  // placeholder=" " lets CSS float the label once the field has text (:placeholder-shown)
  return (
    <div className="lp-field">
      {multiline ? (
        <textarea id={id} name={name} rows={4} required placeholder=" " maxLength={2000} />
      ) : (
        <input id={id} name={name} type={type} required placeholder=" " autoComplete={autoComplete} maxLength={120} />
      )}
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

/** Full-bleed closing band: the beans photo slowly zooms as it passes. */
export function FinalCta() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 1.25, 1])
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', reduce ? '-8%' : '8%'])

  return (
    <section ref={ref} className="lp-cta" aria-labelledby="lp-cta-title">
      <motion.img className="lp-cta-bg" src="/landing/beans.jpg" alt="" loading="lazy" decoding="async" style={{ scale, y }} />
      <div className="lp-cta-shade" aria-hidden="true" />
      <div className="lp-cta-content">
        <h2 className="lp-cta-title" id="lp-cta-title">
          <SplitText text="Your cup is *waiting.*" stagger={0.1} />
        </h2>
        <Reveal delay={0.3}>
          <p>Skip the line: order at the kiosk and we’ll call your name.</p>
        </Reveal>
        <Reveal delay={0.45}>
          <OrderNowButton />
        </Reveal>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-top">
        <div className="lp-footer-brand">
          <span className="lp-logo">
            <BrandMark />
            <span>Campus Café</span>
          </span>
          <p>Crafted slowly. Served fast. Right between your classes.</p>
        </div>
        <nav aria-label="Footer">
          <h3>Explore</h3>
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="lp-underline"
              onClick={(event) => {
                event.preventDefault()
                scrollToSection(section.id)
              }}
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div>
          <h3>Order</h3>
          <Link to="/kiosk" className="lp-underline">
            Kiosk menu
          </Link>
          <Link to="/display" className="lp-underline">
            Pick-up screen
          </Link>
          <Link to="/staff/login" className="lp-underline">
            Staff sign-in
          </Link>
        </div>
        <div>
          <h3>Hours</h3>
          {CAFE.hours.map(([days, time]) => (
            <p key={days}>
              {days}: {time}
            </p>
          ))}
        </div>
      </div>

      <motion.p
        className="lp-footer-wordmark"
        aria-hidden="true"
        initial={{ y: '40%', opacity: 0 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        Campus Café
      </motion.p>

      <div className="lp-footer-bottom">
        <span>© {new Date().getFullYear()} Campus Café</span>
        <span>Photos from Unsplash</span>
      </div>
    </footer>
  )
}
