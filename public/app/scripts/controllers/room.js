'use strict';

/**
 * @ngdoc function
 * @name publicApp.controller:RoomCtrl
 * @description
 * # RoomCtrl
 * Controller of the publicApp
 */
angular.module('publicApp')
  .controller('RoomCtrl', function ($sce, VideoStream, $location, $routeParams, $scope, Room) {

    if (!window.RTCPeerConnection || !navigator.getUserMedia) {
      $scope.error = 'WebRTC is not supported by your browser. You can try the app with Chrome and Firefox.';
      return;
    }

    var stream, wantedRoom;

      VideoStream.get()
      .then(function (s) {
        stream = s;
        Room.init(stream);
        stream = URL.createObjectURL(stream);
        if (!$routeParams.roomId) {
          Room.createRoom()
          .then(function (roomId) {
            $location.path('/room/' + roomId);
          });
          $scope.getLoginForm();
        } else {
          Room.joinRoom($routeParams.roomId)
          $scope.getLoginForm();
        }
      }, function () {
        $scope.error = 'No audio/video permissions. Please refresh your browser and allow the audio/video capturing.';
      });
      $scope.peers = [];
      Room.on('peer.stream', function (peer) {
        console.log('Client connected, adding new stream');
        $scope.peers.push({
          id: peer.id,
          stream: URL.createObjectURL(peer.stream)
        });
      });
      Room.on('peer.disconnected', function (peer) {
        console.log('Client disconnected, removing stream');
        $scope.peers = $scope.peers.filter(function (p) {
          return p.id !== peer.id;
        });
      });

      $scope.getLocalVideo = function () {
        return $sce.trustAsResourceUrl(stream);
      };

      $scope.getLoginForm = function(){
        setTimeout("$('#myModal').modal()", 500);
      }

      $scope.textMsg = function(){
        var msg = $('#m').val();
        if (msg.indexOf('/') == 0) {
            var args = msg.substring(1).split(' ');
            if (args[0] && args[1]) {
                msg = args[0];
                var param = args[1];
                switch (msg) {
                  case 'nick':
                    Room.resetUserName(param, $routeParams.roomId);
                    Room.sendMsg($routeParams.roomId, $scope.currentUser+': nickname changed to '+param);
                    $scope.currentUser = param;
                    break;
                  case 'join':
                    $scope.joinRoom(args[1]);
                    break;
                  // case 'part':
                  //   $scope.leaveRoom(args[1]);
                  //   break;
                }
                $('#m').val('');
            }else if(args[0] && !args[1]) {
                msg = args[0];
                switch (msg) {
                  case 'list':
                    Room.listChannels($routeParams.roomId);
                    break;
                  case 'users':
                    $scope.displayRoomUsers($routeParams.roomId);
                    break;
                }
                $('#m').val('');
            }else {
                var error = 'unrecognized command: ' + msg + '.\n You can type /help';
                $('#m').val('');
                console.log(error);
            }
        }else{
          Room.sendMsg();
        }
      };

      $scope.login = function() {
        Room.setUserName($scope.currentUser, $routeParams.roomId);
        setTimeout("$('#myModal').modal('hide')", 500);
        $scope.displayRooms();
      };

      $scope.displayRooms = function() {
        Room.getRoomsUris();
      };

      $scope.isActive = function(route) {
        route = '/room/'+route;
        return route === $location.path();
      };

      $scope.redirectToRoom = function(route) {
          // setTimeout("window.location.href = route", 500);
          $location.path(route);
      }

      $scope.displayRoomUsers = function(currentRoom){
          Room.getRoomUsers(currentRoom);
      };

      $scope.joinRoom = function(wantedRoom){
        Room.addRoomToUser($scope.currentUser, $routeParams.roomId, wantedRoom);
      };

      $scope.leaveRoom = function(wantedRoom){
        Room.removeRoomToUser($scope.currentUser, $routeParams.roomId, wantedRoom);
      };
  })
  .controller('IndexCtrl', function ($sce, $location, $routeParams, $scope) {

      $scope.redirectToRoom = function(route) {
          // setTimeout("window.location.href = route", 500);

          $location.path('/room/'+route);
          location.reload();
      };
  });
