import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';
import { MessageHandlerService } from '../../shared/message-handler/message-handler.service';
import { PodClient } from '../../shared/client/v1/kubernetes/pod';
import * as SockJS from 'sockjs-client';
import { Container, KubePod } from '../../shared/model/v1/kubernetes/kubepod';
import { PageState } from '../../shared/page/page-state';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'pod-terminal',
  templateUrl: 'pod-terminal.component.html',
  styleUrls: ['pod-terminal.component.scss']
})
export class PodTerminalComponent implements OnInit, OnDestroy {
  appId: number;
  cluster: string;
  nid: string;
  namespace: string;
  selectedPod = new KubePod();
  selectedContainer: string;
  containers: Container[];
  log: string;
  resourceName: string;
  resourceType: string;
  pods: KubePod[];
  @ViewChild('terminal')
  terminal: ElementRef;
  @ViewChild('searchInput')
  searchInput: ElementRef<HTMLInputElement>;
  xterm: Terminal;
  socket: SockJS;
  private timer: any = null;

  // xterm 6 附加组件：fit 计算行列 / 链接识别 / WebGL 渲染 / 终端内搜索
  private fitAddon: FitAddon;
  private searchAddon: SearchAddon;
  private webglAddon: WebglAddon;
  // 容器尺寸变化监听（v6 不再暴露 _core 渲染度量，行列一律交给 FitAddon 计算）
  private resizeObserver: ResizeObserver = null;
  private resizeDebounce: any = null;
  // 容器内 shell 是否已就绪（收到 wayne-init 回显），就绪后才向后端同步行列
  private serverReady = false;

  // 终端内搜索框状态
  searchVisible = false;
  searchTerm = '';
  
  // 新增状态管理
  isLoading = true;
  connectionStatus: 'connecting' | 'connected' | 'error' = 'connecting';
  loadingMessage = '正在连接终端...';
  
  // 缓存机制
  private static podCache = new Map<string, {pods: KubePod[], timestamp: number}>();
  private static readonly CACHE_DURATION = 30000; // 30秒缓存
  
  // 性能监控
  private performanceMetrics = {
    startTime: 0,
    podLoadTime: 0,
    terminalCreateTime: 0,
    connectionTime: 0,
    totalTime: 0
  };

  constructor(private route: ActivatedRoute,
              private router: Router,
              private messageHandlerService: MessageHandlerService,
              private podClient: PodClient) {
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }

  ngOnInit(): void {
    this.isLoading = true;
    this.connectionStatus = 'connecting';
    this.loadingMessage = '正在初始化...';
    
    // 开始性能监控
    this.performanceMetrics.startTime = performance.now();
    
    this.appId = parseInt(this.route.snapshot.params['id'], 10);
    this.cluster = this.route.snapshot.params['cluster'];
    this.namespace = this.route.snapshot.params['namespace'];
    const podName = this.route.snapshot.params['podName'];
    const container = this.route.snapshot.params['container'];
    this.nid = this.route.snapshot.params['nid'];
    this.resourceName = this.route.snapshot.params['resourceName'];
    this.resourceType = this.route.snapshot.params['resourceType'];
    
    // 并行执行：同时获取pod列表和创建终端会话
    this.loadingMessage = '正在获取Pod信息...';
    this.loadPodsAndCreateTerminal(podName, container);
  }

  private loadPodsAndCreateTerminal(podName: string, container: string): void {
    const pageState = new PageState();
    pageState.page.pageSize = 1000;
    
    // 检查缓存
    const cacheKey = `${this.cluster}-${this.namespace}-${this.resourceType}-${this.resourceName}-${this.appId}`;
    const cached = PodTerminalComponent.podCache.get(cacheKey);
    const now = Date.now();
    
    let podsObservable;
    if (cached && (now - cached.timestamp) < PodTerminalComponent.CACHE_DURATION) {
      // 使用缓存数据
      podsObservable = of({data: {list: cached.pods}});
      console.log('Using cached pod data');
    } else {
      // 从服务器获取数据
      podsObservable = this.podClient.listPageByResouce(pageState, this.cluster, this.namespace, this.resourceType, this.resourceName, this.appId);
    }
    
    // 并行执行pod列表获取和终端创建
    forkJoin({
      pods: podsObservable,
      terminal: this.podClient.createTerminal(this.appId, this.cluster, this.namespace, podName || 'default', container)
    }).subscribe(
      ({pods, terminal}: {pods: any, terminal: any}) => {
        this.pods = pods.data.list;
        
        // 记录Pod加载时间
        this.performanceMetrics.podLoadTime = performance.now() - this.performanceMetrics.startTime;
        
        // 更新缓存
        PodTerminalComponent.podCache.set(cacheKey, {pods: this.pods, timestamp: now});
        
        if (this.pods && this.pods.length > 0) {
          const pod = this.getPodByName(podName);
          if (!pod) {
            // 重定向到第一个pod
            const url = `portal/namespace/${this.nid}/app/${this.appId}/${this.resourceType}/${this.resourceName}/pod/${this.pods[0].metadata.name}/terminal/${this.cluster}/${this.namespace}`;
            this.router.navigateByUrl(url);
            return;
          }
          this.selectedPod = pod;
          this.initContainer(container);
          
          // 记录终端创建时间
          this.performanceMetrics.terminalCreateTime = performance.now() - this.performanceMetrics.startTime;
          
          // 直接使用已创建的终端会话
          this.loadingMessage = '正在建立连接...';
          this.handleTerminalResponse(terminal.data);
        }
      },
      error => {
        this.isLoading = false;
        this.connectionStatus = 'error';
        this.messageHandlerService.handleError(error);
      }
    );
  }

