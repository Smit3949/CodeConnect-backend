const { Schema, model } = require('mongoose');


const Doc = new Schema({
    _id: String,
    html: String,
    css: String,
    js: String,
    python: String,
    cpp: String,
    java: String
});

module.exports = model('Doc', Doc);