import { useState, useLayoutEffect } from 'react'

export const useResizeObserver = (ref) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useLayoutEffect(() => {
        if (!ref.current) return

        const observer = new ResizeObserver((entries) => {
            if (!entries[0]) return
            const { width, height } = entries[0].contentRect
            setDimensions({ width, height })
        })

        observer.observe(ref.current)
        return () => observer.disconnect()
    }, [ref])

    return dimensions
}