  initContainer(container: string) {
    this.containers = this.selectedPod.spec.containers;
    for (const con of this.containers) {
      if (container === con.name) {
        this.selectedContainer = container;
        this.initTernimal();
        return;
      }
    }
    this.selectedContainer = this.containers[0].name;
    this.containerChange();
  }

  containerChange() {
    const url = `portal/namespace/${this.nid}/app/${this.appId}/${this.resourceType}` +
      `/${this.resourceName}/pod/${this.selectedPod.metadata.name}/container/${this.selectedContainer}` +
      `/terminal/${this.cluster}/${this.namespace}`;
    this.router.navigateByUrl(url);
  }


  getPodByName(podName: string) {
    if (podName) {
      for (const pod of this.pods) {
        if (pod.metadata.name === podName) {
          return pod;
        }
      }
    }
    return null;
  }


  podChange() {
    this.containers = this.selectedPod.spec.containers;
    this.selectedContainer = this.containers[0].name;
    const url = `portal/namespace/${this.nid}/app/${this.appId}/${this.resourceType}/${this.resourceName}` +
      `/pod/${this.selectedPod.metadata.name}/container/${this.selectedContainer}/terminal/${this.cluster}/${this.namespace}`;
    this.router.navigateByUrl(url);
  }

  initTernimal() {
    this.xterm = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      scrollback: 5000
    });

    // 附加组件注册：fit 负责按容器尺寸算行列（取代原先访问 _core 私有字段的做法）
    this.fitAddon = new FitAddon();
    this.searchAddon = new SearchAddon();
    this.xterm.loadAddon(this.fitAddon);
    this.xterm.loadAddon(this.searchAddon);
    this.xterm.loadAddon(new WebLinksAddon());

    // Ctrl+F 打开终端内搜索，同时屏蔽浏览器自带查找
    this.xterm.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'f') {
        if (event.type === 'keydown') {
          this.toggleSearch(true);
        }
        event.preventDefault();
        return false;
      }
      return true;
    });

    this.xterm.onResize(() => {
      // shell 就绪后，每次行列变化都同步给后端，避免拉大窗口后命令换行错乱
      if (this.serverReady) {
        this.sendResize();
      }
    });

    this.xterm.onData((data: string) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({'Op': 'stdin', 'Data': data}));
      }
    });

    this.xterm.open(this.terminal.nativeElement);
    // open 之后布局尺寸才可测量，fit 放到下一帧执行
    requestAnimationFrame(() => {
      this.fit();
      this.tryLoadWebgl();
      this.observeResize();
    });
  }

  // fit 按容器尺寸重算行列；容器不可见时 FitAddon 会算不出尺寸，直接跳过
  private fit() {
    if (!this.fitAddon || !this.xterm || !this.terminal) {
      return;
    }
    try {
      this.fitAddon.fit();
    } catch (e) {
      console.warn('terminal fit failed', e);
    }
  }

  // observeResize 监听容器尺寸变化，防抖后重新 fit
  private observeResize() {
    if (typeof ResizeObserver === 'undefined' || !this.terminal) {
      return;
    }
    const host = this.terminal.nativeElement.parentElement as HTMLElement;
    if (!host) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeDebounce) {
        clearTimeout(this.resizeDebounce);
      }
      this.resizeDebounce = setTimeout(() => {
        this.fit();
        this.resizeDebounce = null;
      }, 120);
    });
    this.resizeObserver.observe(host);
  }

  // startReadyProbe 轮询 echo wayne-init，收到回显即说明容器内 shell 已就绪
  private startReadyProbe() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({'Op': 'stdin', 'Data': 'echo wayne-init\n'}));
      }
    }, 500);

    // 超时兜底，避免无限等待
    setTimeout(() => {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        console.warn('Terminal initialization timeout');
        this.loadingMessage = '终端初始化超时，请重试';
      }
    }, 8000);
  }

  // sendResize 把当前行列同步给后端（ws 协议不变：Op=resize）
  private sendResize() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({'Op': 'resize', 'Cols': this.xterm.cols, 'Rows': this.xterm.rows}));
    }
  }

  // tryLoadWebgl WebGL 渲染器（v6 已移除 canvas 渲染器），失败时静默回退 DOM 渲染
  private tryLoadWebgl() {
    try {
      this.webglAddon = new WebglAddon();
      this.webglAddon.onContextLoss(() => {
        this.webglAddon.dispose();
        this.webglAddon = null;
      });
      this.xterm.loadAddon(this.webglAddon);
    } catch (e) {
      console.warn('WebGL 渲染器不可用，回退 DOM 渲染', e);
      this.webglAddon = null;
    }
  }

  // 新增方法处理终端响应
  private handleTerminalResponse(terminalData: any): void {
    const session = terminalData.sessionId;
    const configUrl = (window as any).CONFIG.URL;
    const url = `${configUrl}/ws/pods/exec?${session}`;
    
    this.socket = new SockJS(url);
    this.socket.onopen = this.onConnectionOpen.bind(this, terminalData);
    this.socket.onmessage = this.onConnectionMessage.bind(this);
    this.socket.onclose = this.onConnectionClose.bind(this);
    
    // 设置连接超时
    setTimeout(() => {
      if (this.connectionStatus === 'connecting') {
        this.connectionStatus = 'error';
        this.loadingMessage = '连接超时，请重试';
        if (this.socket) {
          this.socket.close();
        }
      }
    }, 10000); // 10秒连接超时
  }

  // 连接建立成功后的挂载操作
  onConnectionOpen(data: any): void {
    this.socket.send(JSON.stringify({'Op': 'bind', 'data': JSON.stringify(data)}));
    // 绑定完成后开始探测容器内 shell 是否就绪
    this.serverReady = false;
    this.startReadyProbe();
    this.xterm.focus();

    this.isLoading = false;
    this.connectionStatus = 'connected';

    // 记录连接完成时间并输出性能报告
    this.performanceMetrics.connectionTime = performance.now() - this.performanceMetrics.startTime;
    this.performanceMetrics.totalTime = this.performanceMetrics.connectionTime;
    this.logPerformanceMetrics();
  }
  
  // 输出性能监控报告
  private logPerformanceMetrics(): void {
    console.log('=== Pod Terminal Performance Report ===');
    console.log(`Pod加载时间: ${this.performanceMetrics.podLoadTime.toFixed(2)}ms`);
    console.log(`终端创建时间: ${this.performanceMetrics.terminalCreateTime.toFixed(2)}ms`);
    console.log(`连接建立时间: ${this.performanceMetrics.connectionTime.toFixed(2)}ms`);
    console.log(`总耗时: ${this.performanceMetrics.totalTime.toFixed(2)}ms`);
    console.log('=====================================');
  }

  // toggleSearch 显示/隐藏终端内搜索框（Ctrl+F 触发）
  toggleSearch(visible: boolean): void {
    this.searchVisible = visible;
    if (visible) {
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
          this.searchInput.nativeElement.select();
        }
      }, 0);
    } else {
      if (this.searchAddon) {
        this.searchAddon.clearDecorations();
      }
      this.searchTerm = '';
      if (this.xterm) {
        this.xterm.focus();
      }
    }
  }

  closeSearch(): void {
    this.toggleSearch(false);
  }

  // onSearchInput 输入框变化（模板不直接取 $event.target，避免严格模板类型检查报错）
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.onSearchTermChange(input ? input.value : '');
  }

  // onSearchTermChange 输入变化时从当前位置向后查找
  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    if (!value) {
      if (this.searchAddon) {
        this.searchAddon.clearDecorations();
      }
      return;
    }
    this.findNext();
  }

  findNext(): void {
    if (this.searchAddon && this.searchTerm) {
      this.searchAddon.findNext(this.searchTerm, {incremental: true});
    }
  }

  findPrevious(): void {
    if (this.searchAddon && this.searchTerm) {
      this.searchAddon.findPrevious(this.searchTerm, {incremental: true});
    }
  }

  // 获取服务端传来的信息
  onConnectionMessage(evt) {
    try {
      const msg = JSON.parse(evt.data);
      switch (msg['Op']) {
        case 'stdout':
          if (msg['Data'].toString().indexOf(`starting container process caused 'exec: \\'bash\\': executable file not found in $PATH'`) === -1) {
            if (msg['Data'].indexOf('wayne-init') > -1) {
              console.log('server ready.');
              clearInterval(this.timer);
              this.timer = null;
              this.serverReady = true;

              // shell 就绪后立即同步一次行列，减少首屏错位
              this.sendResize();
            } else {
              this.xterm.write(msg['Data']);
            }
          }
          break;
        default:
          console.error('Unexpected message type:', msg);
      }
    } catch (e) {
      console.log('parse json error.', evt.data);
    }
  }

  // 连接关闭
  onConnectionClose(evt) {
    this.connectionStatus = 'error';
    if (evt.reason !== '' && evt.code < 1000) {
      this.xterm.writeln(evt.reason);
    } else {
      this.xterm.writeln('Connection closed');
    }
  }

  ngOnDestroy(): void {
    // 先停监听与定时器，再释放终端，避免销毁过程中回调再次访问已释放实例
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeDebounce) {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.xterm) {
      this.xterm.dispose();
      this.xterm = null;
    }
  }

  // 新增方法：清除缓存
  static clearCache(): void {
    PodTerminalComponent.podCache.clear();
  }
}
