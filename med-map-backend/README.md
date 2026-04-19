# Med Map Backend

Backend server for the Med Map application using Node.js, Express, and MongoDB Atlas.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your MongoDB credentials (already configured):
```env
MONGO_URI=mongodb+srv://admin:admin_pass@medmapcluster.vibzuex.mongodb.net/medmap?retryWrites=true&w=majority
PORT=5001
```

3. Start the server:
```bash
node server.js
```

**Note:** Port 5001 is used because macOS often uses port 5000 for AirPlay/AirTunes services.

## MongoDB Atlas IP Whitelist

If you see a connection error like:
```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster
```

**You need to whitelist your IP address in MongoDB Atlas:**

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Sign in to your account
3. Select your project (MedMap)
4. Click on "Network Access" in the left sidebar
5. Click "Add IP Address"
6. Either:
   - Click "Add Current IP Address" (recommended for development)
   - Or click "Allow Access from Anywhere" (0.0.0.0/0) for testing
7. Click "Confirm"

Wait 1-2 minutes for the changes to propagate, then restart your server.

## API Endpoints

### Save or Update Profile
- **POST** `/api/profile`
- Body: `{ clerkUserId: string, fullName?: string, bloodType?: string, insuranceProvider?: string, policyNumber?: string, emergencyContactName?: string, emergencyContactPhone?: string }`
- Response: `{ message: string, profile: object }`

### Get Profile
- **GET** `/api/profile/:userId`
- Response: Profile object or `{}`

## Troubleshooting

### Connection Issues

1. **Check your .env file** - Ensure `MONGO_URI` is set correctly
2. **Verify IP whitelist** - Your IP must be whitelisted in MongoDB Atlas
3. **Check credentials** - Username and password must be correct
4. **Check network** - Ensure you have internet access

### Common Errors

- **MODULE_NOT_FOUND** - Run `npm install` to install dependencies
- **PORT already in use** - Kill the process on port 5000: `lsof -ti:5000 | xargs kill -9`
- **MongoDB connection timeout** - Check IP whitelist and network connection

## Fixed Issues (Apr 18, 2026)

✅ Removed duplicate `mongoose.connect()` calls  
✅ Changed from manual shard URIs to proper `mongodb+srv://` format  
✅ Added proper connection event handlers  
✅ Improved error messages for easier debugging
