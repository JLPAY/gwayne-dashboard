import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Terminal } from 'xterm';
import * as webLinks from 'xterm/lib/addons/webLinks/webLinks';
import * as winptyCompat from 'xterm/lib/addons/winptyCompat/winptyCompat';
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
  @ViewChild('terminal', { static: false })
  terminal: ElementRef;
  xterm: Terminal;
  socket: SockJS;
  private timer: any = null;
  
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
      fontFamily: 'Consolas, "Courier New", monospace'
    });
    
    this.xterm.on('resize', (size) => {
      // 优化轮询机制：减少频率，增加超时
      this.timer = setInterval(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({'Op': 'stdin', 'Data': 'echo wayne-init\n'}));
        }
      }, 500); // 从1秒改为500毫秒
      
      // 设置超时机制，避免无限等待
      setTimeout(() => {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
          console.warn('Terminal initialization timeout');
          this.loadingMessage = '终端初始化超时，请重试';
        }
      }, 8000); // 8秒超时
    });
    
    this.xterm.on('key', (key?: string, ev?: KeyboardEvent) => {
      // 键盘事件处理
    });
    
    this.xterm.on('data', (data: any) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({'Op': 'stdin', 'Data': data}));
      }
    });
    
    this.xterm.open(this.terminal.nativeElement);
    this.connect();
  }

  connect() {
    // 如果已经有终端会话，直接使用
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }
    
    // 否则重新创建
    this.podClient.createTerminal(this.appId, this.cluster, this.namespace, this.selectedPod.metadata.name, this.selectedContainer)
      .subscribe(
        response => {
          this.handleTerminalResponse(response.data);
        },
        error => {
          this.isLoading = false;
          this.connectionStatus = 'error';
          this.messageHandlerService.handleError(error);
        }
      );
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
    winptyCompat.winptyCompatInit(this.xterm);
    webLinks.webLinksInit(this.xterm);
    this.onTerminalResize();
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

  // 修改窗口大小
  onTerminalResize() {
    const width = this.terminal.nativeElement.parentElement.clientWidth;
    const height = this.terminal.nativeElement.parentElement.clientHeight;
    const xterm: any = this.xterm;
    const cols = (width - xterm._core.viewport.scrollBarWidth - 15) / xterm._core.renderer.dimensions.actualCellWidth;
    const rows = height / xterm._core.renderer.dimensions.actualCellHeight;
    this.xterm.resize(parseInt(cols.toString(), 10), parseInt(rows.toString(), 10));

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
              
              // 立即发送resize命令，减少延迟
              this.socket.send(JSON.stringify({'Op': 'resize', 'Cols': this.xterm.cols, 'Rows': this.xterm.rows}));
              // 只发送一次resize命令
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
    if (this.xterm) {
      this.xterm.dispose();
    }
    if (this.socket) {
      this.socket.close();
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // 新增方法：清除缓存
  static clearCache(): void {
    PodTerminalComponent.podCache.clear();
  }
}
