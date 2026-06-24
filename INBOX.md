# Inbox

Drop notes here. The agent will triage items into the relevant spec package or
spec pointer, then empty this file back to its template header.

changing a box to annotation or highlight leads t osize getting smaller, icon no longer fitting in the box - fix architecturally, do not patch. why do some box styles maintain a height but others dont
![alt text](image.png)


on a newly created diagram from a cold start, child boxes nested inside parent boxes do not fill the available space - leaving gaps. this differes from the iteratively authored initial example set. meaning we need to harden the rules so a new agent knows children in a parent should use autolayout fill, not fixed width.
![alt text](image-1.png)