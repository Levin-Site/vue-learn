class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm;
    this.expr = expr;
    this.cb = cb;
    //先把旧值保存起来
    this.oldVal = this.getOldVal();
  }
  getOldVal() {
    Dep.target = this;
    const oldVal = compileUtil.getVal(this.expr, this.vm);
    Dep.target = null;
    return oldVal;
  }
  update() {
    const newVal = compileUtil.getVal(this.expr, this.vm);
    if (newVal !== this.oldVal) {
      this.cb(newVal)
    }
  }
}
//依赖收集器
class Dep {
  constructor() {
    this.subs = []
  }
  //收集观察者
  addSub(watcher) {
    this.subs.push(watcher);
  }
  //通知观察者去更新
  notify() {
    console.log('观察者', this.subs);
    this.subs.forEach(w => w.update())
  }

}
class Observer {
  constructor(data) {
    this.observe(data);
  }
  observe(data) {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key]);
      });
    }
  }
  defineReactive(obj, key, value) {
    //递归遍历
    this.observe(value);
    const dep = new Dep();
    //初始化
    //劫持所有属性
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      get() {
        //订阅数据变化时，往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target);
        return value;
      },
      set: newVal => {
        this.observe(newVal);
        if (value !== newVal) {
          value = newVal;
        }
        //通知Dep有变化
        dep.notify();
      }
    });
  }
}