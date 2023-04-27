require('dotenv').config()

const { v4: uuidV4 } = require('uuid')
const http = require('http')
const { Server } = require('socket.io')

const PORT = process.env.PORT
const server = http.createServer()

const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5000', 'https://tic-tac-toe-alpha-blue.vercel.app/', 'https://tic-tac-toe-5teh.onrender.com/']
    }
})

const rooms = [] //rooms in server

const checkState = (board, player) => {
    // check rows
    for (let i = 0; i < 9; i += 3) {
        if (board[i] === player && board[i + 1] === player && board[i + 2] === player) {
            return [true, [i, i + 1, i + 2]]
        }
    }
    // check columns
    for (let i = 0; i < 3; i++) {
        if (board[i] === player && board[i + 3] === player && board[i + 6] === player) {
            return [true, [i, i + 3, i + 6]]
        }
    }
    // check diagonals
    if (board[0] === player && board[4] === player && board[8] === player) {
        return [true, [0, 4, 8]]
    }
    if (board[2] === player && board[4] === player && board[6] === player) {
        return [true, [2, 4, 6]]
    }
    return [false, []]

}

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
                winner: {},
            }
        }
        rooms.push(room) // add new room to rooms array
        socket.emit('room created', roomID) // emit a message with new room ID
    })

    // join a room 
    socket.on('join room', (roomID) => {
        const room = rooms.find(room => room.roomID === roomID);
        if (!room) {
            socket.emit('invalid room') // no room found 
            return
        }

        if (room.users.length >= 2) {
            socket.emit('room full') // room should have  only two players
            socket.disconnect()
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
        socket.join(roomID)
    })

    // make a move 
    socket.on('move', ({ index, roomID }) => {
        const room = rooms.find(room => room.roomID === roomID)
        if (!room) return
        const { state } = room
        state.board[index] = state.currentPlayer
        const winState = checkState(state.board, state.currentPlayer)

        if (winState[0]) {
            state.winner['status'] = 'win'
            state.winner['id'] = socket.id
            state.winner['symbol'] = state.currentPlayer
            state.winner['winningSquares'] = winState[1]
        } 
        
        else if (state.board.every(square => square !== "")) {
            state.winner['status'] = 'draw'
            state.winner['id'] = 'draw'
            state.winner['symbol'] = 'draw'
            state.winner['winningSquares'] = []
        }

        io.to(roomID).emit('update', state)
        console.log(state)
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
        socket.leave(roomID)
        io.to(roomID).emit('update', room.state)

    })

    socket.on('disconnect', () => {
        const room = rooms.find(room => room.users.some(user => user.id === socket.id))
        if (!room) {
            return
        }
        const roomIndex = rooms.indexOf(room)
        const userIndex = room.users.findIndex(user => user.id === socket.id)
        room.users.splice(userIndex, 1)

        if (room.users.length === 0) {
            rooms.splice(roomIndex, 1)
        } else if (userIndex === 0) {
            room.state.turn = room.users[0].id;
        }
        io.to(room.roomID).emit('update', room.state)
    })
})

server.listen(PORT, () => {
    console.log(`server running on: ${PORT}`)
})