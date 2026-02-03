# 📊 Sample Data for Testing

Ready-to-use sample data for MongoDB testing.

---

## 🚀 Quick Start: Insert Sample Data

### Option 1: Use Seed Script (Easiest)
```bash
cd x:\PLC_Cloth\server
node seed.js
```
This generates 6 months of test data automatically.

### Option 2: Manual Insert (Using mongosh)

```bash
# Connect to MongoDB
mongosh

# Select database
use plc_data

# Copy and paste the samples below
# They will be inserted one by one
```

---

## 📋 Sample PLC Data

Insert these one at a time in MongoDB:

```javascript
// Sample 1: Machine Running - Good Status
db.pldatas.insertOne({
  machineStatus: "RUNNING",
  shiftWorkingHours: 7.5,
  totalUptimeHours: 2456.3,
  todayProduction: 42,
  totalProduction: 145230,
  fabricLengthMeters: 245.5,
  machineSpeed: 35.2,
  utilizationPercent: 82,
  downtimeMinutes: 12.5,
  alarmCode: 0,
  timestamp: new Date()
})

// Sample 2: Machine Running - High Utilization
db.pldatas.insertOne({
  machineStatus: "RUNNING",
  shiftWorkingHours: 8.2,
  totalUptimeHours: 2461.1,
  todayProduction: 56,
  totalProduction: 145286,
  fabricLengthMeters: 287.3,
  machineSpeed: 42.8,
  utilizationPercent: 95,
  downtimeMinutes: 5.2,
  alarmCode: 0,
  timestamp: new Date()
})

// Sample 3: Machine Idle
db.pldatas.insertOne({
  machineStatus: "IDLE",
  shiftWorkingHours: 6.1,
  totalUptimeHours: 2450.0,
  todayProduction: 28,
  totalProduction: 145200,
  fabricLengthMeters: 156.7,
  machineSpeed: 0,
  utilizationPercent: 0,
  downtimeMinutes: 45.0,
  alarmCode: 0,
  timestamp: new Date()
})

// Sample 4: Machine with Alarm
db.pldatas.insertOne({
  machineStatus: "FAULT",
  shiftWorkingHours: 5.5,
  totalUptimeHours: 2445.0,
  todayProduction: 20,
  totalProduction: 145180,
  fabricLengthMeters: 98.2,
  machineSpeed: 0,
  utilizationPercent: 0,
  downtimeMinutes: 120.0,
  alarmCode: 5,
  timestamp: new Date()
})

// Sample 5: Stopped Machine
db.pldatas.insertOne({
  machineStatus: "STOPPED",
  shiftWorkingHours: 0,
  totalUptimeHours: 2440.0,
  todayProduction: 0,
  totalProduction: 145180,
  fabricLengthMeters: 0,
  machineSpeed: 0,
  utilizationPercent: 0,
  downtimeMinutes: 480.0,
  alarmCode: 0,
  timestamp: new Date()
})
```

---

## 📦 Sample Production Logs

```javascript
// Sample 1: Good Batch
db.productionlogs.insertOne({
  date: new Date("2026-06-12"),
  batch: "FX-24061",
  length: 120,
  defects: 0,
  status: "OK",
  timestamp: new Date()
})

// Sample 2: Batch with Minor Defects
db.productionlogs.insertOne({
  date: new Date("2026-06-12"),
  batch: "FX-24062",
  length: 110,
  defects: 1,
  status: "OK",
  timestamp: new Date()
})

// Sample 3: Batch Needs Review
db.productionlogs.insertOne({
  date: new Date("2026-06-12"),
  batch: "FX-24063",
  length: 95,
  defects: 3,
  status: "CHECK",
  timestamp: new Date()
})

// Sample 4: Another Good Batch
db.productionlogs.insertOne({
  date: new Date("2026-06-11"),
  batch: "FX-24060",
  length: 130,
  defects: 0,
  status: "OK",
  timestamp: new Date()
})

// Sample 5: Large Batch
db.productionlogs.insertOne({
  date: new Date("2026-06-11"),
  batch: "FX-24059",
  length: 155,
  defects: 2,
  status: "CHECK",
  timestamp: new Date()
})

// Sample 6: Perfect Batch
db.productionlogs.insertOne({
  date: new Date("2026-06-10"),
  batch: "FX-24058",
  length: 140,
  defects: 0,
  status: "OK",
  timestamp: new Date()
})
```

---

## 🚨 Sample Alerts

