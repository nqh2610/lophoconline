# Test F5 UX Improvements

## Changes Made:

### 1. UX Consistency Fix
- ✅ Added `isReconnecting` state to differentiate between connection lost vs peer F5
- ✅ Peer side shows: "Đang kết nối lại... Người kia đang tải lại trang (F5)..."
- ✅ Local side (after F5) shows: "Đang kết nối lại... Vui lòng đợi trong giây lát" with loading spinner
- ✅ No more confusing "Mất kết nối" when peer is just refreshing

### 2. Speed Improvements
- ✅ Reduced peer-left grace period: 5s → 2s
- ✅ Reduced disconnection timeout: 5s → 2s
- ✅ Total F5 reconnect time: ~12s → ~4-6s (estimated)

## Manual Test Steps:

1. **Open 2 browsers:**
   - Browser 1 (Tutor): `http://localhost:3001/test-videolify?room=ux-test-001&name=Tutor&role=tutor`
   - Browser 2 (Student): `http://localhost:3001/test-videolify?room=ux-test-001&name=Student&role=student`

2. **Enable VBG on Tutor** (optional, to test VBG sync too)

3. **Wait for connection** (~2s)

4. **Student F5:**
   - ✅ Tutor should see: "Đang kết nối lại... Người kia đang tải lại trang (F5)..." (yellow spinner)
   - ✅ Student (after reload) should see: "Đang kết nối lại... Vui lòng đợi trong giây lát" (blue spinner)
   - ✅ Reconnect time should be ~4-6 seconds (was ~12s before)

5. **Tutor F5:**
   - Same UX but reversed

## Expected Results:

### Before (Old UX):
- Local F5: "Đang chờ người khác tham gia" ❌ (no feedback)
- Peer: "Mất kết nối" ❌ (looks like error)
- Reconnect time: ~12 seconds ❌

### After (New UX):
- Local F5: "Đang kết nối lại..." with spinner ✅ (clear feedback)
- Peer: "Đang kết nối lại... Người kia đang tải lại trang" ✅ (informative)
- Reconnect time: ~4-6 seconds ✅ (2-3x faster)

## Notes:
- `isReconnecting` is set when `peer-left` event fires
- Cleared when peer rejoins or 30s timeout expires
- Grace period reduced from 5s to 2s (optimal for F5 detection)
