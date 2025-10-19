import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, Calendar, DollarSign, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "lesson" | "payment" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "lesson",
    title: "Buổi học sắp bắt đầu",
    message: "Buổi học Toán với Cô Nguyễn Thị Mai bắt đầu lúc 14:00",
    time: "5 phút trước",
    read: false,
  },
  {
    id: "2",
    type: "payment",
    title: "Thanh toán thành công",
    message: "Đã thanh toán 500,000đ cho gói học tháng 11",
    time: "2 giờ trước",
    read: false,
  },
  {
    id: "3",
    type: "system",
    title: "Gia sư mới phù hợp",
    message: "Có 3 gia sư mới phù hợp với yêu cầu của bạn",
    time: "1 ngày trước",
    read: true,
  },
];

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "lesson":
      return <Calendar className="h-4 w-4 text-blue-500" />;
    case "payment":
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case "system":
      return <CheckCircle className="h-4 w-4 text-primary" />;
  }
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const router = useRouter();
  const { toast } = useToast();
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({
      title: "Đã đánh dấu tất cả",
      description: "Tất cả thông báo đã được đánh dấu là đã đọc",
    });
  };

  const handleViewAll = () => {
    router.push("/notifications");
    toast({
      title: "Đang chuyển hướng",
      description: "Đang mở trang thông báo...",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative" 
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80"
        data-testid="dropdown-notifications"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Thông báo</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-auto p-0 text-xs text-primary hover:underline"
              data-testid="button-mark-all-read"
            >
              Đánh dấu đã đọc
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">Không có thông báo</p>
            </div>
          ) : (
            notifications.map((notification: Notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex gap-3 p-4 cursor-pointer ${
                  !notification.read ? "bg-accent/50" : ""
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.time}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            onClick={handleViewAll}
            className="w-full justify-center text-sm"
            data-testid="button-view-all-notifications"
          >
            Xem tất cả thông báo
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
