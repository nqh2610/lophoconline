# Manual F5 Refresh Test

## Test Fix for F5 Refresh Race Condition

### What was fixed:
- **Problem**: When user presses F5, SSE disconnect removes peer AFTER new join, breaking connection
- **Solution**: Added check in `removePeerFromRoom()` to skip removal if peer was recently active (< 2s)

### Manual Test Steps:

1. **Start server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open Browser 1** (User A):
   - Go to: http://localhost:3000/test-videolify?room=test-f5&testUserId=100&name=UserA
   - Wait for page to load

3. **Open Browser 2** (User B):
   - Go to: http://localhost:3000/test-videolify?room=test-f5&testUserId=200&name=UserB
   - Wait for P2P connection (you should see remote video)

4. **Test Case 1: One side F5 (User A refreshes)**:
   - In Browser 1, press **F5** to refresh
   - **Expected**: User A reconnects successfully
   - **Expected**: Both users see each other's video again
   - Check server logs for: `⏭️ Skipping removal of peer... (recently active)`

5. **Test Case 2: Both sides F5 (sequential)**:
   - In Browser 1, press **F5**
   - Wait 3 seconds
   - In Browser 2, press **F5**
   - **Expected**: Both users reconnect successfully

6. **Test Case 3: Both sides F5 (simultaneous)**:
   - Press **F5** on both browsers at roughly the same time
   - **Expected**: Both users reconnect successfully

### What to look for in server logs:

✅ **Good (F5 working)**:
```
[Videolify Signal] ⏭️ Skipping removal of peer peer-xxx (recently active: 500ms ago) - likely F5 refresh
[Videolify Signal] ✅ Allowing REJOIN for peer peer-xxx (F5/reconnect scenario)
[Videolify Signal] ✅ peer peer-xxx joined room
```

❌ **Bad (F5 broken)**:
```
[Videolify Signal] 🗑️ Removed peer peer-xxx from room
[Videolify Signal] ❌ Room is FULL (2 peers) - rejecting NEW peer
```

### Success Criteria:

- [x] Fix implemented (check lastSeen before remove)
- [ ] User A can F5 refresh and reconnect
- [ ] User B can F5 refresh and reconnect
- [ ] Both users can F5 and reconnect
- [ ] No "Room Full" errors after F5
- [ ] Server logs show "Skipping removal" messages
