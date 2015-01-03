var express = require('express');
var path = require('path');
var uuid = require('node-uuid');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Game = require('./game');
var Player = require('./player');

var paths = {
    pagePath: path.normalize(__dirname + '/../static/index.html'),
    gamePagePath: path.normalize(__dirname + '/../static/game.html'),
    resourcePath: path.normalize(__dirname + '/../static/')
};

var socketEvents = {
    listen: {
        socketConnection: 'connection',
        startGame: 'startgame',
        cellFilled: 'cellfilled'
    },
    emit: {
        gameStarted: 'gamestarted',
        gameEnd: 'gameover',
        playerconnected: 'playerconnected',
        inviteopponent: 'inviteopponent',
        opponentCell: 'opponentcellfilled'
    },
};

app.use(express.static(paths.resourcePath));

app.get('/', function(req, res){
    res.sendFile(paths.pagePath);
});

app.get('/game', function(req, res) {
    res.sendFile(paths.gamePagePath);
});

http.listen(3000, function(){
    console.log('listening on 3000');
});

io.on(socketEvents.listen.socketConnection, function(socket) {

    var playerId = uuid();
    socket.socketId = playerId;
    socket.emit(socketEvents.emit.playerconnected, { playerId: playerId });

    socket.on(socketEvents.listen.startGame, function (gameSettings) {

        // either we've created a new game
        // or we are joining an existing one
        var gameId = null;
        var game = null;

        var playerOneId = null;
        var playerTwoId = null;

        var playerOne = null;
        var playerTwo = null;

        if(gameSettings.multiplayer) {
            if(!gameSettings.gameId) {
                // first player connects
                gameId = uuid();
                game = new Game(gameId);
                playerOneId = uuid();
                playerOne = new Player(playerOneId, 'x');
                game.addPlayer(playerOne);

                socket.emit(socketEvents.emit.inviteopponent, {
                    gameId: gameId
                });
            }
            else {
                // second player connects
                game = Game.getInstanceFromDictionary(gameSettings.gameId);
                playerTwoId = uuid();
                playerTwo = new Player(playerTwoId, 'o');
                game.addPlayer(playerTwo);

                socket.join(gameSettings.gameId);
            }
        }
        else {
            gameId = uuid();
            game = new Game(gameId);
            playerOne = new Player(gameSettings.playerId, 'x');
            playerTwoId = uuid();
            playerTwo = new Player(playerTwoId, 'o', true); // use a AI to be a player

            game.addPlayer(playerOne);
            game.addPlayer(playerTwo);

            socket.join(gameId);
        }

        if(game.isReadyToStart()) {
            // broadcast to opponents game has started
            // and who is playerOne and playerTwo
            io.sockets.in(game.getId()).emit(socketEvents.emit.gameStarted, {
                gameId: game.getId(),
                playerOne: game.getPlayerOneId(),
                playerTwo: game.getPlayerTwoId()
            });
        }
    })

    // socket.on('disconnect', function() {
    //     console.log('user disconnected');
    // });

    socket.on(socketEvents.listen.cellFilled, function(cellInfo) {
        console.log('['+ cellInfo.cellRow + ',' + cellInfo.cellCol + ']');
        // AI logic
        io.sockets.emit(socketEvents.emit.opponentCell, {

        });
    });
});
