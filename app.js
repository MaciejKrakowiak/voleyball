var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var matchesRouter = require('./routes/matches');
var detailsRouter = require('./routes/details');

const sequelize = require('./config');
const http = require('http');
const socketIo = require('socket.io');
const Match = require('./models/match');
const internal = require('stream');
const { match } = require('assert');

var app = express();
const server = http.createServer(app);
const io = socketIo(server);

//Globals 
global.io = io;
global.activeMatches = {};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//Routers
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/matches',matchesRouter);
app.use('/details',detailsRouter);


//Websocket logic
io.on('connection', (socket) => {
  console.log('Nowe połączenie websocket');
  
  //Joining room logic
  socket.on('join-match-room', (matchId) => {
    console.log(`Dołączono do pokoju meczu: ${matchId}`);
    socket.join(`match-${matchId}`);


    //Checking if match is in progress and if so launching timers for it if they dont excists
    if (!global.activeMatches[matchId]) {
      Match.findByPk(matchId).then(match => {
        if (match && match.status === 'IN_PROGRESS') {
          global.activeMatches[matchId] = {
            startTime: new Date(match.date).getTime(),
            interval: setInterval(() => {
              const currentTime = new Date();
              const matchStartTime = global.activeMatches[matchId].startTime;

              if (matchStartTime) {
                const elapsedGameTime = currentTime.getTime() - matchStartTime;
                io.to(`match-${matchId}`).emit('time-update', {
                  currentTime,
                  elapsedGameTime
                });
              }
            }, 1000)
          };
        }
      });
    }
    //checking if sides should be swapped
    if (global.activeMatches[matchId] && typeof global.activeMatches[matchId].flag !== 'undefined') {
      socket.emit('change-position', global.activeMatches[matchId].flag);
    } else {
      socket.emit('change-position', false);
    }
  });

  //Disconnect logic
  socket.on('disconnect', () => {
    console.log('Rozłączono websocket');
  });
});

//Connecting to db and starting server
sequelize.sync().then(()=>{
  server.listen(3001, () => {
    console.log('Serwer działa na porcie 3001');
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;