# Our Little Universe

An immersive Three.js photo experience. Double-click `START-SITE.bat` to launch it.

Do not open `index.html` directly: browsers block local JavaScript modules and image
textures for security reasons. You can also start it manually:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Synchronized voice notes

The site uses Supabase Storage, anonymous authentication, and Realtime. Before the
voice recorder can sync, enable Anonymous Sign-Ins in the Supabase dashboard and
run `supabase-setup.sql` once in the SQL Editor.
