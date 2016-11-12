var express = require('express');
var path = require('path');
var IO = require('socket.io');
var router = express.Router();

var app = express();
var server = require('http').Server(app);
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 创建socket服务
var io = IO(server);

var room = {};
// 房间用户名单

var defRoom = {
	femaleCount: 0,
	maleCount: 0,
	female: {},
	male: {},
	list: []
}; //默认空值，用户清空赋值

io.on('connection', function (socket) {
	var roomID = "hf";
	if (!room[roomID]) {
		room[roomID] = JSON.parse(JSON.stringify(defRoom));
	}
	var tmp = room[roomID];
	var user = {};

	socket.on('join', function (users) {
		var sex = users.sex, id = users.id;
		if (!sex) {
			return;
		}
		if (sex && !id) {
			tmp[sex + 'Count'] += 1;

			var img = Math.floor(Math.random() * 10) + 1 + (sex == 'male' ? 0 : 10);
			id = "000" + Math.floor(Math.random() * 1000);
			id = id.slice(-5); id = id.replace('0', 'a');
			user = {
				sex: sex,
				id: id,
				img: img + '.jpg'
			};
			tmp.list.push(user);
			tmp[sex][id] = Object.assign({}, user);

			//给自己发消息
			socket.emit('self', 'self', user);
			// 广播向其他用户发消息
			socket.broadcast.emit('sys', 'in', user);
			console.log(user.id + '加入了' + roomID);
		}
		//数据在客户端有,但是在服务端没有的情况
		if (!tmp[sex][id]) {
			tmp[sex + 'Count'] += 1;
			tmp.list.push(users);
			tmp[sex][id] = Object.assign({}, users);
			console.log(users.id + '回来了' + roomID);
		}

		socket.join(roomID);    // 加入房间

		// 通知房间内人员
		// io.to(roomID).emit('sys', 'in', user);
	});

	//管理员各种操作，切换场景等
	socket.on('option', function (data) {
		if (data.option == 'clean') {
			room[roomID] = JSON.parse(JSON.stringify(defRoom));
		}
		// 广播向其他用户发消息
		socket.broadcast.emit('option', data);
	});

	//客户端获取所有数据
	socket.on('getAll', function () {
		console.log(tmp.list);
		// 广播向其他用户发消息
		socket.emit('getAll', tmp.list);
	});

	socket.on('leave', function () {
		socket.emit('disconnect');
	});

	socket.on('disconnect', function () {
		// 从房间名单中移除
		if (user && tmp[user.sex] && tmp[user.sex][user.id]) {
			delete tmp[user.sex][user.id];
			tmp[user.sex + 'Count'] -= 1;
			io.to(roomID).emit('sys', 'out', user);
			console.log(user.id + '退出了' + roomID);
		}

		socket.leave(roomID);    // 退出房间

	});

	// 接收用户消息,发送相应的房间
	socket.on('message', function (users, msg) {
		// 验证如果用户不在房间内则不给发送
		if (!users || !users.id || !tmp[users.sex][users.id]) {
			return false;
		}
		// 广播向其他用户发消息
		socket.broadcast.emit('msg', users, msg);
		socket.emit('msg', users, msg);
		//向房间发消息
		// io.to(roomID).emit('msg', users, msg);
	});

});

// room page
router.get('/room/:roomID', function (req, res) {
	var roomID = req.params.roomID;

	// 渲染页面数据(见views/room.hbs)
	res.render('room', {
		roomID: roomID,
		users: room[roomID]
	});
});

app.use('/', router);

server.listen(3000, function () {
	console.log('server listening on port 3000');
});
