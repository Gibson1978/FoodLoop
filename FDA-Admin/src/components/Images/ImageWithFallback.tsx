import React, { useState } from 'react'

const DEFAULT_ERROR_IMG_SRC = 
  'data:image:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc: string; // The custom prop you wanted
  wrapperClassName?: string; // The custom wrapper class prop
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  // Extract custom props explicitly
  const { src, alt, style, className, fallbackSrc, wrapperClassName, ...rest } = props

  // Determine the source to use
  const finalSrc = didError ? (fallbackSrc || DEFAULT_ERROR_IMG_SRC) : src;

  // Use a different structure for the error/fallback display
  return (
    <div
      className={`inline-block text-center align-middle ${wrapperClassName ?? ''}`}
      style={style}
    >
      <img 
        src={finalSrc} 
        alt={alt} 
        className={className} 
        style={style} 
        {...rest} 
        // Only attach onError to the *original* image load attempt
        onError={didError ? undefined : handleError} 
      />
    </div>
  )
}