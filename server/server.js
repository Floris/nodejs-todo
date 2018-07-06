require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');


var {mongoose} = require('./db/mongoose');
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');


var app = express();
const port = process.env.PORT || 8000;


app.use(bodyParser.json());

// CORSS
app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");    
    res.setHeader("Access-Control-Allow-Headers", "x-auth, Content-Type");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-auth");
    // res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // res.setHeader('Access-Control-Request-Headers', 'x-auth, Content-Type');
    // res.setHeader('Access-Control-Request-Method', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    next();
  });

server = app.listen(port, () =>{
    console.log(`Server started on ${port}`);
});          

var io = require('socket.io').listen(server);

//NIEUW voor socket.io
io.on('connection', function (socket) {

    console.log('Connected');

    Todo.find({}).then((todos) =>{
        socket.emit('todos', {todos: {todos}});
    }, (e) =>{
        socket.emit('todos', e);
    });

    socket.on('getNewTodo', (bool) => {
            Todo.find({}).then((todos) =>{
                socket.emit('todos', {todos: {todos}});
                socket.broadcast.emit('todos', {todos: {todos}});
                console.log(`Refresh todos`);
            }, (e) =>{
                socket.emit('todos', e);
            });
        
    });

    socket.on("disconnect", () => console.log("Client disconnected"));

  });




app.post('/todos', authenticate, (req, res) => {
    var todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });


    todo.save().then((doc)=>{
        
        console.log(`Create new todo: ${req.body.text}`);
        res.send(doc);

    }, (e) => {
        res.status(400).send(e);
    });
});


app.get('/todos', (req, res) =>{
    Todo.find({}).then((todos) =>{
        res.send({todos});
    }, (e) =>{
        res.status(400).send(e);
    });
});


app.get('/todos/:id', authenticate, (req, res) => {
    var id = req.params.id;


    if(!ObjectID.isValid(id)) {
        return res.status(404).send({});
    }
    
        Todo.findByOne({
            _id: id,
            _creator: req.user._id
        }).then((todo) => {
            if(!todo){
                return res.status(404).send();
            }

            res.send({todo});
        }).catch((e) => {
        
        
            res.status(400).send();
        });     
});

// DELETE TODO
app.delete('/todos/:id',authenticate, (req, res) => {
    var id = req.params.id;

    if(!ObjectID.isValid(id)){
        return res.status(404).send();
    }

    Todo.findOneAndRemove({
        _id:id,
        _creator: req.user._id
    }).then((todo) => {
        if(!todo){
            return res.status(404).send();
        }

        return res.status(200).send();
    }).catch((e) => {
        res.status(400).send();
    });

});


app.patch('/todos/:id', authenticate, (req, res) => {
    var id = req.params.id;

    // The _.pick() function makes sure the user can only update "text" && "completed".
    var body = _.pick(req.body, ['text', 'completed']);

    if(!ObjectID.isValid(id)){
        return res.status(404).send();
    }

    if(_.isBoolean(body.completed) && body.completed){
        body.completedAt = new Date().getTime();
    }else{
        body.completed = false;
        body.completed = null;
    }

    Todo.findOneAndUpdate({_id:id,_creator: req.user._id}, {$set: body}, {new: true}).then((todo) => {
        if(!todo){
            res.status(404).send();
        }
        res.send({todo});
    }).catch((e) => {
        res.status(400).send();
    });

});

app.post('/users', (req, res) => {
    // var body = _.pick(req.body, ['email', 'password']);
    var body = _.pick(req.body, ['username', 'password']);
    var user = new User(body);
    
    user.save().then(()=>{
        return user.generateAuthToken();
    }).then((token) => {
        res.header('x-auth', token).send(user);
    }).catch((e) => {
        res.status(400).send(e);
    });
});


app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});


//LOGIN
app.post('/login', (req, res) => {
    // var body = _.pick(req.body, ['email', 'password']);
    var body = _.pick(req.body, ['username', 'password']);


    // User.findByCredentials(body.email, body.password).then((user) => {
    User.findByCredentials(body.username, body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
           res.header('x-auth', token).send({user:{user}, 'x-auth': token});
        });
    }).catch((e) => {
        res.status(400).send();
    });
});


//LOGOUT
app.delete('/users/me/token', authenticate, (req, res) => {
    req.user.removeToken(req.token).then(() => {
        res.status(200).send();
    }, () => {
        res.status(400).send();
    });
});

module.exports = {app};