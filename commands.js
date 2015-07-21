define(["require", "exports", './commands', './../controllers/socket/socket-events'], function (require, exports, commands_1, socket_events_1) {
    var Command = (function () {
        function Command(io, client) {
            var _this = this;
            this.rooms = [];
            this.commands = [];
            this.io = io;
            this.client = client;
            this.registerCommand('nick', 'Change nickname. /nick _nickname_', function (currentRoom, user, args) {
                if (args[0] && user.channelname !== '') {
                    user.username = args[0];
                    currentRoom.users[user.id].username = args[0];
                    io.in(currentRoom.name).emit('renameUser', user.toJson());
                }
                return '';
            });
            this.registerCommand('list', 'Lists the available channels on the server. Displays only the channels containing the "string" if this is specified. /list [string]', function (currentRoom, user, args) {
                var result = [];
                for (var room in _this.rooms) {
                    if (args[0] === undefined || (args[0] && room.indexOf(args[0]) > -1)) {
                        result.push('• ' + room);
                    }
                }
                client.emit('warn', 'List of channels:\n' + result.join('\n'));
                return '';
            });
            this.registerCommand('join', 'Join channel. /join _channel_', function (currentRoom, user, args) {
                console.log(user.channelname);
                if (args[0] && user.channelname == '') {
                    user.channelname = args.join(' ');
                    socket_events_1.SocketEvents.login(_this.rooms, user, client);
                }
                return '';
            });
            this.registerCommand('part', 'Leave channel. /part _channel_', function (currentRoom, user, args) {
                if (!user) {
                    return '';
                }
                var message = 'Your are leave the channel ' + user.channelname + '.\nYou must use command /join';
                client.emit('leaveChannel', message);
                socket_events_1.SocketEvents.leaveChan(_this.rooms, currentRoom.name, user, client, io);
                console.log('Client: ' + user.username + ' leave channel : ', currentRoom.name);
                return '';
            });
            this.registerCommand('users', 'List users connected to the channel. /users', function (currentRoom, user, args) {
                if (user.channelname !== '') {
                    var result = [];
                    for (var usersId in currentRoom.users) {
                        var username = currentRoom.users[usersId].username;
                        if (args[0] === undefined || (args[0] && username.indexOf(args[0]) > -1)) {
                            result.push('• ' + username);
                        }
                    }
                    client.emit('warn', 'List of Users:\n' + result.join('\n'));
                }
                return '';
            });
            this.registerCommand('msg', 'Sends a message to a specific user. /msg _nickname_ _message_', function (currentRoom, user, args) {
                if (args[0] && args[1] && user.channelname !== '') {
                    for (var usersId in currentRoom.users) {
                        if (currentRoom.users[usersId].username == args[0]) {
                            args.shift();
                            client.broadcast.to(usersId).emit('recevMessage', user, args.join(' '));
                        }
                    }
                }
                return '';
            });
            this.registerCommand('help', 'List all commands. /help', function (currentRoom, user, args) {
                var result = [];
                for (var name in _this.commands) {
                    result.push('• ' + name + ': ' + _this.commands[name].description);
                }
                client.emit('warn', 'List of commands:\n' + result.join('\n'));
                return '';
            });
        }
        Command.prototype.registerCommand = function (name, description, callback) {
            this.commands[name] = new commands_1.Commands(description, callback);
        };
        Command.prototype.parseChat = function (currentRoom, user, message) {
            if (message.indexOf('/') == 0) {
                var args = message.substring(1).split(' ');
                if (this.commands[args[0]]) {
                    message = this.commands[args[0]].callback(currentRoom, user, args.slice(1));
                }
                else {
                    var error = 'unrecognized command: ' + message + '.\n You can type /help';
                    this.client.emit('warn', error);
                    message = '';
                    console.log(error);
                }
            }
            return message;
        };
        return Command;
    })();
    exports.Command = Command;
});
