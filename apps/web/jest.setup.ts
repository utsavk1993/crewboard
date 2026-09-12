import '@testing-library/jest-dom'

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
