require('dotenv').config()
const { v4: uuidV4 } = require('uuid')
const { Server } = require('socket.io')

const PORT = process.env.PORT
const io = new Server(PORT, {
    cors: {
        origin: "*",
    },
})

const rooms = [] //rooms in server

io.on('connection', socket => {
    //create room
    socket.on('create room', () => {
        const roomID = uuidV4().slice(0, 8)
        const room = {
            roomID: roomID,
            users: [],
            state: {
                board: new Array(9).fill(""),
                turn: socket.id,
                currentPlayer: 'x',
                winner: "",
            }
        }
        rooms.push(room) // add new room to rooms array
        socket.emit('room created', roomID) // emit a message with new room ID
    })

    // join a room 
    socket.on('join room', (roomID) => {
        const room = rooms.find(room => room.roomID === roomID);
        console.log('room:',room)
        if (!room) { 
            console.log('why')
            socket.emit('invalid room') // no room found 
            return
        }

        if (room.users.length >= 2) {
            socket.emit('room full') // room should have  only two players
            return
        }
        
        socket.emit('userID', socket.id) // send user id to client 
        const idx = rooms.indexOf(room)
        const user = {
            id: socket.id,
            symbol: room.users.length === 0 ? 'x' : 'o'
        }
        rooms[idx].users.push(user) // add the new user to room users array
        io.to(roomID).emit('initial state', {
            users: rooms[idx].users,
            state: rooms[idx].state,
        })
        console.log('rooms:',rooms)
        socket.join(roomID)
    })
    // make a move 
    socket.on('move', ({ index, roomID }) => {
        const room = rooms.find(room => room.roomID === roomID)
        if (room) {
            room.state.board[index] = room.state.currentPlayer
            io.to(roomID).emit('update', room.state)
        }
    })
    // swap player
    socket.on('change player', (roomID) => {
        const room = rooms.find(room => room.roomID === roomID)
        if (!room) {
            socket.emit('invalid room')
            return
        }
        const { users, state } = room
        const currentPlayerIndex = users.findIndex(user => user.id === socket.id)
        if (currentPlayerIndex < 0) {
            socket.emit('not a player')
            return
        }

        state.currentPlayer = state.currentPlayer === 'x' ? 'o' : 'x'
        state.turn = users[(currentPlayerIndex + 1) % users.length].id
        console.log('state:',state)
        
        io.to(roomID).emit('update', state)
    })

    // leave room when triggered
    socket.on('leave room', (roomID) => {
        const roomIndex = rooms.findIndex(room => room.roomID === roomID)
        if (roomIndex === -1) {
            return;
        }
        const room = rooms[roomIndex]
        const userIndex = room.users.findIndex(user => user.id === socket.id)

        if (userIndex === -1) {
            return;
        }
        room.users.splice(userIndex, 1)

        if (room.users.length === 0) {
            rooms.splice(roomIndex, 1)
        } else if (userIndex === 0) {
            room.state.turn = room.users[0].id;
        }
        console.log(rooms)
        socket.leave(roomID)
        io.to(roomID).emit('update', room.state)

    })
})
