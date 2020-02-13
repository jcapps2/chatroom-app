// Client
const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options - parsing data submitted by the <form> on the join page
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })


const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)                  // getting all styles on element
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)        // grabbing marginBottom value off element
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin    // adding to get total height of element

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}


// Renders message
socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// Renders location upon button click
socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// User data for sidebar
socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})

// Sending message from client to server upon button click
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()      // preventing full page refresh

    // disable 'Send' button
    $messageFormButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value       // targeting <input> in <form>

    socket.emit('sendMessage', message, (error) => {
        // enable button after message is sent
        $messageFormButton.removeAttribute('disabled')

        // clear out text and align cursor
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        // If no error, return 'Delivered'
        console.log('Delivered')
    })
})

// Sending client location to server upon button click
$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser.')
    }

    // disable 'Send location' button while location is being sent
    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        //console.log(position)
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            // enable 'Send location' button after location has been sent
            $sendLocationButton.removeAttribute('disabled')
            console.log('Location shared')
        })
    })
})

// Passes the username you want to use, and the room you're trying to join to the server
socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)

        // reroute to homepage
        location.href = '/'
    }
})