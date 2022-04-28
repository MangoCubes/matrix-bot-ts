# MATRIX BOT PROJECT
## PURPOSE
This is a chatbot project that connects to any Matrix server, and is supposed to run on Android Termux.
This is why the code is written in a way that it doesn't exit on errors, and sends message to the user instead (unless the error is caused directly by sending message, which would create infinite loop).
## HOW TO USE
1. Clone this repository
2. Install all necessary libraries
3. `npm start`
## COMMANDS
### !alias
This command provides a way to run another command with shorter message, or even without any.
!curl commands tends to become very long, and this can make things a lot easier.
### !curl
This command executes a simple GET/POST/PUT request from the node server.
This synergises with some Tasker plugins out there that opens a web server on the device, and triggers a task when a request is made.
As a result, you can remotely trigger a Tasker task, and additionally provide data using POST request if necessary.
### !echo
This command simply echos all arguments and options.
### !invite
This command invites you into the bot's private community.
### !purge
This command deletes a room in control of the bot.