```javascript
// Sample 1: Temperature Warning
db.alerts.insertOne({
  alarmCode: 3,
  message: "Temperature sensor warning - Reading above threshold",
  severity: "WARNING",
  timestamp: new Date(Date.now() - 30 * 60 * 1000),
  resolved: true,
  resolvedAt: new Date(Date.now() - 10 * 60 * 1000),
  notes: "Temperature normalized after cooldown"
})

// Sample 2: Active Pressure Error
db.alerts.insertOne({
  alarmCode: 5,
  message: "Hydraulic pressure below minimum - Check pump",
  severity: "ERROR",
  timestamp: new Date(Date.now() - 5 * 60 * 1000),
  resolved: false,
  resolvedAt: null,
  notes: "Waiting for maintenance"
})

// Sample 3: Informational Status
db.alerts.insertOne({
  alarmCode: 1,
  message: "Shift change - Production rate reset",
  severity: "INFO",
  timestamp: new Date(Date.now() - 2 * 60 * 1000),
  resolved: true,
  resolvedAt: new Date(Date.now() - 1 * 60 * 1000),
  notes: "Normal operation"
})

// Sample 4: Maintenance Alert
db.alerts.insertOne({
  alarmCode: 7,
  message: "Maintenance reminder - Filter replacement due",
  severity: "WARNING",
  timestamp: new Date(Date.now() - 60 * 60 * 1000),
  resolved: false,
  resolvedAt: null,
  notes: "Schedule maintenance within 24 hours"
})

// Sample 5: Critical Issue
db.alerts.insertOne({
  alarmCode: 15,
  message: "Critical: Motor overload detected",
  severity: "ERROR",
  timestamp: new Date(Date.now() - 120 * 60 * 1000),
  resolved: true,
  resolvedAt: new Date(Date.now() - 90 * 60 * 1000),
  notes: "Circuit breaker tripped and reset"
})
```

---

## 🔄 Bulk Insert (All at Once)

```javascript
// Insert all PLC data at once
db.pldatas.insertMany([
  {
    machineStatus: "RUNNING",
    shiftWorkingHours: 7.5,
    totalUptimeHours: 2456.3,
    todayProduction: 42,
    totalProduction: 145230,
    fabricLengthMeters: 245.5,
    machineSpeed: 35.2,
    utilizationPercent: 82,
    downtimeMinutes: 12.5,
    alarmCode: 0,
    timestamp: new Date()
  },
  {
    machineStatus: "RUNNING",
    shiftWorkingHours: 8.2,
    totalUptimeHours: 2461.1,
    todayProduction: 56,
    totalProduction: 145286,
    fabricLengthMeters: 287.3,
    machineSpeed: 42.8,
    utilizationPercent: 95,
    downtimeMinutes: 5.2,
    alarmCode: 0,
    timestamp: new Date()
  },
  {
    machineStatus: "IDLE",
    shiftWorkingHours: 6.1,
    totalUptimeHours: 2450.0,
    todayProduction: 28,
    totalProduction: 145200,
    fabricLengthMeters: 156.7,
    machineSpeed: 0,
    utilizationPercent: 0,
    downtimeMinutes: 45.0,
    alarmCode: 0,
    timestamp: new Date()
  }
])

// Insert all production logs at once
db.productionlogs.insertMany([
  {
    date: new Date("2026-06-12"),
    batch: "FX-24061",
    length: 120,
    defects: 0,
    status: "OK",
    timestamp: new Date()
  },
  {
    date: new Date("2026-06-12"),
    batch: "FX-24062",
    length: 110,
    defects: 1,
    status: "OK",
    timestamp: new Date()
  },
  {
    date: new Date("2026-06-12"),
    batch: "FX-24063",
    length: 95,
    defects: 3,
    status: "CHECK",
    timestamp: new Date()
  }
])

// Insert all alerts at once
db.alerts.insertMany([
  {
    alarmCode: 3,
    message: "Temperature sensor warning",
    severity: "WARNING",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    resolved: true,
    resolvedAt: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    alarmCode: 5,
    message: "Hydraulic pressure below minimum",
    severity: "ERROR",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    resolved: false,
    resolvedAt: null
  }
])
```

---

## ✅ Verify Data Was Inserted

```bash
mongosh
use plc_data

# Count documents
db.pldatas.countDocuments()          # Should show > 0
db.productionlogs.countDocuments()   # Should show > 0
db.alerts.countDocuments()           # Should show > 0

# View sample documents
db.pldatas.findOne()
db.productionlogs.findOne()
db.alerts.findOne()

# See all documents
db.pldatas.find().pretty()
db.productionlogs.find().pretty()
db.alerts.find().pretty()
```

---

## 🧪 Test in the App

### Step 1: Insert Data
Use one of the methods above to insert sample data.

### Step 2: Start Servers
```bash
# Terminal 1
cd x:\PLC_Cloth\server
npm run dev

# Terminal 2
cd x:\PLC_Cloth\PLC_App
npm run dev
```

### Step 3: Verify in Dashboard
```
http://localhost:5173
```

You should see:
- ✅ Stat cards with real data
- ✅ Machine status (RUNNING, IDLE, etc.)
- ✅ Production count
- ✅ Utilization percentage
- ✅ Alerts in the alerts panel
- ✅ Production logs in the table

### Step 4: Check API
```bash
curl http://localhost:8080/api/dashboard
```

Should return JSON with:
- stats (array of metrics)
- runtimePoints (hourly data)
- productionBars (monthly data)
- logRows (production logs)

---

## 📊 Data Field Reference

### PLC Data Fields

