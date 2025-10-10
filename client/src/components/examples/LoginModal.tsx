import { useState } from 'react'
import { LoginModal } from '../LoginModal'
import { ThemeProvider } from '../ThemeProvider'
import { Button } from '@/components/ui/button'

export default function LoginModalExample() {
  const [open, setOpen] = useState(false)

  return (
    <ThemeProvider>
      <div className="p-4">
        <Button onClick={() => setOpen(true)}>Open Login Modal</Button>
        <LoginModal open={open} onOpenChange={setOpen} />
      </div>
    </ThemeProvider>
  )
}
