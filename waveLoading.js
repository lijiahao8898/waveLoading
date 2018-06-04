'use strict';

var waveLoading = function (options) {
    this.waveBehind = '';
    this.waveFront = '';
    this.timer = null;
    this._progress = 0;
    this.haveInited = true;
    this.oldInitArgument = options;
    this.options = options ? options : {};
    this.canvas = options.target ? (typeof options.target === 'string' ? document.querySelector(options.target) : options.target) : document.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.WIDTH = this.canvas.width;
    this.HEIGHT = this.canvas.height;
    this.LINE_OFFSET = 0.5;
    this.R = Math.min(this.WIDTH, this.HEIGHT) / 2;
    this.COLOR = options.color ? options.color : 'rgba(40, 230, 200, 1)';
    this.BACKGROUND_COLOR = options.bgColor ? options.bgColor : 'white';
    this.GLOBAL_ALPHA = options.alpha ? options.alpha : 1;
    this.LINE_WIDTH = options.lineWidth ? options.lineWidth : 1;
    this.CALLBACK = options.callback ? options.callback : function () {
    };
    this.SHOW_TEXT = !!options.showText;
    this.TEXT_SIZE = options.textSize ? options.textSize + ' ' : '16px ';
    this.TEXT_COLOR = options.textColor ? options.textColor : this.COLOR;
    this.FONT_FAMILY = options.fontFamily ? ' ' + options.fontFamily : ' Helvetica, Tahoma, Arial, STXihei, "华文细黑", "Microsoft YaHei", "微软雅黑", sans-serif';
    this.FONT_WEIGHT = options.fontWeight ? options.fontWeight + ' ' : 'lighter ';
    this.SPEED = options.speed ? options.speed : 1;
    this.PEAK = options.peak ? options.peak : 18;
};

