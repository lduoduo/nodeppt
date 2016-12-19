/**
 * 周例会主要业务js -- created by duoduo
 * 依赖插件：
 *   - sweetalert.js
 *   - MusicVisualizer.js // MusicVisualizer_all.js(该文件是原始版本，包含各种注释)
 *   - socket.io.js
 */

var my = {
    sex: null, //性别，每个人签到必选
    info: {}, //签到后自己的信息
    list: [], //所有男女的签到列表
    femalelist: [], //签到的男列表
    malelist: [], //签到的女列表
    addedlist: [], //刚签到进来的列表
    pageName: 'home', //当前场景名称
    isQRinprogress: false, //是否正在展示二维码QR
    isReady: false, //socket是否链接好
    isAdmin: /admin/.test(window.location.search), // 是否是管理员
    isCommon: /\/myroom.html/.test(window.location.href), // 是否是公共大屏
    timer: null, //显示签到人的定时器
    isCodeInprogress: false, //是否正在抽号
    codetimer: null, //抽号定时器
    codeSit: {
        val_col: 0,
        val_row: 0,
        selected: [{
            col: 0,
            row: 0
        }]
    }, //座位号，包括共几排几列，已经选中的座位号
    tmpList: {
        female: [],
        male: []
    }, //临时抽号池, 抽到一个，立即从池里移除
    codelist: {
        female: [],
        male: []
    }, //抽中的男女号码
    cosplaylevel: 1, // cosplay当前第几轮
    couples: {
        group1: {
            score: 0,
            totalScore: 0
        },
        group2: { score: 0, totalScore: 0 }
    } //两组夫妇内容展示, 包括名字和每轮得分，以及总得分
}

var local = localStorage || window.localStorage; //本地存储，签到成功后再次刷新页面无需再次签到
var Mt = {
    alert: function (option) {
        //type, title, msg, btnMsg, cb, isLoading
        swal({
            title: option.title,
            text: option.msg,
            type: option.type,
            showConfirmButton: !!option.confirmBtnMsg,
            showCancelButton: !!option.cancelBtnMsg,
            cancelButtonText: option.cancelBtnMsg || "在犹豫一下",
            confirmButtonColor: "#DD6B55",
            confirmButtonText: option.btnMsg || "好哒",
            showLoaderOnConfirm: option.isLoading,
            timer: option.timer,
            closeOnConfirm: false,
            html: option.html
        }, option.cb);
    },
    close: function () {
        swal.close();
    }
}; //弹窗插件配置

// ---------创建连接-----------
// var socket = io(); //初始化启动socket
var socket = io.connect({path: "/pptSocket"});

