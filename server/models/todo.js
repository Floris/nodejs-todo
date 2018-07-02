var mongoose = require('mongoose');


var Todo = mongoose.model('Todo', {
    text:{
        type: String,           
        required: true,
        minLenght: 3,
        trim: true
    },
    completed:{
        type: Boolean,
        default: false
    },
    completedAt:{
        type: Number,
        default: null
    },
    _creator: {
        type: mongoose.Schema.Types.ObjectId,
        required:true
    }
});

// var newTodo = new Todo({
//     text: 'Zo meteeen eten maken :)'
// });

// newTodo.save().then((doc) => {
//     console.log('Saved todo', doc)
// }, (e) => {
//     console.log('Unable to save', e)
// });

module.exports = {Todo};