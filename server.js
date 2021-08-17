require('dotenv').config({ path: '.env' });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const server = require('http').Server(app);
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN
const MONGOOSE_URL = process.env.MONGOOSE_URL
const { PeerServer } = require('peer');
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const io = require('socket.io')(server, {
    cors: {
        origin: FRONTEND_ORIGIN,
    }
});

const peerServer = PeerServer({ port: 9000, path: '/' }, (exp) => {
    console.log("Peerjs Server Running: " + exp.address().port);
});

peerServer.on('connection', (client) => { console.log("Client Connected: ", client.id); });

const mongoose = require('mongoose');
const Doc = require('./models/Doc');


mongoose.connect(MONGOOSE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
})
    .then(() => console.log('connected to mongodb'))
    .catch((error) => console.error(error));

io.on('connection', (socket) => {
    console.log(`Connected to frontend!`);
    socket.on('get-document', async (DocId) => {

        console.log(`DocId: ${DocId}`);
        const doc = await findOrCreateDocument(DocId);

        socket.join(DocId);


        socket.emit('load-document', doc);


        socket.on('changes', delta => {
            console.log(`changes: ${delta}`);
            socket.broadcast.to(DocId).emit("receive-changes", delta);
        });

        socket.on('drawing', (data) => {
            console.log(data);
            socket.broadcast.emit('drawing', data)
        });

        socket.on('save-document', async (data) => {
            console.log("save-documents", data);
            Doc.findByIdAndUpdate({ '_id': DocId }, { 'html': data.html, 'css': data.css, 'js': data.js, 'python': data.python, 'cpp': data.cpp, 'java': data.java }).then((d) => {
                // console.log(d);
            })
                .catch(err => {
                    console.error(err);
                })
        })
    });


    socket.on('join-room', (roomId, userId, userName) => {
        console.log("User Joined:", roomId, userId);
        socket.join(roomId)
        socket.to(roomId).emit('user-connected', userId)

        socket.on('toggled', (userId, video, audio) => {
            console.log(userId, video, audio);
            socket.to(roomId).emit('received-toggled-events', userId, video, audio);
        });

        socket.on('disconnect', () => {
            console.log("disconnected:", roomId, userId);
            socket.to(roomId).emit('user-disconnected', userId)
        });
    });
});



var findOrCreateDocument = async (id) => {
    if (id === null) {
        return;
    }
    const document = await Doc.findById(id);
    if (document) return document;
    return await Doc.create({ _id: id, html: "", css: "", js: "", python: "", java: "", cpp: "" });
};

server.listen(PORT, () => {
    console.log(`Express Server Listening to ${PORT}`);
    console.log(`Socket Listening to ${FRONTEND_ORIGIN}`);
})