var s = {
    //初始化总入口
    init: function () {
        this.initEvent();
        this.initStatus();
        this.initTimer();
        if (my.sex) {
            this.initSocket();
        }
        if (my.isAdmin) {
            this.initAdminEvent();
        }
        FastClick.attach(document.body);
        if (my.isCommon) {
            this.initCommonEvent();
            this.getUsers();
            this.initMusic();
        }
    },
    //初始化socket的各种监听事件
    initSocket: function () {
        // 加入房间
        socket.on('connect', function () {
            console.log('hear beat...');
        });
        // 监听消息
        socket.on('msg', function (user, msg) {
            s.showMsg(user, msg);
        });

        // 监听系统消息
        socket.on('sys', function (sysMsg, data) {
            if (!my.sex) { return; }
            if (sysMsg == "in") {
                my.addedlist.push(data);
                console.log(data);
            }
            console.log(my);
        });

        // 监听自己的消息
        socket.on('self', function (sysMsg, data) {
            console.log('my');
            local.setItem('myinfo', JSON.stringify(data));
            my.info = data;
            Mt.alert({
                title: '签到成功~,1s后关闭',
                timer: 1000
            });
        });

        // 监听操作
        socket.on('option', function (type, msg) {
            s.getOption(type, msg);
        });

        // 获取所有用户数据
        socket.on('getAll', function (data) {
            my.addedlist = data;
            console.log(data);
        });
    },
    //初始化签到人的状态, 如果没有签到，则会显示弹窗让选择男女进行签到
    initStatus: function () {
        if (my.isCommon || my.isAdmin) {
            my.isReady = true;
            my.sex = 'common';
            s.join();
            my.isAdmin && $('.J-admin').removeClass('none') && $('.J-open-QR').addClass('none');
            return;
        }
        var tmp = JSON.parse(local.getItem('myinfo') || null);
        if (!tmp) {
            if (my.sex == null) {
                Mt.alert({
                    title: '请选择性别~',
                    confirmBtnMsg: false,
                    isLoading: true,
                    msg: '<div class="radio-group J-sex-select"><input type="radio" class="radio" name="gender" value=male /> : 男<br /><input type="radio" class="radio" name="gender" value=female /> : 女<br /></div>',
                    html: true
                });
            }
        } else {
            my.isReady = true;
            my.sex = tmp.sex;
            $.extend(my.info, tmp);
            s.join();
        }
    },
    //大屏启动可视化BGM
    initMusic: function () {
        window.mv = new MusicVisualizer();
        mv.ini($("#canvas")[0], window);
        mv.play("media/start_ckck.mp3", false);
    },
    //大屏BGM的各种操作
    optionMusic: function (data) {
        if (!my.isCommon) { return; }
        if (data.name == "range") {
            //更改音量
            mv.changeVolumn(data.val);
            return;
        }
        if (data.name != "change") {
            mv[data.name]();
            return;
        }
        mv.play("media/" + data.val + ".mp3", false);
    },
    //发送消息
    sendMsg: function (msg) {
        socket.send(my.info, msg);
    },
    //离开房间
    leave: function () {
        socket.emit('leave');
    },
    //join 房间
    join: function () {
        socket.emit('join', my.info);
    },
    //接受各种操作命令，进行操作
    getOption: function (data) {
        console.log(data);
        //音乐操作的处理
        if (data.option == "music") {
            this.optionMusic(data);
            return;
        }
        //发送当前多少人参与游戏
        if (data.option == 'totalNum') {
            if (!my.isCommon) { return; }
            Mt.alert({
                title: '当前总共' + my.list.length + '人签到',
                confirmBtnMsg: true,
                timer: 3000,
            });
            return;
        }
        //切换抽号模式，签到抽号
        if (data.option == 'setCode') {
            if (!my.isCommon) { return; }
            $('.J-start-code').removeClass('none');
            $('.J-start-code-no').addClass('none');
            return;
        }
        //切换抽号模式，座位号
        if (data.option == 'setCodeSitNo') {
            if (!my.isCommon) { return; }
            if (data.val_row && data.val_col) {
                my.codeSit.val_row = data.val_row;
                my.codeSit.val_col = data.val_col;
                $('.J-start-code-no').removeClass('none');
                $('.J-start-code').addClass('none');
                return;
            }
        }
        //清空本地存储，刷新页面
        if (data.option == 'clean') {
            local.clear();
            window.location.reload();
            return;
        }
        //关闭弹窗
        if (data.option == 'close') {
            if (my.isAdmin || my.isCommon) {
                return;
            }
            Mt.close();
            $('.page').removeClass('active');
        }
        //场景切换
        if (data.page) {
            my.pageName = data.page;
            if (data.page != "code") {
                Mt.close();
            }
            if (data.page)
                $('.J-msg-align').toggleClass('none', data.page == 'main');
            $('.page').removeClass('active');
            $('.page[data-page=' + data.page + ']').addClass('active');
        }
        //号码抽中的处理
        if (data.option == 'code') {
            if (my.isAdmin) { return; }
            if (my.info.id == data.data.id) {
                Mt.alert({
                    title: '恭喜你抽中了!!!!!',
                    confirmBtnMsg: false,
                    msg: '<div class="alert-img"><img src="img/' + data.data.img + '"></div>',
                    html: true
                });
                var audio = $('#audio')[0];
                audio.play();
            }
        }
        //夫妇更名处理
        if (data.option == 'setGroup') {
            my.couples[data.name].name = data.val + '夫妇';
            if (data.name && data.val) {
                $('.cosplay-list .' + data.name + ' .title').text(data.val + '夫妇');
            }
        }
        //当前难度等级设置, 更换剧照
        if (data.option == 'setPic') {
            s.cosplayTimer(false);
            my.isCodeInprogress = false;
            my.cosplaylevel = data.val;
            var url = (data.val == 5) ? "gif" : "jpg";
            Mt.alert({
                title: '',
                confirmBtnMsg: false,
                msg: '<div class="cosplay-pic"><img src="img/pic' + data.val + '.' + url + '"></div>',
                html: true
            });
            if (my.isCommon) {
                mv.play("/media/cos_" + data.val + ".mp3", true);
            }
        }
        //开放打分处理
        if (data.option == 'enableScore') {
            my.isCodeInprogress = true;
            s.cosplayTimer(true);
            if (my.isCommon) {
                Mt.close();
                return;
            }
            Mt.alert({
                title: '第' + data.level + '轮~为她们加油吧~',
                confirmBtnMsg: false,
                isLoading: true,
                msg: '<div class="radio-group J-group-select"><input type="radio" class="radio" name="gender" value=group1 /> : ' + data.couples['group1'].name + '<br /><input type="radio" class="radio" name="gender" value=group2 /> : ' + data.couples['group2'].name + '<br /></div>',
                html: true
            });
        }
        //关闭打分通道
        if (data.option == 'disableScore') {
            Mt.close();
            s.cosplayTimer(false);
            my.isCodeInprogress = false;
        }
        //设置打分分数显示
        if (data.option == 'setScore') {
            if (my.isCodeInprogress) {
                my.couples[data.name].score += 1;
                my.couples[data.name].totalScore += 1;
            }
        }
    },
    //管理员的各种操作，切换场景等等
    sendOption: function (data) {
        socket.emit('option', data);
        if (my.isAdmin) {
            Mt.alert({
                title: '发送成功',
                confirmBtnMsg: false,
                timer: 500
            });
        }
    },
    //初始化各种交互事件
    initEvent: function () {
        // 发送消息
        $('.J-msg-in').keydown(function (e) {
            if (e.which === 13) {
                e.preventDefault();
                var msg = $(this).val();
                if (msg == "") { return; }
                $(this).val('');
                s.sendMsg(msg);
            }
        });

        $('body')
            //二维码显示
            .on('click', '.J-open-QR', function (e) {
                my.isQRinprogress = true;
                Mt.alert({
                    title: '',
                    confirmBtnMsg: false,
                    msg: '<div class="alert-QR"><img src="img/url.jpg"></div>',
                    confirmBtnMsg: '扫一扫，十年少~',
                    btnMsg: '扫一扫，十年少~',
                    html: true,
                    cb: function () {
                        my.isQRinprogress = false;
                        Mt.close();
                    }
                });
                // $('.J-QR').toggleClass('active');
            })
            //签到选择男女
            .on('click', '.J-sex-select .radio', function (e) {
                my.sex = $(e.target).val();
                my.isReady = true;
                my.info.sex = my.sex;
                s.initSocket();
                setTimeout(s.join, 0);
            })
            //发送聊天消息
            .on('click', '.J-send-msg', function (e) {
                var msg = $('.J-msg-in').val();
                if (msg == "") { return; }
                $('.J-msg-in').val('');
                s.sendMsg(msg);
            })
            //打分选择组别
            .on('click', '.J-group-select .radio', function (e) {
                my.couples.selected = $(e.target).val();
                s.sendOption({
                    option: 'setScore',
                    name: my.couples.selected
                });
                Mt.close();
            })
            //客户端显示号码
            .on('click', '.J-mycode', function (e) {
                Mt.alert({
                    title: '',
                    confirmBtnMsg: false,
                    msg: '<div class="alert-img"><img src="img/' + my.info.img + '"><p>号码:<br>' + my.info.id + '<br>好运哦~</p></div>',
                    html: true
                });
            })

    },
    //初始化大屏事件
    initCommonEvent: function () {
        $('body')
            //大屏幕抽号代码
            .on('click', '.J-start-code', function (e) {
                var sex = $(this).data('sex');
                if (my.isCodeInprogress) {
                    clearInterval(my.codetimer);
                    var mydom = $('.J-result .J-code-id');
                    var i = mydom.data('id'), mysex = mydom.data('sex');
                    var tmpList = my[mysex + 'list'];
                    for(var j=0;j<tmpList.length;j++){
                        if(tmpList[j].id == i){
                            i = j;
                        }
                    }
                    var tmp = my[mysex + 'list'][i];
                    s.sendOption({
                        option: 'code',
                        data: tmp
                    });
                    my.codelist[mysex].push(tmp);
                    //删除已被选中的
                    my.tmpList[tmp.sex].splice(i, 1);
                    $('.code-list .item.' + mysex + ' .sub-list').append($('.J-result').html());
                    $('.J-result').html('');
                    my.isCodeInprogress = !my.isCodeInprogress;
                } else {
                    s.codeTimer(sex);
                }
            })
            //大屏幕抽座位号代码
            .on('click', '.J-start-code-no', function (e) {
                if (my.isCodeInprogress) {
                    clearInterval(my.codetimer);
                    var mydom = $('.J-result .J-code-id'), tmp = {};
                    tmp.col = mydom.data('col');
                    tmp.rwo = mydom.data('row');
                    my.codeSit.selected.push(tmp);
                    $('.code-list .item .sub-list').append($('.J-result').html());
                    $('.J-result').html('');
                    my.isCodeInprogress = !my.isCodeInprogress;
                } else {
                    s.codeSitTimer();
                }
            });
    },
    //初始化管理员事件
    initAdminEvent: function () {
        $('.J-music-range').on('change', function () {
            var tmp = {
                option: "music",
                name: 'range',
                val: $(this).val()
            }
            s.sendOption(tmp);
        });
        $('.J-music-select').on('change', function () {
            var tmp = {
                option: "music",
                name: 'change',
                val: $(this).val()
            }
            s.sendOption(tmp);
        });
        $('body')
            .on('click', '.J-open-detail', function (e) {
                $('.J-btn').toggleClass('active');
                // Mt.close();
                // console.log($(e.target).val());
            })
            .on('click', '.J-open-taici', function (e) {
                $('.J-taici').toggleClass('active');
                // Mt.close();
                // console.log($(e.target).val());
            })
            .on('click', '.J-btn .item', function (e) {
                var page = $(this).data('page');
                var option = $(this).data('option');
                var name = $(this).data('name');
                if (!page && !option) { return; }
                var tmp = {
                    page: page,
                    option: option
                };
                //音乐的各种操作
                if (option == 'music') {
                    if (name == "change") {
                        var val = $('.J-music-select').val();
                        if (!val) {
                            return;
                        }
                        tmp.val = val;
                    }
                    tmp.name = name;
                }
                //设置组名
                if (option == 'setGroup') {
                    var val = $('.J-name-in').val();
                    if (!val) {
                        return;
                    }
                    tmp.val = val;
                    tmp.name = name;
                    my.couples[name].name = val;
                }
                //切换cos照片
                if (option == 'setPic') {
                    var val = $('.J-pic-in').val();
                    if (!val) {
                        return;
                    }
                    tmp.val = val;
                }
                //设置多少行多少列
                if (option == 'setCodeSitNo') {
                    var val_row = $('.J-row-in').val();
                    var val_col = $('.J-col-in').val();
                    if (!val_row || !val_col) {
                        return;
                    }
                    tmp.val_row = val_row;
                    tmp.val_col = val_col;
                }
                //开放打分
                if (option == 'enableScore') {
                    tmp.couples = my.couples;
                    tmp.level = my.cosplaylevel;
                }
                s.sendOption(tmp);
            });
        // .on('click', '.J-btn .J-clean', function (e) {
        //     s.sendOption('clean');
        // });
    },
    //定时显示签到的人
    initTimer: function () {
        my.timer = setInterval(function () {
            if (my.addedlist.length > 0) {
                var tmp = my.addedlist.shift();
                my.list.push(tmp);
                my[tmp.sex + 'list'].push(tmp);
                my.tmpList[tmp.sex] = JSON.parse(JSON.stringify(my[tmp.sex + 'list']));
                if (my.isAdmin) { return; }
                if (my.pageName == 'home' && !my.isQRinprogress) {
                    Mt.alert({
                        title: '',
                        confirmBtnMsg: false,
                        msg: '<div class="alert-img"><img src="img/' + tmp.img + '"><p>' + tmp.id + '号进来了</p></div>',
                        timer: 1000,
                        html: true
                    });
                }
            }
        }, 2000);
    },
    //显示聊天信息
    showMsg: function (user, msg) {
        var className = "left";
        if (user.id == my.info.id) {
            className = "right";
        }
        console.log('msg from :' + JSON.stringify(user));
        var message = "<li class='" + className + " item'><img src='img/" + user.img + "'><img><span class='msg'>" + msg + "</span></li>";

        $('.J-msg').append(message);
        // 滚动条保持最下方
        $('.J-msg').scrollTop($('.J-msg')[0].scrollHeight);

        //弹幕提示-------------------------------
        var colors = ['#ee2424', '#10b54b', '#de14d6', '#1476de'];
        var v = Math.floor(Math.random() * 5) + 5;
        var top = Math.floor(Math.random() * 50);
        var color = colors[Math.floor(Math.random() * 4)];
        var mydom = document.createElement('marquee');
        $(mydom).attr('scrollamount', v).css({
            'position': 'fixed',
            'top': top + '%',
            'z-index': 111,
            'color': color
        });
        $(mydom).html(message);
        // var html = "<marquee behavior=slide scrollamount=" + v + " style='position:fixed;top:"+top+"%;z-index:111;color:"+color+"'>"+message+"</marquee>";
        $('.J-msg-align').append($(mydom));
        setTimeout(function () {
            console.log($(mydom));
            $(mydom).remove();
        }, 100000);
    },
    //签到抽号定时器
    codeTimer: function (sex) {
        if (my.tmpList[sex].length == 0) { return; }
        my.tmpList[sex];
        my.tmpLength = my.tmpList[sex].length;
        my.tmpDom = $('.code-list .J-result');
        my.codetimer = setInterval(function () {
            var i = Math.floor(Math.random() * my.tmpLength);
            var tmp = my.tmpList[sex][i];
            var html = '<div class="alert-img"><img src="img/' + tmp.img + '"><p class="code-id J-code-id" data-id="' + tmp.id + '" data-sex="' + sex + '">' + tmp.id + '</p></div>';
            $(my.tmpDom).html(html);
        }, 50);
        my.isCodeInprogress = !my.isCodeInprogress;
    },
    //座位抽号定时器
    codeSitTimer: function () {
        if (!my.codeSit.val_col || !my.codeSit.val_row) { return; }
        var col = my.codeSit.val_col, row = my.codeSit.val_row;
        my.tmpDom = $('.code-list .J-result');
        my.codetimer = setInterval(function () {
            var val_col = Math.ceil(Math.random() * col);
            var val_row = Math.ceil(Math.random() * row);
            var html = '<div class="alert-img code-id J-code-id" data-row=' + val_row + ' data-col=' + val_col + '><p>' + val_row + '排<br> ' + val_col + '号</p></div>';
            $(my.tmpDom).html(html);
        }, 50);
        my.isCodeInprogress = !my.isCodeInprogress;
    },
    //刷分定时器
    cosplayTimer: function (isStarted) {
        if (!isStarted) {
            clearInterval(my.cosplaytimer);
            //分数置0
            my.couples.group1.score = 0;
            my.couples.group2.score = 0;
            return;
        }
        var tmpDom1 = $('.cosplay-list .group1');
        var tmpDom2 = $('.cosplay-list .group2');
        my.cosplaytimer = setInterval(function () {
            var score1 = my.couples.group1.score;
            var score2 = my.couples.group2.score;
            var percent1 = Math.floor((my.couples.group1.score / my.list.length) * 100);
            var percent2 = Math.floor((my.couples.group2.score / my.list.length) * 100);
            tmpDom1.find('.levels .num' + my.cosplaylevel).text(score1);
            tmpDom2.find('.levels .num' + my.cosplaylevel).text(score2);
            tmpDom1.find('.levels .status' + my.cosplaylevel).css("width", percent1 + "%");
            tmpDom2.find('.levels .status' + my.cosplaylevel).css("width", percent2 + "%");
            tmpDom1.find('.total .num').text(my.couples.group1.totalScore);
            tmpDom2.find('.total .num').text(my.couples.group2.totalScore);
        }, 50);
    },
    //不小心刷新了网页，要重新获取数据
    getUsers: function () {
        socket.emit('getAll');
    }
}

//启动!
s.init();

//测试数据代码
// function test(num) {
//     for (var i = 0; i < num; i++) {
//         my.addedlist.push(testa());
//     }
// }
// function testa() {
//     var sex = ['female', 'male'][Math.floor(Math.random() * 2)];
//     var img = Math.floor(Math.random() * 10) + 1 + (sex == 'male' ? 0 : 10);
//     var id = "000" + Math.floor(Math.random() * 1000);
//     id = id.slice(-5); id = id.replace('0', 'a');
//     return {
//         id: id,
//         sex: sex,
//         img: img + '.jpg'
//     }
// }

// window.onerror = function (errorMessage, scriptURI, lineNumber, columnNumber, errorObj) {
//     var info = "错误信息：" + errorMessage + "</br>" +
//         "出错文件：" + scriptURI + "</br> " +
//         "出错行号：" + lineNumber + "</br>" +
//         "出错列号：" + columnNumber + "</br>" +
//         "错误详情：" + errorObj + "</br></br>";
//     alert(JSON.stringify(info));
// }
