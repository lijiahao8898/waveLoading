### waveLoading.js

根据[waveLoading.js](https://github.com/newraina/waveLoading.js)进行改进从而可以初始化多个。

#### how to use

详尽API请自行请访问[waveLoading.js]（https://github.com/newraina/waveLoading.js）原地址，或者查看源码
本工程使用在`vue`项目中，大致使用如下：
```html
// html
<canvas width="340" height="340" class="canvas">对不起，您的浏览器不支持canvas</canvas>
```

```js
// js
import waveLoading from './js/waveLoading';

let wave = new waveLoading({
    target: '.canvas',
    color: '#58d952',
    speed: 0.5,
    peak: 10,
    callback: function () {
    }
});
wave.init();
wave.draw();
wave.progressSet(value);
```