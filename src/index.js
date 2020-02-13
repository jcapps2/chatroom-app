// Server
/**
 * This app works by taking input from the client,
 * sending it to the server, and then the server
 * sends it to each user.
 * 
 * Explore documentation at https://socket.io/ if confused
 * 
 */
const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)       // Express does this behind the scenes - behavior 
                                            // is same as line above, just needed to refactor 
                                            // to work with socket.io. Express doesn't give us 
                                            // access when it does this behind the scenes, but 
                                            // using the http library, we can
const io = socketio(server)

const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))

// socket.emit() emits event to specific connection (like a user joining)
// io.emit() emits event to all connections (when someone sends a message in the chat room)

io.on('connection', (socket) => {
    console.log('new websocket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
           return callback(error)
        }

        // All of this only runs if no error
        // Allows us to join a socket.io session (the chat room)
        socket.join(user.room)

        // Default message when joining chat
        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))      // shows message to everyone but client that is joining
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        // Let's user know that they have joined successfully
        callback()
    })

    // Send message entered by client to all users
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed.')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    // Send location provided by client to all users
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    // Runs when a client disconnects
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Server is up on ${PORT}`)
})