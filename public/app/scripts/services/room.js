/**
 * @ngdoc service
 * @name publicApp.Room
 * @description
 * # Room
 * Factory in the publicApp.
 */
angular.module('publicApp')
  .factory('Room', function ($rootScope, $q, Io, config) {

    var iceConfig = { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]},
        peerConnections = {},
        currentId, roomId,
        stream;
    var indexRoom = 0;

    function getPeerConnection(id) {
      if (peerConnections[id]) {
        return peerConnections[id];
      }
      var pc = new RTCPeerConnection(iceConfig);
      peerConnections[id] = pc;
      pc.addStream(stream);
      pc.onicecandidate = function (evnt) {
        socket.emit('msg', { by: currentId, to: id, ice: evnt.candidate, type: 'ice' });
      };
      pc.onaddstream = function (evnt) {
        console.log('Received new stream');
        api.trigger('peer.stream', [{
          id: id,
          stream: evnt.stream
        }]);
        if (!$rootScope.$$digest) {
          $rootScope.$apply();
        }
      };
      return pc;
    }

    function makeOffer(id) {
      var pc = getPeerConnection(id);
      pc.createOffer(function (sdp) {
        pc.setLocalDescription(sdp);
        console.log('Creating an offer for', id);
        socket.emit('msg', { by: currentId, to: id, sdp: sdp, type: 'sdp-offer' });
      }, function (e) {
        console.log(e);
      },
      { mandatory: { OfferToReceiveVideo: true, OfferToReceiveAudio: true }});
    }

    function handleMessage(data) {
      var pc = getPeerConnection(data.by);
      switch (data.type) {
        case 'sdp-offer':
          pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
            console.log('Setting remote description by offer');
            pc.createAnswer(function (sdp) {
              pc.setLocalDescription(sdp);
              socket.emit('msg', { by: currentId, to: data.by, sdp: sdp, type: 'sdp-answer' });
            });
          });
          break;
        case 'sdp-answer':
          pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
            console.log('Setting remote description by answer');
          }, function (e) {
            console.error(e);
          });
          break;
        case 'ice':
          if (data.ice) {
            console.log('Adding ice candidates');
            pc.addIceCandidate(new RTCIceCandidate(data.ice));
          }
          break;
      }
    }

    var socket = Io.connect(config.SIGNALIG_SERVER_URL),
        connected = false;

    function addHandlers(socket) {
      socket.on('peer.connected', function (params) {
        makeOffer(params.id);
      });
      socket.on('peer.disconnected', function (data) {
        api.trigger('peer.disconnected', [data]);
        if (!$rootScope.$$digest) {
          $rootScope.$apply();
        }
      });
      socket.on('msg', function (data) {
        handleMessage(data);
      });

      socket.on('chat message', function(data){
        if(data.username){
          var li = '<li class="left clearfix"><div class="chat-body clearfix"><p><b>'+data.username+'</b>&nbsp;&nbsp;&nbsp;'+data.msg+'</p></div></li>';
        }
        $('.chat').append(li);
      });

      socket.on('chat info', function(data){
          angular.forEach(data.msg, function(r){
            var li = '<li class="left clearfix"><div class="chat-body clearfix"><p>&nbsp;&nbsp;&nbsp;'+r+'</p></div></li>';
            $('.chat').append(li);
          });
      });

      socket.on('listChannels', function(data){
          api.sendInfo(roomId, data);
      });

      socket.on('getRoomsUris', function(data){
        angular.forEach(data, function(r){
          var count = $rootScope.tabs.filter(function(tab){
            return (tab.token === r.token)
          });
          if(count.length === 0) {
            $rootScope.tabs.push(r)
          }
        });
        $rootScope.$apply();
      });

      socket.on('joinRoom', function(data){
        angular.forEach(data, function(r){
          var wantedRoom = r.token;
          socket.emit('init', { room: wantedRoom }, function (wantedRoom, id) {
            currentId = id;
            roomId = wantedRoom;
          });
          connected = true;
          var count = $rootScope.tabs.filter(function(tab){
            return (tab.token === wantedRoom)
          });
          if(count.length === 0) {
            $rootScope.tabs.push(r);
            api.joinRoom(wantedRoom);
          }
        });
        // $('#path').val(wantedRoom);
        $rootScope.$apply(data);
      });

      socket.on('leaveRoom', function(data){
        angular.forEach(data, function(r){
            $rootScope.tabs.slice(r);
        });
        $rootScope.$apply(data);
      });

      socket.on('getUsers', function(data){
          api.sendInfo(roomId, data);
      });

    }

    var api = {
      joinRoom: function (r) {
        if (!connected) {
          socket.emit('init', { room: r }, function (roomid, id) {
            currentId = id;
            roomId = roomid;
            // name = "Room"+indexRoom;
          });
          connected = true;
        }
      },
      createRoom: function () {
        var d = $q.defer();
        socket.emit('init', null, function (roomid, id) {
          d.resolve(roomid);
          roomId = roomid;
          currentId = id;
          // name = "Room"+indexRoom;
          connected = true;
        });
        return d.promise;
      },
      init: function (s) {
        stream = s;
      },
      sendMsg: function(room, msg) {
        if(!msg){
          var msg = $('#m').val();
        }
        socket.emit('chat message', { room: room, from: currentId, msg: msg});
        $('#m').val('');
        return false;
      },
      sendInfo: function(room, msg) {
        console.log(msg);
        socket.emit('chat info', { room: room, msg: msg});
        return false;
      },
      resetUserName: function (currentUser, room, id){
        socket.emit('currentUser', { currentRoom: room, user: currentUser, id: currentId });
      },
      setUserName: function (currentUser, room, id){
        socket.emit('currentUser', { currentRoom: room, user: currentUser, id: currentId });
      },
      listChannels: function(room){
         socket.emit('listChannels', { currentRoom : room, id: currentId});
      },
      getRoomsUris: function(room){
         socket.emit('getRoomsUris', { currentRoom : room, id: currentId});
      },
      addRoomToUser: function(currentUser, room, wantedRoom){
         socket.emit('joinRoom', { currentRoom : room, id: currentId, user: currentUser, addRoom: wantedRoom});
      },
      removeRoomToUser: function(currentUser, room, wantedRoom){
         socket.emit('leaveRoom', { currentRoom : room, id: currentId, user: currentUser, addRoom: wantedRoom});
      },
      getRoomUsers: function(room){
         socket.emit('getUsers', { currentRoom : room, id: currentId });
      }
    };

    EventEmitter.call(api);
    Object.setPrototypeOf(api, EventEmitter.prototype);
    addHandlers(socket);

    return api;

  });
