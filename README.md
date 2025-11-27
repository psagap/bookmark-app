# Bookmark Web App - Backend Server

A simple Node.js/Express backend server for managing bookmarks with a beautiful React-based web dashboard.

## Features

✨ **API Server**
- REST API endpoints for CRUD operations
- JSON file storage for bookmarks
- CORS enabled for extension integration
- Statistics and filtering endpoints

🎨 **Web Dashboard**
- Beautiful, responsive UI
- Real-time search and filtering
- Add, edit, and delete bookmarks
- Full bookmark metadata display
- Organized by category (Video, Text, Audio, Image)

🔌 **Integration**
- Seamless connection with Chrome extension
- Bookmarks saved from extension appear in dashboard
- Real-time sync between extension and web app

## Quick Start

### Prerequisites
- Node.js 14+ installed
- npm or yarn

### Installation

1. Open terminal in the web-app folder:
```bash
cd ~/Desktop/web-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

You should see:
```
📑 Bookmark server running on http://localhost:3000
Data stored in: ~/Desktop/web-app/bookmarks.json
```

4. Open your browser:
```
http://localhost:3000
```

## Project Structure

```
web-app/
├── server.js              # Express server
├── package.json           # Dependencies
├── bookmarks.json         # Data storage (auto-created)
└── public/
    ├── index.html         # Main HTML page
    ├── app.js            # Frontend logic
    └── (styles in index.html)
```

## API Endpoints

### GET /api/bookmarks
Get all bookmarks with optional filters
```
GET http://localhost:3000/api/bookmarks
GET http://localhost:3000/api/bookmarks?category=video
GET http://localhost:3000/api/bookmarks?search=youtube
```

### GET /api/bookmarks/:id
Get a single bookmark
```
GET http://localhost:3000/api/bookmarks/123456-abc
```

### POST /api/bookmarks
Create a new bookmark
```
POST http://localhost:3000/api/bookmarks
Content-Type: application/json

{
  "title": "How to Learn React",
  "url": "https://youtube.com/watch?v=...",
  "category": "video",
  "subCategory": "youtube-video",
  "tags": ["react", "tutorial"],
  "metadata": { "author": "Some Channel" }
}
```

### PUT /api/bookmarks/:id
Update a bookmark
```
PUT http://localhost:3000/api/bookmarks/123456-abc
Content-Type: application/json

{
  "title": "Updated Title",
  "tags": ["updated", "tags"]
}
```

### DELETE /api/bookmarks/:id
Delete a bookmark
```
DELETE http://localhost:3000/api/bookmarks/123456-abc
```

### GET /api/stats
Get statistics
```
GET http://localhost:3000/api/stats
```

Response:
```json
{
  "total": 25,
  "categories": {
    "video": 10,
    "text": 8,
    "audio": 5,
    "image": 2
  },
  "subCategories": {
    "youtube-video": 8,
    "article": 5,
    "tweet": 2,
    "podcast": 3,
    "song": 2
  }
}
```

## Data Format

Each bookmark follows this structure:

```json
{
  "id": "1715628392-abc123def",
  "userId": "local-user",
  "url": "https://youtube.com/watch?v=...",
  "title": "How to Build a React App",
  "thumbnail": "https://...",
  "createdAt": 1715628392,
  "updatedAt": 1715628392,
  "category": "video",
  "subCategory": "youtube-video",
  "tags": ["youtube", "tutorial", "react"],
  "metadata": {
    "duration": "10:05",
    "author": "TechChannel",
    "platform": "YouTube",
    "selectedText": "",
    "isThread": false,
    "threadReplies": []
  },
  "notes": "Great tutorial for beginners",
  "archived": false
}
```

## Dashboard Features

### Viewing Bookmarks
- Grid view with card layout
- Shows title, category, tags, and date
- Click any card to edit

### Searching
- Real-time search by title, URL, or text
- Highlights matching results

### Filtering
- Filter by category: Videos, Articles, Audio, Images
- Multiple category buttons

### Adding Bookmarks
- Click "+ Add Bookmark" button
- Fill in title, URL, category, type, tags, and notes
- Manual entry for any bookmark

### Editing
- Click on a card to open edit modal
- Change title, category, type, tags, or notes
- Delete bookmarks

### Statistics
- Shows total bookmarks
- Breakdown by category
- Updated in real-time

## How It Works with Extension

1. **User saves bookmark in extension**
   - Click extension icon on any page
   - Auto-detects content type
   - Click "Save"

2. **Extension sends to server**
   - Data sent to `http://localhost:3000/api/bookmarks`
   - Saved to `bookmarks.json`
   - Falls back to local storage if server is down

3. **View in web dashboard**
   - Open `http://localhost:3000`
   - See all saved bookmarks
   - Search, filter, edit, delete

## Configuration

### Change Server Port
Edit `server.js`:
```javascript
const PORT = 3000; // Change to your preferred port
```

### Change Data Storage Location
Edit `server.js`:
```javascript
const dataFile = path.join(__dirname, 'bookmarks.json'); // Change path
```

## Troubleshooting

### Server won't start
1. Make sure Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Check if port 3000 is already in use
4. Try different port in server.js

### Bookmarks not appearing
1. Check if server is running: `http://localhost:3000` in browser
2. Check browser console for errors (F12)
3. Check if `bookmarks.json` exists in web-app folder
4. Reload the page

### Extension not saving to server
1. Make sure server is running on `localhost:3000`
2. Check extension console: Right-click extension → Inspect
3. Check if CORS is enabled (it is by default)
4. Bookmark falls back to local storage if server unavailable

### Data not syncing
- Web app reads from `bookmarks.json`
- Extension saves to both local IndexedDB AND server
- Refresh web app page to see new bookmarks
- Check Network tab (F12) to see API calls

## Development

### Adding Features

**To add new API endpoints:**
```javascript
app.get('/api/your-endpoint', (req, res) => {
  // Your code
  res.json(data);
});
```

**To modify dashboard:**
- Edit `public/index.html` for markup
- Edit `public/app.js` for logic
- Edit inline `<style>` in HTML for styling

**To change data storage:**
Replace JSON file storage with database:
- SQLite: Use `better-sqlite3` package
- MongoDB: Use `mongoose` package
- PostgreSQL: Use `pg` package

## Future Enhancements

- [ ] User accounts and authentication
- [ ] Cloud backup to Firebase
- [ ] Sharing collections with others
- [ ] Advanced search and filters
- [ ] Reading list/progress tracking
- [ ] Export to various formats (JSON, CSV, PDF)
- [ ] Browser history integration
- [ ] AI-powered categorization
- [ ] Collections and folders

## Environment Variables (Optional)

Create `.env` file for configuration:
```
PORT=3000
NODE_ENV=development
DATA_FILE=./bookmarks.json
```

## License

MIT

## Support

For issues:
1. Check the Troubleshooting section
2. Check browser console (F12) for errors
3. Check extension console for errors
4. Restart both server and extension

---

**Happy bookmarking!** 📑✨
