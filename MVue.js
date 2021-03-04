const compileUtil = {
  getVal(expr, vm) {
    return expr.split('.').reduce((data, currentVal) => {
      return data[currentVal];
    }, vm.$data);
  },
  setVal(expr, vm, inputVal) {
    return expr.split('.').reduce((data, currentVal) => {
      data[currentVal] = inputVal;
    }, vm.$data);
  },
  getContent(expr, vm) {
    // {{person.name}}--{{person.age}}
    // 防止修改person.name使得所有值全部被替换
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm);
    });
  },
  text(node, expr, vm) {
    let value;
    if (expr.indexOf('{{') !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // text的 Watcher应在此绑定，因为是对插值{{}}进行双向绑定
        // Watcher的构造函数的 getOldVal()方法需要接受数据或者对象，而{{person.name}}不能接收
        //绑定观察者，将来数据发生变化时触发回调，进行更新
        new Watcher(vm, args[1], () => {
          this.updater.textUpdater(node, this.getContent(expr, vm));
        });
        return this.getVal(args[1], vm);
      });
    } else {
      value = this.getVal(expr, vm);
    }
    // const value = this.getVal(expr, vm);
    this.updater.textUpdater(node, value);
  },
  html(node, expr, vm) {
    const value = this.getVal(expr, vm);
    //订阅数据变化，绑定更新函数
    new Watcher(vm, expr, newVal => {
      this.updater.htmlUpdater(node, newVal);
    });
    this.updater.htmlUpdater(node, value);
  },
  model(node, expr, vm) {
    const value = this.getVal(expr, vm);
    //绑定观察者 数据=>视图
    new Watcher(vm, expr, newVal => {
      this.updater.modelUpdater(node, newVal);
    });
    //视图=>数据=>视图
    node.addEventListener('input', (e) => {
      //设置值
      this.setVal(expr, vm, e.target.value);
    })
    this.updater.modelUpdater(node, value);
  },
  on(node, expr, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expr];
    node.addEventListener(eventName, fn.bind(vm), false);
  },
  updater: {
    textUpdater(node, value) {
      node.textContent = value;
    },
    htmlUpdater(node, value) {
      node.innerHTML = value;
    },
    modelUpdater(node, value) {
      node.value = value;
    }
  }
};

class Compile {
  constructor(el, vm) {
    this.vm = vm;
    this.el = this.isElementNode(el) ? el : document.querySelector(el);
    //1.获取文档碎片对象，放入内存中可以减少页面的回流和重绘
    const fragment = this.node2Fragment(this.el);
    //2.编译模板
    this.compile(fragment);
    //3.追加子元素到根元素
    this.el.appendChild(fragment);
  }
  compile(fragment) {
    const childNodes = fragment.childNodes;
    [...childNodes].forEach(child => {
      if (this.isElementNode(child)) {
        this.compileElement(child);
      } else {
        this.compileText(child);
      }

      if (child.childNodes && child.childNodes.length) {
        this.compile(child);
      }
    });
  }
  compileElement(node) {
    const attributes = node.attributes;
    [...attributes].forEach(attr => {
      const {
        name,
        value
      } = attr;
      if (this.isDirective(name)) {
        //表示是一个指令
        const [, directive] = name.split('-');
        // console.log(directive);
        const [dirName, eventName] = directive.split(':');
        //更新数据 数据驱动视图
        compileUtil[dirName](node, value, this.vm, eventName);

        //删除有指令标签上的属性
        node.removeAttribute('v-' + directive);
      } else if (this.isEventName(name)) {
        //@click="fnName"
        let [, eventName] = name.split('@');
        compileUtil['on'](node, value, this.vm, eventName);
      }
    });
  }
  compileText(node) {
    //{{}}
    const content = node.textContent;
    if (/\{\{(.+?)\}\}/.test(content)) {
      compileUtil['text'](node, content, this.vm);
    }
  }
  isEventName(attrName) {
    return attrName.startsWith('@');
  }
  isDirective(attrName) {
    return attrName.startsWith('v-');
  }
  isElementNode(node) {
    return node.nodeType === 1;
  }
  node2Fragment(el) {
    //创建文档碎片
    const f = document.createDocumentFragment();
    let firstChild;
    while ((firstChild = el.firstChild)) {
      //这里循环的next不知道怎么实现的
      f.appendChild(firstChild);
    }
    return f;
  }
}

class MVue {
  constructor(options) {
    this.$el = options.el;
    this.$data = options.data;
    this.$options = options;
    console.log(this);
    if (this.$el) {
      //实现一个数据监听器
      new Observer(this.$data);
      //实现一个指令解析器
      new Compile(this.$el, this);
      this.proxyData(this.$data);
    }
  }
  proxyData(data) {
    for (var key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key];
        },
        set(newVal) {
          data[key] = newVal;
        }
      })
    }

  }
}