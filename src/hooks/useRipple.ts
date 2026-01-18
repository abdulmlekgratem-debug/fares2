import { useCallback, useRef } from 'react'

export function useRipple<T extends HTMLElement>() {
  const elementRef = useRef<T>(null)

  const createRipple = useCallback((event: React.MouseEvent<T>) => {
    const element = elementRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2

    const ripple = document.createElement('span')
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 0.6s ease-out forwards;
      pointer-events: none;
      z-index: 50;
    `

    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 600)
  }, [])

  return { elementRef, createRipple }
}
