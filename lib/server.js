var express = require('express'),
    expressApp = express(),
    socketio = require('socket.io'),
    http = require('http'),
    server = http.createServer(expressApp),
    uuid = require('node-uuid'),
    rooms = {},
    userIds = {};

expressApp.use(express.static(__dirname + '/../public/app/'));

exports.run = function (config) {

  server.listen(config.PORT);
  console.log('Listening on', config.PORT);
  var indexRoom = 0;
  socketio.listen(server, { log: false })
  .on('connection', function (socket) {

    var currentRoom, id;
    socket.on('init', function (data, fn) {
      currentRoom = (data || {}).room || uuid.v4();
      var room = rooms[currentRoom];
      if (!data) {
        indexRoom++;
        rooms[currentRoom] = [socket];
        id = userIds[currentRoom] = 0;
        rooms[currentRoom].name = 'room'+indexRoom;
        fn(currentRoom, id);
        console.log(rooms[currentRoom].name + ' created, with #', currentRoom);
      } else {
        if(!room){
          return;
        }
        userIds[currentRoom] += 1;
        id = userIds[currentRoom];
        fn(currentRoom, id);
        room.forEach(function (s) {
          s.emit('peer.connected', { id: id });
        });
        room[id] = socket;
        console.log('Peer connected to room', currentRoom, 'with #', id);
      }
    });

    socket.on('msg', function (data) {
      var to = parseInt(data.to, 10);
      if (rooms[currentRoom] && rooms[currentRoom][to]) {
        rooms[currentRoom][to].emit('msg', data);
      } else {
        console.warn('Invalid user');
      }
    });

    socket.on('currentUser', function (data) {
      var userId = parseInt(data.id, 10);
      if (rooms[currentRoom] && rooms[currentRoom][userId]) {
          rooms[currentRoom][userId].username = data.user;
          rooms[currentRoom].forEach(function (s) {
            s.emit('new user', { id: userId, username: data.user });
          });
      }else{
        console.log('invalid user', userId);
      }
    });

    socket.on('listChannels', function (data) {
      var userId = parseInt(data.id, 10);
      var listRooms = [];
      if (rooms[currentRoom] && rooms[currentRoom][userId]) {
          for (var key in rooms) {
            listRooms.push(rooms[key].name);
            console.log(key);
          }
          rooms[currentRoom][userId].emit('listChannels', listRooms);
      }else{
        console.log('invalid user', userId);
      }
    });

    socket.on('getRoomsUris', function (data) {
      var userId = parseInt(data.id, 10);
          for (var key in rooms) {
            var roomsRouting = [];
            var roomObject = {
              token: key,
              name: rooms[key].name
            };
            roomsRouting.push(roomObject);
            rooms[currentRoom][userId].emit('getRoomsUris', roomsRouting);
          }
    });

    socket.on('chat message', function(data){
      var userId = parseInt(data.from, 10);
      if (rooms[currentRoom]) {
        data.username = rooms[currentRoom][userId].username;
        rooms[currentRoom].forEach(function (s) {
          s.emit('chat message', data);
        });
      } else {
        console.warn('Invalid user');
      }
    });

    socket.on('chat info', function(data){
      if (rooms[currentRoom]) {
        rooms[currentRoom].forEach(function (s) {
          s.emit('chat info', data);
        });
      } else {
        console.warn('Invalid room');
      }
    });

    socket.on('disconnect', function () {
      if (!currentRoom || !rooms[currentRoom]) {
        return;
      }
      delete rooms[currentRoom][rooms[currentRoom].indexOf(socket)];
      rooms[currentRoom].forEach(function (socket) {
        if (socket) {
          socket.emit('peer.disconnected', { id: id });
        }
      });
    });
  });
};
