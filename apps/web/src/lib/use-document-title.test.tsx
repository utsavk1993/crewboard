import { renderHook } from '@testing-library/react'
import { useDocumentTitle } from '@/lib/use-document-title'

describe('useDocumentTitle', () => {
  it('sets the page title with the app name and restores the previous title on unmount', () => {
    document.title = 'Crewboard'

    const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Dispatch board' },
    })
    expect(document.title).toBe('Dispatch board · Crewboard')

    rerender({ title: 'Page not found' })
    expect(document.title).toBe('Page not found · Crewboard')

    unmount()
    expect(document.title).toBe('Crewboard')
  })
})
