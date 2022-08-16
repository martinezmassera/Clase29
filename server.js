require('dotenv').config()
const { fork } = require('child_process')
const express = require('express')
const session = require('express-session')
const parseArgs = require('minimist');
const args = parseArgs(process.argv.slice(2));
const bcrypt = require('bcrypt');
const saltRounds = 10;
const bodyParser = require("body-parser");
const mongoose = require('mongoose');

const http = require('http');
const MongoStore = require('connect-mongo')
const { Server } = require("socket.io");

const { normalize, schema } = require('normalizr')

const app = express()
app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const PORT = args.port || 8080;
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'))

app.use(session({
    store: MongoStore.create({ mongoUrl: process.env.MongoCred }),
    secret: 'thesecret',
    cookie: { maxAge: 600000 },
    resave: true,
    saveUninitialized: true
}))


app.get('/login', (req, res) => {
    const fondo = process.env.FONDO
    const frente = process.env.FRENTE
    console.log(fondo, frente);
    if (req.session.username) {
        return res.redirect('/')

    }
    return res.render('login')
})

app.post('/login', async (req, res) => {
    try {
        const username = req.body.username
        const user = await User.findOne({ username: req.body.username });
        console.log(user);
        if (user) {
            const cmp = await bcrypt.compare(req.body.password, user.password);
            if (cmp) {
                return res.render('index', { username })
            } else {
                const estado = 'Pass Incorrecto'
                return res.render('errorlogin', { estado })
            }
        } else {
            const estado = 'Usuario no registrado'
            return res.render('errorlogin', { estado })
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server error Occured");
    }
    req.session.username = req.body.username

})

app.get('/signup', (req, res) => {
    if (req.session.username) {
        return res.redirect('/')
    }
    return res.render('signup')
})



mongoose.connect(process.env.MongoCred, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    joined: { type: Date, default: Date.now },
});

const User = mongoose.model("user", userSchema);

app.post('/signup', async (req, res) => {
    try {
        const hashedPwd = await bcrypt.hash(req.body.password, saltRounds);
        await User.create({
            username: req.body.username,
            password: hashedPwd,
        });
        return res.redirect('/login')
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server error Occured");
    }
});

app.get('/', (req, res) => {
    req.session.touch()
    const username = req.session.username
    if (!req.session.username) {
        return res.redirect('/login')
    }
    return res.render('index', { username })
})

app.get('/logout', (req, res) => {
    const username = req.session.username
    req.session.destroy()
    res.render('logout', { username })
})

app.get('/info', (req, res) => {
    if (req.session.username) {
        return res.redirect('/')
    }
    const SO = process.platform;
    const VDN = process.version;
    const MTR = process.memoryUsage().rss;
    const PDE = process.cwd();
    const PI = process.pid;
    const CDP = process.execPath;
    console.log(SO)
    console.log(VDN)
    console.log(MTR)
    console.log(PDE)
    console.log(PI)
    console.log(CDP)
    return res.render('info', { SO, VDN, MTR, PDE, PI, CDP })
})



app.get('/api/randoms', (req, res) => {
    console.log(req.session.username)
    if (req.session.username) {
        return res.redirect('/')
    }else{
        const cant = parseInt(req.query.cant) || 100000000
        const computo = fork('./random.js')
        computo.send({cant})
        computo.on('message', result => {
            return res.json(result)
        })
    }
   
})



app.use('*', (req, res) => {
    const rout = req.params[0];
    const method = req.method
    res.json({
        "error": -2,
        "descripción": 'ruta ' + rout + ' metodo ' + method + ' no implementada'
    })
});


io.on('connection', socket => {
    // INICIO PRODUCTOS
    socket.on('add', async (data) => {
        await chatDao.product.add(data)
        io.sockets.emit('show', `new data`)
    })
    // // FIN PRODUCTOS

    // INICIO CHAT
    socket.on('new-message', async (newMessage) => {
        newMessage.time = new Date().toLocaleString();
        await chatDao.chat.add(newMessage)
        const leer = await chatDao.chat.getAll();
        const persona = new schema.Entity('persona')
        const textoSchema = new schema.Entity('texto')
        const msj = new schema.Entity('mensaje', {
            author: persona,
            texto: textoSchema
        }, { idAttribute: 'id' })
        const dataNormalized = normalize(leer, [msj])
        io.sockets.emit('messages', dataNormalized);
    });
    // FIN CHAT

})
server.listen(PORT, () => {
    console.log(`Running in port ${PORT}... `)
})