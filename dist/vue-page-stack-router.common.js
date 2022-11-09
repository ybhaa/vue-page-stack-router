/*!
  * vue-page-stack-router v3.1.4
  * (c) 2022 JoeshuTT
  * @license MIT
  */
'use strict';

var vue = require('vue');

var version = "3.1.4";

/**
 * 使用 Symbol 作为 pageStackRouter 的注入名
 */
var pageStackRouterKey = Symbol();

/**
 * 返回 PageStackRouter 实例
 */
function usePageStackRouter() {
  return vue.inject(pageStackRouterKey);
}

var script = {
  name: "PageStackRouterView",
  setup() {
    const pageStackRouter = usePageStackRouter();

    return {
      pageStackRouter,
    };
  },
};

function render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_router_view = vue.resolveComponent("router-view");

  return (vue.openBlock(), vue.createBlock(_component_router_view, null, {
    default: vue.withCtx(({ Component, route }) => [
      (vue.openBlock(), vue.createBlock(vue.KeepAlive, {
        include: $setup.pageStackRouter.pageList.map((v) => v.name)
      }, [
        (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(Component), {
          key: route.fullPath
        }))
      ], 1032 /* PROPS, DYNAMIC_SLOTS */, ["include"]))
    ]),
    _: 1 /* STABLE */
  }))
}

script.render = render;
script.__file = "src/components/PageStackRouterView.vue";

/**
 * 是否是滚动元素
 * @param {Element} node
 */
function isScrollableNode(node) {
  if (!node) {
    return false;
  }
  var overflowScrollReg = /scroll|auto/i;
  var {
    overflow
  } = window.getComputedStyle(node);
  return overflowScrollReg.test(overflow);
}

/**
 * 获取手动标记的滚动元素的集合
 * @param {string | string[]} el
 */
function getManualScrollingNodes(el) {
  var elementList = Array.isArray(el) ? [...el] : [...[el]];
  return [...new Set(elementList)].map(v => document.querySelector(v));
}

var body = document.body;
var screenScrollingElement = document.documentElement;
var scrollPositions = new Map();

/**
 * 保存该页面下各个滚动元素的滚动位置
 */
function saveScrollPosition(from) {
  var appRoot = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "#app";
  // DOM 操作有风险，try catch 护体
  try {
    var _from$meta;
    var screenNodeList = [screenScrollingElement, body]; // 屏幕滚动容器元素
    var appRootNode = document.querySelector(appRoot); // Vue 应用实例挂载容器元素
    var pageNodeList = [];
    if ((_from$meta = from.meta) !== null && _from$meta !== void 0 && _from$meta.scrollingElement) {
      pageNodeList = [appRootNode, ...getManualScrollingNodes(from.meta.scrollingElement)];
    } else {
      pageNodeList = [appRootNode, ...appRootNode.querySelectorAll("*")];
    }
    // prettier-ignore
    var scrollableNodeList = [...screenNodeList, ...pageNodeList].filter(isScrollableNode);
    var saver = scrollableNodeList.map(node => [node, {
      left: node.scrollLeft,
      top: node.scrollTop
    }]);
    var scrollKey = from.fullPath;
    scrollPositions.set(scrollKey, saver);
  } catch (err) {
    console.error("[pageStack saveScrollPosition]", err);
  }
}
function getSavedScrollPosition(key) {
  var scroll = scrollPositions.get(key);
  scrollPositions.delete(key);
  return scroll;
}

/**
 * 恢复该页面下各个滚动元素的滚动位置
 */
function revertScrollPosition(to) {
  var scrollKey = to.fullPath;
  var scrollPosition = getSavedScrollPosition(scrollKey);
  if (scrollPosition) {
    // DOM 操作有风险，try catch 护体
    try {
      vue.nextTick(() => {
        scrollPosition.forEach(_ref => {
          var [node, {
            left,
            top
          }] = _ref;
          left && (node.scrollLeft = left);
          top && (node.scrollTop = top);
        });
      });
    } catch (err) {
      console.error("[pageStack revertScrollPosition]", err);
    }
  }
}

// import { navigationType, navigationDirection } from "./history/common";
class PageStackRouter {
  constructor() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.pageList = [];
    this.el = options.el;
    this.max = options.max;
    this.disableSaveScrollPosition = options.disableSaveScrollPosition;
  }
  navigate(to, from) {
    var historyState = window.history.state;
    var lastPageState = this.pageList.length ? this.pageList[this.pageList.length - 1].state : null;
    var delta = 0;
    delta = lastPageState ? historyState.position - lastPageState.position : 0;

    // 在浏览器环境中，浏览器的后退等同于 pop ，前进等同于 push
    if (delta > 0) {
      this.push(to);
      !this.disableSaveScrollPosition && saveScrollPosition(from, this.el);
    }
    if (delta < 0) {
      !this.disableSaveScrollPosition && revertScrollPosition(to);
      this.pop();
    }
    this.replace(to);

    // TODO 记录路由导航方向，路由跳转方式
    // to.navigationType =  navigationType.pop,
    // to.navigationType =  navigationType.pop,

    //   direction: delta
    //     ? delta > 0
    //       ? navigationDirection.forward
    //       : navigationDirection.back
    //     : navigationDirection.unknown
  }

  /**
   * push 方法会在当前栈顶推入一个页面
   */
  push(location) {
    var historyState = window.history.state;
    if (this.pageList.length >= this.max) {
      this.pageList.splice(0, 1);
    }
    this.pageList.push({
      name: location.name,
      state: historyState
    });
  }

  /**
   * pop 方法会推出栈顶的一个页面
   */
  pop() {
    this.pageList.splice(this.pageList.length - 1);
  }

  /**
   * replace 方法会替换当前栈顶的页面
   */
  replace(location) {
    this.pageList.splice(this.pageList.length - 1);
    this.push(location);
  }
}

/**
 * 是否有值
 * @param {*} val
 */
function isDef(val) {
  return val !== undefined && val !== null;
}

function install(app) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var {
    router,
    el = "#app",
    max = 10,
    disableSaveScrollPosition = false
  } = options;
  if (!router) {
    throw new Error("vue-router \u5B9E\u4F8B\u5FC5\u987B\u5B58\u5728\uFF01");
  }
  var pageStackRouter = new PageStackRouter({
    el,
    max,
    disableSaveScrollPosition
  });
  router.afterEach((to, from) => {
    var _to$meta;
    var keepAlive = (_to$meta = to.meta) === null || _to$meta === void 0 ? void 0 : _to$meta.keepAlive;
    if (!isDef(keepAlive)) {
      keepAlive = true;
    }
    if (to.name && keepAlive) {
      pageStackRouter.navigate(to, from);
    }
  });
  app.component("PageStackRouterView", script);
  app.provide(pageStackRouterKey, vue.reactive(pageStackRouter));
}

var VuePageStackRouter = {
  install,
  version
};

exports.VuePageStackRouter = VuePageStackRouter;
exports.pageStackRouterKey = pageStackRouterKey;
exports.usePageStackRouter = usePageStackRouter;
