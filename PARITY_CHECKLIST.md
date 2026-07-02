# BloodPressureWeb Parity Checklist

## Auth
- [x] Register via `/api/v1/auth/register`
- [x] Login via `/api/v1/auth/login`
- [x] Refresh token on `401` via `/api/v1/auth/refresh`
- [x] Logout via `/api/v1/auth/logout`
- [x] Protected routes require active session

## Readings
- [x] Add reading (systolic/diastolic/pulse/note)
- [x] Edit reading
- [x] Delete reading (soft-delete until sync)
- [x] History list
- [x] Search/filter by note

## Home
- [x] Last reading card
- [x] 7-day average card
- [x] Category label (NORMAL/ELEVATED/STAGE1/STAGE2/CRISIS)

## Analytics
- [x] Periods: 7/30/90/ALL
- [x] Averages/min/max
- [x] Trend direction (UP/DOWN/STABLE with +/-2 threshold)
- [x] Category distribution chart
- [x] Systolic/diastolic line chart
- [x] Note-only records excluded

## Sync / Offline-first
- [x] IndexedDB storage
- [x] Pending/Synced state
- [x] Outgoing upserts + deleted server IDs
- [x] Remote changes merge
- [x] Mapping localId -> serverId
- [x] Manual sync in settings

## Import / Export
- [x] Export JSON
- [x] Export CSV
- [x] Export XLSX
- [x] Import JSON

## Settings & UX improvements
- [x] Explicit server URL settings section (no hidden gesture)
- [x] Toggle strict field validation
- [x] Better auth/network error messages
- [x] History filter

## Automated tests
- [x] Validation unit tests
- [x] Analytics unit tests
- [x] Integration tests for sync/auth flows
- [x] E2E smoke tests scaffold (`playwright`)
