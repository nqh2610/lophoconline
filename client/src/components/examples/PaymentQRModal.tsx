import { useState } from 'react'
import { PaymentQRModal } from '../PaymentQRModal'
import { ThemeProvider } from '../ThemeProvider'
import { Button } from '@/components/ui/button'

export default function PaymentQRModalExample() {
  const [open, setOpen] = useState(false)

  return (
    <ThemeProvider>
      <div className="p-4">
        <Button onClick={() => setOpen(true)}>Open Payment QR</Button>
        <PaymentQRModal
          open={open}
          onOpenChange={setOpen}
          amount={150000}
          transactionCode="LOPHOC123456"
        />
      </div>
    </ThemeProvider>
  )
}
