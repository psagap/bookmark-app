/**
 * Migration Script: Upload existing bookmarks to Supabase
 * 
 * USAGE:
 * 1. First, log into the app (http://localhost:5173) and get your user ID
 * 2. Run: node migrate-to-supabase.js YOUR_USER_ID
 * 
 * Example: node migrate-to-supabase.js 123e4567-e89b-12d3-a456-426614174000
 */

const fs = require('fs');
const path = require('path');

// Supabase configuration
const SUPABASE_URL = 'https://oxkhforkxcmeyqdjybmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94a2hmb3JreGNtZXlxZGp5Ym13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzIzNjEsImV4cCI6MjA4MjU0ODM2MX0.0mdKH3c9Q6LIfTGLFwF5W4yAfA9VJ5Jq-5NFRmVHRyw';

// For migration, we need the service role key to bypass RLS
// Get this from your Supabase dashboard
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function migrateData(userId) {
    if (!userId) {
        console.error('\n❌ Error: User ID is required');
        console.log('\nUsage: node migrate-to-supabase.js YOUR_USER_ID');
        console.log('\nTo get your user ID:');
        console.log('1. Log into the app at http://localhost:5173');
        console.log('2. Open browser DevTools (F12)');
        console.log('3. Run in console: JSON.parse(localStorage.getItem("bookmark_extension_session"))?.user?.id');
        process.exit(1);
    }

    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

    console.log('\n🚀 Starting migration to Supabase...');
    console.log(`📧 Target user ID: ${userId}`);

    if (!SUPABASE_SERVICE_KEY) {
        console.log('\n⚠️  Warning: Using anon key. You must be logged in for RLS to allow inserts.');
        console.log('   For bulk migration, set SUPABASE_SERVICE_KEY environment variable.\n');
    }

    // Helper to safely convert dates
    const safeDate = (timestamp) => {
        if (!timestamp) return new Date().toISOString();
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    };

    // Read existing data
    const bookmarksPath = path.join(__dirname, 'bookmarks.json');
    const collectionsPath = path.join(__dirname, 'collections.json');

    let bookmarks = [];
    let collections = [];

    try {
        if (fs.existsSync(bookmarksPath)) {
            bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf-8'));
            console.log(`📚 Found ${bookmarks.length} bookmarks to migrate`);
        }
        if (fs.existsSync(collectionsPath)) {
            collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf-8'));
            console.log(`📁 Found ${collections.length} collections to migrate`);
        }
    } catch (error) {
        console.error('❌ Error reading files:', error.message);
        process.exit(1);
    }

    // Map old collection IDs to new UUIDs
    const collectionIdMap = new Map();

    // Migrate collections first
    console.log('\n--- Migrating Collections ---');
    for (const collection of collections) {
        const collectionData = {
            user_id: userId,
            name: collection.name,
            color: collection.color || null,
            icon: collection.icon || null,
            created_at: safeDate(collection.createdAt),
            updated_at: safeDate(collection.updatedAt),
        };

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/collections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify(collectionData),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error(`  ❌ Failed: ${collection.name} - ${error.message || JSON.stringify(error)}`);
            } else {
                const [newCollection] = await response.json();
                collectionIdMap.set(collection.id, newCollection.id);
                console.log(`  ✅ Migrated: ${collection.name}`);
            }
        } catch (error) {
            console.error(`  ❌ Error: ${collection.name} - ${error.message}`);
        }
    }

    // Migrate bookmarks
    console.log('\n--- Migrating Bookmarks ---');
    let successCount = 0;
    let failCount = 0;

    for (const bookmark of bookmarks) {
        const bookmarkData = {
            user_id: userId,
            title: bookmark.title || '',
            url: bookmark.url || '',
            description: bookmark.metadata?.ogDescription || '',
            notes: bookmark.notes || '',
            content: bookmark.content || bookmark.notes || '',
            notes_blocks: bookmark.notesBlocks || null,
            tags: bookmark.tags || [],
            pinned: bookmark.pinned || false,
            type: bookmark.type || null,
            category: bookmark.category || null,
            sub_category: bookmark.subCategory || null,
            collection_id: bookmark.collectionId ? collectionIdMap.get(bookmark.collectionId) : null,
            cover_image: bookmark.coverImage || bookmark.thumbnail || '',
            thumbnail: bookmark.thumbnail || '',
            metadata: bookmark.metadata || {},
            archived: bookmark.archived || false,
            created_at: safeDate(bookmark.createdAt),
            updated_at: safeDate(bookmark.updatedAt || bookmark.createdAt),
        };

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/bookmarks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': apiKey,
                    'Authorization': `Bearer ${apiKey}`,
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify(bookmarkData),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error(`  ❌ Failed: ${bookmark.title?.slice(0, 50)}... - ${error.message || JSON.stringify(error)}`);
                failCount++;
            } else {
                console.log(`  ✅ Migrated: ${bookmark.title?.slice(0, 50)}...`);
                successCount++;
            }
        } catch (error) {
            console.error(`  ❌ Error: ${bookmark.title?.slice(0, 50)}... - ${error.message}`);
            failCount++;
        }
    }

    console.log('\n========================================');
    console.log('📊 Migration Complete!');
    console.log(`   ✅ Success: ${successCount} bookmarks`);
    console.log(`   ❌ Failed: ${failCount} bookmarks`);
    console.log(`   📁 Collections: ${collectionIdMap.size}`);
    console.log('========================================\n');
}

// Get user ID from command line
const userId = process.argv[2];
migrateData(userId);