| Field | Type | Range | Example |
|-------|------|-------|---------|
| machineStatus | String | STOPPED, RUNNING, IDLE, FAULT | "RUNNING" |
| shiftWorkingHours | Number | 0-24 | 7.5 |
| totalUptimeHours | Number | 0-10000+ | 2456.3 |
| todayProduction | Number | 0-1000+ | 42 |
| totalProduction | Number | 0-1000000+ | 145230 |
| fabricLengthMeters | Number | 0-500 | 245.5 |
| machineSpeed | Number | 0-100 | 35.2 |
| utilizationPercent | Number | 0-100 | 82 |
| downtimeMinutes | Number | 0-1440 | 12.5 |
| alarmCode | Number | 0-255 | 0 (0=no alarm) |
| timestamp | Date | ISO 8601 | new Date() |

### Production Log Fields

| Field | Type | Example |
|-------|------|---------|
| date | Date | new Date("2026-06-12") |
| batch | String | "FX-24061" |
| length | Number | 120 (meters) |
| defects | Number | 0-10 |
| status | String | "OK", "CHECK" |

### Alert Fields

| Field | Type | Example |
|-------|------|---------|
| alarmCode | Number | 5 |
| message | String | "Temperature sensor warning" |
| severity | String | "INFO", "WARNING", "ERROR", "CRITICAL" |
| timestamp | Date | new Date() |
| resolved | Boolean | true/false |
| resolvedAt | Date | null or date |
| notes | String | "Waiting for maintenance" |

---

## 🎯 Test Scenarios

### Scenario 1: Normal Operation
Insert data with:
- machineStatus: "RUNNING"
- utilizationPercent: 75-90
- alarmCode: 0
- todayProduction: 40-60

**Expected Result:** Green status, high utilization gauge, no alerts

### Scenario 2: Machine Idle
Insert data with:
- machineStatus: "IDLE"
- utilizationPercent: 0
- machineSpeed: 0
- alarmCode: 0

**Expected Result:** Gray status, empty gauge

### Scenario 3: Machine With Alarm
Insert data with:
- machineStatus: "FAULT"
- alarmCode: 5
- utilizationPercent: 0

**Expected Result:** Red status, alert in alerts panel

### Scenario 4: High Defects
Insert production logs with:
- defects: 3+
- status: "CHECK"

**Expected Result:** "CHECK" badge appears in production log

---

## 💾 Clear and Reset

### Delete All Data
```bash
mongosh
use plc_data

# Delete everything
db.pldatas.deleteMany({})
db.productionlogs.deleteMany({})
db.alerts.deleteMany({})

# Verify it's gone
db.pldatas.countDocuments()  # Should be 0
```

### Delete and Reseed
```bash
# Clear data
mongosh
use plc_data
db.pldatas.deleteMany({})
db.productionlogs.deleteMany({})
db.alerts.deleteMany({})

# Re-seed with fresh data
# Exit mongosh (Ctrl+C)
cd x:\PLC_Cloth\server
node seed.js
```

---

## 🚀 Quick Test Workflow

```bash
# 1. Start fresh
mongosh
use plc_data
db.pldatas.deleteMany({})
db.productionlogs.deleteMany({})
db.alerts.deleteMany({})
exit

# 2. Insert sample data (copy-paste the samples above in mongosh)
mongosh
use plc_data
# Paste sample data here
exit

# 3. Start servers
# Terminal 1: cd server && npm run dev
# Terminal 2: cd PLC_App && npm run dev

# 4. Check browser
# http://localhost:5173

# 5. Check API
# curl http://localhost:8080/api/dashboard
```

---

## 📌 Tips

- **Machine Status:** Only use "STOPPED", "RUNNING", "IDLE", "FAULT"
- **Timestamps:** Use `new Date()` for current time
- **Utilization:** Should be 0-100 percent
- **Alarms:** 0 = no alarm, any other number = alarm code
- **Batch Names:** Format like "FX-YYMMDD" (e.g., "FX-260612")
- **Colors:** Green (OK), Amber (CHECK), Red (FAULT/ERROR)

---

## ✨ Expected Dashboard Display

After inserting sample data and starting the app:

**Stat Cards:**
- Machine Status: RUNNING ✅
- Today Working Hours: 7.5 hrs
- Today Production: 42 rolls
- Utilization: 82%

**Charts:**
- Runtime: Shows utilization trend
- Monthly: Shows production bars
- Log Table: Shows batch records

**Alerts:**
- Shows any active alerts
- Color-coded by severity

**Last Updated:**
- Shows timestamp

---

## 🔍 Troubleshooting

**Data not showing?**
- Check MongoDB is running: `mongosh`
- Verify data was inserted: `db.pldatas.countDocuments()`
- Refresh browser (Ctrl+R)
- Check console (F12)

**Dashboard shows "WebSocket disconnected"?**
- Ensure backend is running: `npm run dev` in server/
- Check port 8080 is open

**API returns empty?**
- Verify data in MongoDB: `db.pldatas.findOne()`
- Check backend logs for errors

---

**Ready to test!** Insert the samples above and watch your dashboard come to life. 🎉

