import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'

// jsdom has no TextEncoder/TextDecoder; React Router uses them when its module loads.
globalThis.TextEncoder ??= TextEncoder as typeof globalThis.TextEncoder
globalThis.TextDecoder ??= TextDecoder as typeof globalThis.TextDecoder

// jsdom has no matchMedia; theme and responsive code query it on mount.
// Configurable so individual tests can redefine it to simulate a media query match.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    // Deprecated listener API, still called by some libraries.
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom has no ResizeObserver; Radix primitives observe element sizes when they mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub

// jsdom implements neither pointer capture nor scrollIntoView. Radix menus and selects call them while
// handling pointer and keyboard interaction, and would throw without these no-ops.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

// jsdom's selector engine resolves :modal and :fullscreen by calling element.matches again, so one check
// costs millions of nested calls. Floating UI checks :modal on every position update, which made each
// Radix menu or tooltip open take seconds. jsdom has no top layer, so these states can never match.
const TOP_LAYER_STATES = new Set([':modal', ':fullscreen'])
const nativeMatches = Element.prototype.matches

Element.prototype.matches = function matches(this: Element, selector: string) {
  return TOP_LAYER_STATES.has(selector.trim()) ? false : nativeMatches.call(this, selector)
} as Element['matches']
