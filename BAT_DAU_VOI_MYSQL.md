# 🚀 Bắt đầu với MySQL - Hướng dẫn siêu nhanh

## ⚡ Setup MySQL trong 5 phút

### **Bước 1: Chạy script tự động**
```bash
node scripts/switch-to-mysql.js
```
✅ Script sẽ tự động backup PostgreSQL và setup MySQL cho bạn

### **Bước 2: Cài packages**
```bash
npm install
```

### **Bước 3: Tạo database**
```bash
mysql -u root -p
```
Trong MySQL console:
```sql
CREATE DATABASE lophoc_online CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit
```

### **Bước 4: Tạo file .env**
```bash
echo "DATABASE_URL=mysql://root:your_password@localhost:3306/lophoc_online" > .env
echo "SESSION_SECRET=abc123xyz789randomkey12345678901234567890" >> .env
echo "NODE_ENV=development" >> .env
```

**⚠️ Thay `your_password` bằng mật khẩu MySQL của bạn**

### **Bước 5: Chạy app**
```bash
npm run db:push
npm run dev
```

**🎉 Xong! Mở http://localhost:5000**

---

## 📚 Tài liệu đầy đủ

Nếu cần chi tiết hơn, xem:

| File | Mục đích |
|------|----------|
| **[MYSQL_SETUP_COMPLETE.md](./MYSQL_SETUP_COMPLETE.md)** | 📋 Tổng hợp đầy đủ |
| **[HUONG_DAN_MYSQL.md](./HUONG_DAN_MYSQL.md)** | 📖 Chi tiết từng bước |
| **[CHUYEN_DOI_MYSQL_NHANH.md](./CHUYEN_DOI_MYSQL_NHANH.md)** | ⚡ Hướng dẫn nhanh |
| **[scripts/README_SCRIPTS.md](./scripts/README_SCRIPTS.md)** | 🤖 Dùng scripts |

---

## 🔄 Quay lại PostgreSQL

```bash
node scripts/switch-to-postgres.js
npm install
npm run db:push
npm run dev
```

---

## 🐛 Lỗi thường gặp

### Lỗi: "Client does not support authentication"
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Lỗi: "Access denied"
- Kiểm tra username/password trong `.env`
- Test: `mysql -u root -p`

### Lỗi: "Unknown database"
```sql
CREATE DATABASE lophoc_online;
```

---

**Chúc bạn thành công!** 🎉
