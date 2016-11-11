function getRandom(i, t, e) {
    return e ? Math.random() * (t - i) + i : Math.floor(Math.random() * (t - i)) + i
}
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

function localSave() {}
var MusicVisualizer = function(i) {
    this.source = {},
    this.musicList = {},
    this.box = null ,
    this.cxt = null ,
    this.ac = new window.AudioContext,
    this.window = null ,
    this.volumnId = null ,
    this.analyser = this.ac.createAnalyser(),
    this.gainNode = this.ac[this.ac.createGain ? "createGain" : "createGainNode"](),
    this.size = 64,
    this.analyser.fftSize = 8 * this.size,
    this.analyser.connect(this.ac.destination),
    this.gainNode.connect(this.analyser),
    this.xhr = new XMLHttpRequest
}
;

MusicVisualizer.isFunction = function(i) {
    return "[object Function]" == Object.prototype.toString.call(i)
}
,
MusicVisualizer.prototype.ini = function(i, t, e) {
    var o = this;
    this.box = i,
    this.window = t;
    var s = i;
    s.width = t.screen.availWidth,
    s.height = t.screen.availHeight,
    this.cxt = s.getContext("2d"),
    this.volumnId = e,
    this.visualizer();
}
,
MusicVisualizer.prototype.load = function(i, t, e) {
    var o = this;
    i.abort(),
    i.open("GET", t),
    i.responseType = "arraybuffer",
    i.onload = function() {
        console.log(i.response),
        MusicVisualizer.isFunction(e) && e.call(o, t, i.response)
    }
    ,
    i.send()
}
,
MusicVisualizer.prototype.decode = function(i, t) {
    var e = this;
    e.ac.decodeAudioData(t, function(t) {
        e.playBuffer(i, t)
    }, function(i) {
        console.log("err:" + i)
    })
}
,
MusicVisualizer.prototype.playBuffer = function(i, t) {
    var e = this;
    e.source.curr && e.source.bs && e.source.bs[e.source.bs.stop ? "stop" : "nodeOff"](),
    e.source.curr = i;
    var o = e.ac.createBufferSource();
    o.buffer = t,
    o.loop = !0,
    o.connect(e.gainNode),
    o[o.start ? "start" : "noteOn"](0),
    e.source.bs = o
}
,
MusicVisualizer.prototype.play = function(i, t) {
    var e = this;
    e.source.curr && e.source.curr == i || (t ? e.load(e.xhr, i, e.decode) : (e.audio = new Audio(i),
    e.audioSource = MusicVisualizer.ac.createMediaElementSource(e.audio),
    e.source.bs = e.audioSource,
    e.source.bs.connect(e.gainNode)))
}
,
MusicVisualizer.prototype.changeVolumn = function(i) {
    this.gainNode.gain.value = i * i
}
,
MusicVisualizer.prototype.visualizer = function() {
    function i() {
        t.analyser.getByteFrequencyData(e),
        t.drawCanvasDot(e),
        window.requestAnimFrame(i)
    }
    var t = this;
    this.cxt.clearRect(0, 0, this.cxt.canvas.width, this.cxt.canvas.height);
    var e = new Uint8Array(this.analyser.frequencyBinCount);
    window.requestAnimFrame(i)
}
,
MusicVisualizer.prototype.drawCanvasDot = function(i) {
    var t = this.cxt.canvas;
    if (this.cxt.clearRect(0, 0, t.width, t.height),
    !this.source.dot) {
        this.source.dot = [];
        for (var e = this.source.dot, o = 0; o < this.size / 2; o++)
            e[o] = {},
            e[o].x = getRandom(0, t.width),
            e[o].y = getRandom(0, t.height),
            e[o].color = "rgba(" + getRandom(0, 255) + "," + getRandom(0, 255) + "," + getRandom(0, 255) + ",0)",
            e[o].dr = t.height / 50,
            e[o].vx = getRandom(.5, 1.5, !0)
    }
    for (var e = this.source.dot, o = 0; o < this.size / 2; o++) {
        e[o].r = e[o].dr + i[8 * o] / 256 * (t.height > t.width ? t.width : t.height) / 10,
        e[o].x = e[o].x > t.width + e[o].r ? -e[o].r : e[o].x + e[o].vx,
        this.cxt.beginPath(),
        this.cxt.arc(e[o].x, e[o].y, e[o].r, 0, 2 * Math.PI);
        var s = this.cxt.createRadialGradient(e[o].x, e[o].y, 0, e[o].x, e[o].y, e[o].r);
        s.addColorStop(0, "#fff"),
        s.addColorStop(1, e[o].color),
        this.cxt.fillStyle = s,
        this.cxt.fill()
    }
}
,
MusicVisualizer.prototype.drawCanvasRect = function(i) {
    var t = this.cxt.canvas;
    this.cxt.clearRect(0, 0, t.width, t.height);
    var e, o = t.width / this.size;
    if (!this.source.rect) {
        this.source.rect = [];
        for (var s = this.source.rect, r = 0; r < this.size; r++)
            s[r] = {},
            s[r].vy = 2,
            s[r].cap = .8 * o > 10 ? 10 : .8 * o,
            s[r].h = 0,
            s[r].dy = 5 * s[r].cap
    }
    var c = this.cxt.createLinearGradient(0, 0, 0, t.height);
    c.addColorStop(1, "green"),
    c.addColorStop(.3, "yellow"),
    c.addColorStop(0, "red"),
    this.cxt.fillStyle = c;
    for (var r = 0; r < this.size; r++)
        e = i[4 * r] / 256 * t.height,
        this.source.rect[r].h <= 0 ? this.source.rect[r].h = 0 == e ? 0 : e + this.source.rect[r].dy : (this.source.rect[r].h = this.source.rect[r].h < e ? e + this.source.rect[r].dy : this.source.rect[r].h - this.source.rect[r].vy,
        this.source.rect[r].h = this.source.rect[r].h + this.source.rect[r].cap >= t.height ? t.height - this.source.rect[r].cap : this.source.rect[r].h),
        this.cxt.beginPath(),
        this.cxt.fillRect(o * r, t.height - this.source.rect[r].h - this.source.rect[r].cap, .8 * o, this.source.rect[r].cap),
        this.cxt.fillRect(o * r, t.height - e, .8 * o, e)
}
,
MusicVisualizer.prototype.resize = function() {
    var i = this.cxt.canvas
      , t = i.width
      , e = i.height;
    if (i.width = window.screen.availWidth,
    i.height = window.screen.availHeight,
    this.source.dot)
        for (var o = this.source.dot, s = 0; s < this.size; s++)
            o[s].x = o[s].x * i.width / t,
            o[s].y = o[s].y * i.height / e
}
,
MusicVisualizer.play1 = function(i) {
    i.source.connect(i.analyser),
    i.source === i.audioSource ? (i.audio.play(),
    i.audio.onended = i.onended) : (i.source[i.source.start ? "start" : "noteOn"](0),
    MusicVisualizer.isFunction(i.onended) && (i.source.onended = i.onended))
}
,
MusicVisualizer.prototype.pause = function() {
    this.source.bs.disconnect();
},
MusicVisualizer.prototype.resume = function(num) {
    this.source.bs.connect(this.ac.destination);
},
MusicVisualizer.prototype.stop = function(num) {
    var i = this;
    num = num || 0;
    i.source.bs.stop(num);
}
,
window.requestAnimFrame = function() {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(i, t) {
        return window.setTimeout(i, 1e3 / 60)
    }
}();