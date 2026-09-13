import { useEffect } from 'react'

// Sets the tab title for the current page and puts the previous one back when the page unmounts.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} · Crewboard`
    return () => {
      document.title = previous
    }
  }, [title])
}
