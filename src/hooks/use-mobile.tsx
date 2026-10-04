import * as React from "react"

const MOBILE_BREAKPOINT = 640 // Tailwind's sm breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const checkDevice = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Check on mount
    checkDevice();

    window.addEventListener("resize", checkDevice)

    // Cleanup listener on unmount
    return () => window.removeEventListener("resize", checkDevice)
  }, [])

  return isMobile
}
