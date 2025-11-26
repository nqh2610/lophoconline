# Test Files

Thư mục này chứa tất cả các file test và script kiểm thử cho dự án.

## Cấu trúc

- **test-*.mjs** - Test scripts cho Playwright
- **test-*.bat/.ps1** - Test runners cho Windows
- **run-*.bat** - Script chạy test tự động
- **verify-*.mjs** - Script kiểm tra và validate code
- **test-screenshots/** - Screenshots từ các test case

## Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy test cụ thể
node tests/test-videolify-v2.mjs
```
