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

    var stream;

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
        Room.sendMsg();
      };

      $scope.login = function() {
        Room.setUserName($scope.currentUser, $routeParams.roomId);
        setTimeout("$('#myModal').modal('hide')", 500);
      };

  });
