// var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// var myCanvas = document.getElementById('canvas'),
//     canvasCtx = myCanvas.getContext("2d"),
//     myAudio = document.getElementById("audio"),
//     source = null,
//     analyser = null; //创建分析节点
// myCanvas.width = window.screen.availWidth;
// myCanvas.height = window.screen.height;

// var status = 0,   //状态，播放中：1，停止：0
//     arraySize = 128;   //可以得到128组频率值

// function audioInit() {
//     source = audioCtx.createMediaElementSource(myAudio),
//         analyser = audioCtx.createAnalyser(); //创建分析节点

//     // source.start(0);　　//启动音源
//     // status = 1;  //更改音频状态

//     source.connect(analyser);
//     analyser.connect(audioCtx.destination);

//     draw();
//     // myAudio.oncanplaythrough = function draw() {
//     //     var cwidth = myCanvas.width,
//     //         cheight = myCanvas.height,
//     //         array = new Uint8Array(128);
//     //     analyser.getByteFrequencyData(array);
//     //     canvasCtx.clearRect(0, 0, cwidth, cheight);
//     //     for (var i = 0; i < array.length; i++) {
//     //         canvasCtx.fillRect(i * 3, cheight - array[i], 2, cheight);
//     //     }
//     //     requestAnimationFrame(draw);
//     // };
// };

// function draw() {
//     var WIDTH = myCanvas.width;
//     var HEIGHT = myCanvas.height;
//     var array = new Uint8Array(128);
//     //复制当前的频率值到一个无符号数组中
//     analyser.getByteFrequencyData(array);
//     canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

//     console.log(array);
//     //循环生成长条矩形
//     for (var i = 0; i < (array.length); i++) {
//         var value = array[i];

//         //fillRect(矩形左上角x坐标，矩形左上角y坐标，矩形宽，矩形高)
//         //这里我们的array一共有128组数据，所以我们当时canvas设置的宽度为5*128=640
//         canvasCtx.fillRect(i * 5, HEIGHT - value, 3, HEIGHT);
//     }
//     //根据浏览器频率绘图或者操作一些非css效果
//     requestAnimationFrame(draw);
// }

// function update(){

// }
// audioInit();

