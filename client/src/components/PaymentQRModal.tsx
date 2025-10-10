import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  transactionCode: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export function PaymentQRModal({
  open,
  onOpenChange,
  amount,
  transactionCode,
  bankName = "Vietcombank",
  accountNumber = "1234567890",
  accountName = "LOPHOC ONLINE",
}: PaymentQRModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = `https://img.vietqr.io/image/${bankName}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${transactionCode}&accountName=${accountName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán qua QR Code</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <img
              src={qrUrl}
              alt="QR Code thanh toán"
              className="w-64 h-64"
              data-testid="img-qr-code"
            />
          </div>

          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Ngân hàng:</span>
              <span className="font-medium">{bankName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Số tài khoản:</span>
              <span className="font-medium">{accountNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Chủ tài khoản:</span>
              <span className="font-medium">{accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Số tiền:</span>
              <span className="font-bold text-primary text-lg">{amount.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm text-muted-foreground">Nội dung:</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-background px-2 py-1 rounded">
                  {transactionCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(transactionCode)}
                  data-testid="button-copy-code"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Quét mã QR bằng ứng dụng ngân hàng</p>
            <p>• Hoặc chuyển khoản theo thông tin trên</p>
            <p>• Nhập đúng nội dung chuyển khoản</p>
          </div>

          <Button className="w-full" onClick={() => onOpenChange(false)} data-testid="button-confirm-payment">
            Đã chuyển khoản
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