waveLoading.prototype = {
    /**
     * 初始化参数
     * @param {object} options
     */
    init: function () {
        this.ctx.strokeStyle = this.COLOR;
        this.ctx.lineWidth = this.LINE_WIDTH;
        this.ctx.translate(this.WIDTH / 2, this.HEIGHT / 2);

        // 背景波浪
        this.waveBehind = this.wave({
            alpha: 0.6,
            yOffset: -8,
            speed: 0.07 * this.SPEED,
            peak: this.PEAK
        });

        // 前景波浪
        this.waveFront = this.wave({
            alpha: 1,
            yOffset: 0,
            speed: 0.06 * this.SPEED,
            peak: this.PEAK
        });
    },
    draw: function () {
        var that = this;
        if (!this.haveInited) {
            return;
        }

        this.ctx.clearRect(-this.WIDTH / 2, -this.HEIGHT / 2, this.WIDTH, this.HEIGHT);

        this.ctx.arc(0, 0, this.R, 0, Math.PI * 0, true);
        this.ctx.stroke();

        this.ctx.lineWidth = 1;
        this.waveBehind.render();
        this.waveFront.render();
        this.drawText();

        if (!this.progressIsCompleted()) {
            this.timer = requestAnimationFrame(function () {
                that.draw();
            });
        } else {
            this.finalDraw();
        }
    },
    /**
     * 进度完成后的绘制
     * 接管前景波浪和背景波浪的进度控制
     * 使其快速上升填满容器然后停止动画
     */
    finalDraw: function () {
        var tempProcess = this.progressGet();
        var MAX_PROCESS = 120;
        var STEP = 0.8;
        var that = this;

        (function tempLoop () {
            that.ctx.clearRect(-that.WIDTH / 2, -that.HEIGHT / 2, that.WIDTH, that.HEIGHT);
            // 接管进度
            that.waveFront.setOffset(tempProcess);
            that.waveBehind.setOffset(tempProcess);
            that.waveFront.render();
            that.waveBehind.render();
            that.drawText();

            if (tempProcess < MAX_PROCESS) {
                tempProcess += STEP;
                that.timer = requestAnimationFrame(tempLoop);
            } else {
                // 下面代码会导致结束时闪一下，暂不知原因
                // 在波浪的render中，整个while循环结束时再stroke，要比每画一根线都stroke颜色要浅一些，可能与此有关，深色深浅瞬间变化
                //  ctx.arc(0, 0, R, 0, Math.PI * 2);
                //  ctx.fillStyle = COLOR;
                //  ctx.fill();
                //  ctx.stroke();
                //  drawText();

                // 重置与进度相关的属性，便于可能的再次绘制
                that.progressReset();
                that.waveBehind.resetOffset();
                that.waveFront.resetOffset();
                // 执行结束时的回调函数
                that.CALLBACK.call(null);
            }
        })();
    },
    /**
     * 绘制进度提示字样（百分比）
     */
    drawText: function () {
        if (!this.SHOW_TEXT) {
            return;
        }

        var THRESHOLD = 55;
        var tempProcess = this.progressGet();
        tempProcess = tempProcess > 100 ? 100 : tempProcess;
        this.ctx.save();
        this.ctx.font = this.FONT_WEIGHT + this.TEXT_SIZE + this.FONT_FAMILY;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = tempProcess > THRESHOLD ? this.BACKGROUND_COLOR : this.TEXT_COLOR;
        this.ctx.fillText(tempProcess.toFixed(1) + '%', 0, 0);
        this.ctx.restore();
    },
    dist: function (x1, y1, x2, y2) {
        x2 = x2 ? x2 : 0;
        y2 = y2 ? y2 : 0;
        return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
    },
    /**
     * 单个基础波浪动画生成函数
     */
    wave: function (options) {
        options = options ? options : {};
        var xPos = -this.R;
        var yPos = 0;
        var xStep = 1;
        var angleStep = 0.025;
        var angle = 0;
        var alpha = options.alpha ? options.alpha * this.GLOBAL_ALPHA : 1;
        var peak = options.peak ? options.peak : 18;
        var yOffset = options.yOffset ? options.yOffset : 0;
        var angleIncrement = options.speed ? options.speed : 0.06;
        var that = this;

        var getAngle = function () {
            var count = Math.PI / 2;
            return function () {
                count += angleIncrement;
                return count;
            };
        }();

        /**
         * 偏移量处理
         */
        var offset = function () {
            var count;
            var basicOffset = 5;
            var isTrusteed = false;
            var trusteedNum = 0;

            function calc () {
                var tempProcess = isTrusteed ? trusteedNum : that.progressGet();
                count = that.R - (2 * that.R) * tempProcess / 100 + yOffset + basicOffset;
            }

            function get () {
                calc();
                return count;
            }

            function trustee (num) {
                isTrusteed = true;
                trusteedNum = num;
            }

            function reset () {
                isTrusteed = false;
                trusteedNum = 0;
            }

            return {
                get: get,
                reset: reset,
                trustee: trustee
            };
        }();

        function render () {
            that.ctx.save();
            that.ctx.globalAlpha = alpha;

            angle = getAngle();
            xPos = -that.R;
            yPos = 0;

            that.ctx.beginPath();

            while (xPos < that.R) {
                var tempOffset = offset.get();
                var yEnd = Math.sqrt(Math.pow(that.R, 2) - Math.pow(xPos, 2));
                var nextXPos = xPos + xStep;
                var nextYPos = Math.sin(angle) * peak + tempOffset;
                var nextAngle = angle + angleStep;

                // 解决canvas线宽（lineWidth）引起的坐标不准问题，引入LINE_OFFSET，偏移0.5个像素
                that.ctx.moveTo(xPos - that.LINE_OFFSET, yPos);
                that.ctx.lineTo(xPos - that.LINE_OFFSET, yEnd);

                xPos = nextXPos;
                yPos = that.dist(nextXPos, nextYPos) < that.R ? nextYPos : yEnd * (tempOffset > 0 ? 1 : -1);
                angle = nextAngle;
            }

            that.ctx.closePath();
            that.ctx.stroke();
            that.ctx.restore();
        }

        return {
            render: render,
            setOffset: offset.trustee,
            resetOffset: offset.reset
        };
    },
    progressSet: function (num) {
        if (num >= 0 && num <= 101) {
            this._progress = num;
        }
    },
    progressGet: function () {
        return this._progress;
    },
    progressReset: function () {
        this.progressSet(0);
    },
    progressIsCompleted: function () {
        return this._progress >= 100;
    }

};

export default waveLoading;
