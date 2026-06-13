# Inbox

Drop notes here. The agent will triage items into `TODO.md`, then empty this file back to its template header.
1) ![alt text](image-5.png)
![alt text](image-6.png)
the two images show how, switching from v3 to elk, the header heading and icon drop out of their parent containers. we need the engine to realize the heasiding and icon are parts of the header of the parent container; pls investigate and report how to fix this

2) editor.js is nearly 6000 lines; we had a spec to make things modular, 035 iirc. we plan to port 20+ algorhythms; for this purpose the idea was to amke thnigs modular. so why is editor.js still one monolythic file? and why is it js rather than ts? explain, propose the best architecture, and write a spec-kit spec to fix it.