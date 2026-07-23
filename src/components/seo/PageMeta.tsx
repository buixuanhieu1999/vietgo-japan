import { useEffect } from 'react'
import { env } from '@/lib/env'

interface PageMetaProps {
  title: string
  description?: string
  path?: string
  noIndex?: boolean
}

export function PageMeta({ title, description, path = '', noIndex = false }: PageMetaProps) {
  useEffect(() => {
    const fullTitle = `${title} | ${env.appName}`
    document.title = fullTitle

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name'
      let el = document.head.querySelector(`meta[${attr}="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    if (description) {
      setMeta('description', description)
      setMeta('og:description', description, true)
    }
    setMeta('og:title', fullTitle, true)
    setMeta('og:type', 'website', true)
    if (env.appUrl) {
      const url = `${env.appUrl.replace(/\/$/, '')}${path}`
      setMeta('og:url', url, true)
      let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = url
    }
    setMeta('robots', noIndex ? 'noindex,nofollow' : 'index,follow')
  }, [title, description, path, noIndex])

  return null
}
