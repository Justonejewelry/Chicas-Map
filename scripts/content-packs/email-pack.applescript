-- Chica Daily Pack → Mail.app (macOS only)
-- Usage: osascript scripts/content-packs/email-pack.applescript packs/2026-08-09-Saturday/pack.md

on run argv
	if (count of argv) is 0 then
		error "Please pass the path to pack.md"
	end if
	
	set packPath to item 1 of argv
	set packFile to POSIX file packPath
	set packContent to read packFile as «class utf8»
	
	set subjectLine to "Chica Daily Pack"
	try
		set firstLine to paragraph 1 of packContent
		if firstLine starts with "# " then
			set subjectLine to text 3 thru -1 of firstLine
		end if
	end try
	
	tell application "Mail"
		activate
		set newMessage to make new outgoing message with properties {subject:subjectLine, content:packContent & return & return, visible:true}
	end tell
	
	return "Email drafted with pack content"
end run
