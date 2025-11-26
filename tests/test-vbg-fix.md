# Manual Test: Virtual Background Sync Fix

## Vấn đề đã fix
- ❌ API `/api/videolify/signal` KHÔNG xử lý action `vbg-settings`
- ❌ Không có unicast function → toPeerId không hoạt động
- ✅ Đã thêm case 'vbg-settings' vào API
- ✅ Đã thêm sendToSpecificPeer() cho unicast

## Test Cases

### Test 1: Local chọn background mới → Peer thấy ngay

**Setup:**
1. Mở 2 browser (hoặc incognito)
2. Login 2 accounts khác nhau
3. Join cùng 1 room

**Test:**
1. Peer A: Click chọn preset background (Office/Beach/Mountains)
2. Đợi 3-5 giây
3. **Expected:** Peer B thấy background của Peer A thay đổi
4. **Check console:** `📡 [VBG] Broadcasting preset background settings via SSE`
5. **Check console Peer B:** `📥 [VBG-DEBUG] Received VBG settings from peer`

**Log mong muốn:**
```
[Peer A] 📡 [VBG] Broadcasting preset background settings via SSE
[Server] 🎭 Broadcasting VBG settings from peerA in room test-room
[Server] [SSE] Unicast vbg-settings to peer peerB
[Peer B] 📥 [VBG-DEBUG] Received VBG settings from peer: {enabled: true, mode: 'image', ...}
[Peer B] ✅ [VBG-DEBUG] Applying VBG to remote video...
```

---

### Test 2: Join với background từ localStorage → Peer nhận

**Setup:**
1. Peer A: Join room, chọn background Beach
2. Refresh (F5) Peer A
3. Background auto-restore sau 5s

**Test:**
1. Trong lúc Peer A đang chờ auto-restore (5s), Peer B join room
2. Sau khi Peer A auto-restore xong (t=5s), kiểm tra Peer B
3. **Expected:** Peer B thấy background Beach của Peer A
4. **Check console Peer A:** `▶️ [VBG] Calling loadPresetBackground (delayed 5s for MediaPipe)`
5. **Check console Peer B:** `📥 [VBG-DEBUG] Received VBG settings`

**Hoặc:**
1. Peer A đã auto-restore xong (có background Beach)
2. Peer B join room MỚI
3. **Expected:** Peer A gửi settings cho Peer B ngay khi Peer B join
4. **Check console Peer A:** `📡 [VBG] New peer joined, sending current VBG settings...`

---

### Test 3: F5 với background → Peer vẫn có background

**Setup:**
1. Peer A và Peer B đã join, Peer A có background Mountains
2. Peer B thấy background Mountains của Peer A

**Test:**
1. Peer A: Press F5 (reload page)
2. Sau khi reload, Peer A auto-restore background từ localStorage (5s delay)
3. **Expected:** Peer B vẫn thấy background Mountains của Peer A
4. **Check console:** 
   - Peer A: Auto-restore chạy
   - Peer A: Broadcast VBG settings sau khi restore
   - Peer B: Nhận VBG settings

---

### Test 4: Blur mode (bonus)

**Test:**
1. Peer A: Enable blur (not image)
2. **Expected:** Peer B thấy video của Peer A bị blur
3. **Check console:** `mode: 'blur', blurAmount: 10`

---

## Debug Commands

### Check localStorage (Peer A)
```js
console.log({
  enabled: localStorage.getItem('vbg-enabled'),
  mode: localStorage.getItem('vbg-last-mode'),
  background: localStorage.getItem('vbg-last-background'),
  imageUrl: localStorage.getItem('vbg-background-image')
})
```

### Check remote VBG settings (Peer B nhận từ Peer A)
```js
// Get Peer A's ID first
const peerAId = remotePeerIdRef.current;

console.log({
  mode: localStorage.getItem(`peer-${peerAId}-vbg-mode`),
  blur: localStorage.getItem(`peer-${peerAId}-vbg-blur`),
  background: localStorage.getItem(`peer-${peerAId}-vbg-background`)
})
```

### Check SSE connection
```js
console.log({
  readyState: window.eventSource?.readyState, // 0=CONNECTING, 1=OPEN, 2=CLOSED
  url: window.eventSource?.url
})
```

---

## Expected Results

✅ **Test 1:** Peer B thấy background thay đổi trong vòng 5 giây  
✅ **Test 2:** Peer B nhận background khi join (hoặc sau auto-restore)  
✅ **Test 3:** Peer B vẫn giữ background sau khi Peer A F5  
✅ **Test 4:** Blur mode hoạt động tương tự

---

## Nếu vẫn FAIL

### Check Server Logs
- Tìm `[Videolify Signal] 🎭 Broadcasting VBG settings`
- Nếu KHÔNG có → Client không gửi request
- Nếu CÓ nhưng Peer B không nhận → Check SSE connection

### Check Client Console
- Peer A: `📡 [VBG] Broadcasting` → OK, đã gửi
- Peer B: `📥 [VBG-DEBUG] Received` → OK, đã nhận
- Peer B: `✅ [VBG-DEBUG] Applying VBG` → OK, đang apply
- Peer B: `⚠️ No remote stream` → Pending queue sẽ handle

### Common Issues
1. **Server không restart:** Phải restart server để load code mới
2. **SSE disconnected:** Check `window.eventSource.readyState === 1`
3. **Wrong peer ID:** Check `remotePeerIdRef.current` có đúng không
4. **MediaPipe chưa load:** Đợi 3-5s sau khi chọn background
