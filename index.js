const { v4: uuidV4 } = require('uuid')
const express = require('express')
const cors = require('cors')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, {
    cors: {
        origin: "*",
    }
})

app.use(express.json())

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin","*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.get('/', (req, res) => {
    res.send({ "message": "Hello, World!!" })
})
rooms = {}

io.on('connection', socket => {

    socket.on('create room', () => {
        const roomID = uuidV4().slice(0, 8)
        rooms[roomID] = {
            users: [],
            state: {
                board: new Array(9).fill(""),
                currentPlayer: 'x',
                isWin: false,
            }
        }
        socket.emit('room created', roomID)
    })

    socket.on('join room', (roomID) => {
        if (rooms[roomID]?.users.length < 2) {
            rooms[roomID]?.users.push(socket.id)
            console.log(rooms)
        }
        else {
            socket.emit("room full")
            return
        }
        socket.join(roomID)
    })

    socket.on('move', ({ index, roomID }) => {
        rooms[roomID].state.board[index] = rooms[roomID].state.currentPlayer
        rooms[roomID].state.currentPlayer = rooms[roomID].state.currentPlayer === 'x' ? 'o' : 'x'
        io.to(roomID).emit('update', rooms[roomID].state)
    })

    socket.on('leave room', (roomID) => {
        const index = rooms[roomID]?.users.indexOf(socket.id)
        rooms[roomID]?.users.splice(index, 1)
        socket.leave(roomID)
        console.log(rooms)

    })
})


module.exports = { app, server }
