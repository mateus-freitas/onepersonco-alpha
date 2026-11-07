# Capture and research an idea

In your agent, invoke `$opc-idea` and paste the rough note. The skill captures the
original text, researches alternatives and acquisition, and saves a bounded
assessment. Say “capture only” when you want to postpone research.

Open `opc console` and choose **Ideas**. Open an idea to read its assessment or
select two or three ideas to compare. **Copy research request** copies a prompt
for your agent; paste it there to update the research. It does not start work
inside HQ. Detailed keyword research and ASO remain in Wow Keywords.

**Edit** changes the record; **Edit assessment** opens the assessment section.
If research changed the same idea while you were editing, choose **Review latest
with my edits**, inspect fields marked **Also changed elsewhere**, then save.
**Discard draft and reload** deliberately abandons your edits.

Link an already registered project when an idea is being built. Its project link
opens the operational board; the idea and its research remain in Ideas.

For terminal capture, put your note in a text file and run:

```sh
opc idea add "My product idea" --text-file /path/to/note.txt
opc idea list
opc idea export idea-1 --format md
```

Use `opc idea --help` for updates and the assessment rubric. A normal console
snapshot excludes private ideas. Include them deliberately with
`opc scan --snapshot --ideas`; the resulting snapshot is read-only.
