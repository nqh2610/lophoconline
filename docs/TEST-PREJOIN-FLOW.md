# 🎯 Hướng dẫn Test Flow Prejoin → Video Call

## 📋 Flow hoàn chỉnh

```
Dashboard → Click "Tham gia" → Prejoin Page → Cài đặt → Video Call V2
```

### Chi tiết từng bước:

1. **Dashboard** (Gia sư/Học viên)
   - URL: `/tutor/dashboard` hoặc `/student/dashboard`
   - Card: "Lịch học trực tuyến"
   - Button: "Tham gia"

2. **Prejoin Page**
   - URL: `/prejoin-videolify-v2?accessToken=xxx`
   - Cài đặt:
     - ✅ Bật/tắt camera (Ctrl+E)
     - ✅ Bật/tắt mic (Ctrl+D)
     - ✅ Chọn nền ảo (Ctrl+B)
   - Button: "Tham gia ngay" (Enter)

3. **Video Call V2**
   - URL: `/video-call-v2/[accessToken]`
   - Component: `VideolifyFull_v2`
   - Tự động load settings từ prejoin:
     - Camera/mic state
     - Virtual background
     - Device selection

## 🚀 Cách test

### Bước 1: Tạo session test

```bash
node scripts/update-session-time.mjs
```

Hoặc trực tiếp vào prejoin:
```
http://localhost:3000/prejoin-videolify-v2?accessToken=YOUR_TOKEN
```

### Bước 2: Test với Gia sư

1. Đăng nhập tài khoản gia sư
2. Vào `/tutor/dashboard`
3. Tìm card "Lịch học trực tuyến"
4. Click "Tham gia" → Mở prejoin
5. Test các tính năng:
   - ✅ Xem preview camera
   - ✅ Toggle camera on/off
   - ✅ Toggle mic on/off
   - ✅ Chọn blur background
   - ✅ Chọn image background
   - ✅ Thay đổi device (nếu có nhiều camera/mic)
6. Click "Tham gia ngay"
7. Kiểm tra settings được apply:
   - Camera/mic state đúng
   - Virtual background đúng

### Bước 3: Test với Học viên

1. Mở **trình duyệt khác** (hoặc Incognito)
2. Đăng nhập tài khoản học viên
3. Vào `/student/dashboard`
4. Làm tương tự như gia sư

### Bước 4: Test P2P connection

1. Cả 2 người vào cùng room
2. Test các tính năng:
   - ✅ Nhìn thấy video/audio của nhau
   - ✅ Chat
   - ✅ Whiteboard
   - ✅ Screen share
   - ✅ File transfer

## 🎛️ Prejoin Settings

Settings được lưu trong `localStorage` với key `videolify_prejoin_settings`:

```typescript
{
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  vbgEnabled: boolean;
  vbgMode: 'none' | 'blur' | 'image';
  vbgBlurAmount: number;
  vbgActivePreset: string | null;
  vbgBackgroundImage: string | null;
  lastUpdated: number;
}
```

## ⌨️ Keyboard Shortcuts (Prejoin)

- `Ctrl + E` - Toggle camera
- `Ctrl + D` - Toggle mic
- `Ctrl + B` - Open virtual background panel
- `Enter` - Join video call
- `Esc` - Exit prejoin

## 🐛 Troubleshooting

### Camera/Mic không hoạt động
- Kiểm tra browser permissions
- Thử refresh trang (F5)
- Kiểm tra device có được connect không

### Virtual background không apply
- Kiểm tra MediaPipe WASM files
- Xem console log
- Thử tắt VBG và bật lại

### Settings không được apply vào video call
- Kiểm tra localStorage (F12 → Application → Local Storage)
- Clear cache và thử lại
- Xem console log trong VideolifyFull_v2

## 📊 Flow diagram

```
┌─────────────────┐
│   Dashboard     │
│  (Tutor/Student)│
└────────┬────────┘
         │ Click "Tham gia"
         ▼
┌─────────────────┐
│  Prejoin Page   │
│  - Setup camera │
│  - Setup mic    │
│  - Setup VBG    │
└────────┬────────┘
         │ Click "Tham gia ngay"
         ▼
┌─────────────────┐
│ Video Call V2   │
│ (VideolifyFull) │
│  - Load settings│
│  - Join P2P     │
└─────────────────┘
```

## 📝 Notes

- Prejoin settings persist across sessions (localStorage)
- Settings are applied automatically khi vào video call
- Mỗi user có settings riêng (theo browser)
- VBG chỉ apply được khi camera enabled
