# Setlist to Apple Music

A Claude Code skill that takes a setlist and adds the songs to an Apple Music playlist via AppleScript.

## Setup

Drop this file into your project's `skills/` folder (or `~/.claude/skills/` for global use) and Claude Code will pick it up as a `/setlist-to-apple-music` slash command.

## Usage

```
/setlist-to-apple-music
```

Then paste or describe your setlist. Claude will parse it, generate the AppleScript, and ask before running it.

---

## SKILL

**Name:** setlist-to-apple-music  
**Description:** Takes a setlist and adds the songs to an Apple Music playlist using AppleScript. I'm sure there's an easier way, but here's how I roll.

### Instructions

When the user invokes this skill:

1. Ask the user to paste their setlist. Accept any reasonable format — numbered lists, plain text, "Artist - Song", "Song by Artist", setlist.fm copy-paste, etc.

2. Parse the setlist into a list of `{ artist, title }` pairs. If artist info is missing for some songs, note it but continue.

3. Ask the user what they want to name the playlist (suggest a name based on the setlist if it's obvious, e.g. the artist name or event).

4. Generate AppleScript that:
   - Creates a new playlist in Music.app with the given name (or uses an existing one with that name)
   - Searches the local library for each song by title, preferring matches where the artist also matches
   - Adds matched tracks to the playlist
   - Logs a summary of matched vs. unmatched songs using `display dialog`

   Template AppleScript:
   ```applescript
   set playlistName to "PLAYLIST_NAME_HERE"
   set songList to {SONG_LIST_HERE}
   -- songList format: {{"Artist", "Title"}, {"Artist", "Title"}, ...}

   tell application "Music"
     -- Create playlist if it doesn't exist
     if not (exists user playlist playlistName) then
       make new user playlist with properties {name:playlistName}
     end if
     set targetPlaylist to user playlist playlistName

     set matched to 0
     set unmatched to {}

     repeat with songPair in songList
       set songArtist to item 1 of songPair
       set songTitle to item 2 of songPair
       set foundTrack to missing value

       -- Search library for the title
       set searchResults to (every track of library playlist 1 whose name is songTitle)

       -- Prefer exact artist match
       repeat with t in searchResults
         if artist of t is songArtist then
           set foundTrack to t
           exit repeat
         end if
       end repeat

       -- Fall back to first result if no artist match
       if foundTrack is missing value and (count of searchResults) > 0 then
         set foundTrack to item 1 of searchResults
       end if

       if foundTrack is not missing value then
         duplicate foundTrack to targetPlaylist
         set matched to matched + 1
       else
         set end of unmatched to songTitle & " – " & songArtist
       end if
     end repeat

     -- Summary
     set unmatchedCount to count of unmatched
     set summaryMsg to "Added " & matched & " song(s) to \"" & playlistName & "\"."
     if unmatchedCount > 0 then
       set summaryMsg to summaryMsg & return & return & "Not found (" & unmatchedCount & "):" & return
       repeat with u in unmatched
         set summaryMsg to summaryMsg & "  • " & u & return
       end repeat
     end if
     display dialog summaryMsg buttons {"OK"} default button "OK"
   end tell
   ```

5. Show the user the generated AppleScript and ask: "Run this now, or copy it to run manually?"

6. If they say run:
   - Use the Bash tool: `osascript -e '<script>'` (inline for short scripts, or write to a temp `.scpt` file for longer ones)
   - Report back what the AppleScript summary dialog said

7. If songs were unmatched, offer to help the user find alternate titles or spellings.

### Notes

- This only works on macOS with Apple Music (Music.app).
- Songs must be in the user's local library — this does not add from the Apple Music catalog.
- Setlist.fm paste format works well as input.
