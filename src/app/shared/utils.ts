// 判断某对象为空..返回true 否则 false
import { configKeyApiNameGenerateRule, defaultApiNameGenerateRule } from './shared.const';
import { KubePod } from './model/v1/kubernetes/kubepod';

/**
 * 判断值是否为 undefined。
 *
 * 原实现是 `import { isUndefined } from 'util'`（Node 内置模块）。
 * Angular 12 起构建切到 webpack 5，webpack 5 **不再自动 polyfill Node 内置模块**，
 * 而 node_modules 里已没有 util 包，构建直接报
 * `Module not found: Error: Can't resolve 'util'`（11 处）。
 *
 * 该 API 已被 Node 官方废弃（Node 23 移除），且语义就是 `value === undefined`
 * —— 已对 browserify util shim（node_modules/path/node_modules/util@0.10.4）
 * 逐值比对确认等价，故改为本地纯函数，彻底去掉这个 Node 内置依赖。
 */
export const isUndefined = function (value: any): boolean {
  return value === undefined;
};

export const isEmpty = function (obj: any): boolean {
  if (obj === false) {
    return false;
  }
  if (obj === 0) {
    return false;
  }
  return (obj == null || obj === '');
};
// 判断某对象不为空..返回true 否则 false
export const isNotEmpty = function (obj: any): boolean {
  return !isEmpty(obj);
};

export const isArrayNotEmpty = function (obj: any): boolean {
  return obj != null && obj.length > 0;
};

export const isArrayEmpty = function (obj: any): boolean {
  return !isArrayNotEmpty(obj);
};

/**
 * Simple object check.
 * @returns  boolean
 */
export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * refer to https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) {
    return target;
  }
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (isObject(source[key])) {
          if (!target[key]) {
            Object.assign(target, {[key]: {}});
          }
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, {[key]: source[key]});
        }
      }
    }
  }

  return mergeDeep(target, ...sources);
}


export class ApiNameGenerateRule {
  static config(globalConfig: string, appMetaData: string): string {
    // this.authService.config[configKeyApiNameGenerateRule]
    let apiNameGenerateRule = globalConfig ?
      globalConfig : defaultApiNameGenerateRule;
    if (appMetaData) {
      const metaData = JSON.parse(appMetaData);
      if (metaData[configKeyApiNameGenerateRule]) {
        apiNameGenerateRule = metaData[configKeyApiNameGenerateRule];
      }
    }

    return apiNameGenerateRule;
  }

  static generateName(config: string, apiName: string, appName: string): string {
    if (config === defaultApiNameGenerateRule) {
      return appName + '-' + apiName;
    }
    return apiName;
  }
}

export class ResourceUnitConvertor {
  static cpuCoreValue(cpu: string): number {
    if (!cpu) {
      return 0;
    }
    if (cpu.toString().indexOf('m') > -1) {
      return parseFloat(cpu) / 1000;
    }
    return parseFloat(cpu);
  }

  static memoryGiValue(memory: string): number {
    if (!memory) {
      return 0;
    }
    if (memory.toString().indexOf('Gi') > -1) {
      return parseFloat(memory);
    }
    if (memory.toString().indexOf('Mi') > -1) {
      return parseFloat(memory) / 1024;
    }
    if (memory.toString().indexOf('Ki') > -1) {
      return parseFloat(memory) / (1024 * 1024);
    }
    if (memory.toString().indexOf('m') > -1) {
      return parseFloat(memory) / (1024 * 1024 * 1024 * 1000);
    }

    return parseFloat(memory);
  }

}

export class KubePodUtil {
  // isPodAbnormal 判断 Pod 是否处于异常状态，需要 AI 排查。
  // Running 与 Succeeded（Job 正常完成）视为正常；Terminating（正在删除）属于正常生命周期，
  // 也视为非异常，不展示「AI 排查」入口。其余（Pending/Failed/Unknown/
  // CrashLoopBackOff/ContainerCreating/Error 等）均视为异常。
  static isPodAbnormal(pod: KubePod): boolean {
    const status = KubePodUtil.getPodStatus(pod);
    return status !== 'Running' && status !== 'Succeeded' && status !== 'Terminating';
  }

  // getPodStatus returns the pod state
  static getPodStatus(pod: KubePod): string {
    // Terminating
    if (pod.metadata.deletionTimestamp) {
      return 'Terminating';
    }

    // not running
    if (pod.status.phase !== 'Running') {
      return pod.status.phase;
    }

    let ready = false;
    let notReadyReason = '';
    for (const c of pod.status.conditions) {
      if (c.type === 'Ready') {
        ready = c.status === 'True';
        notReadyReason = c.reason;
      }
    }

    if (pod.status.reason) {
      return pod.status.reason;
    }

    if (notReadyReason) {
      return notReadyReason;
    }

    if (ready) {
      return 'Running';
    }

    // Unknown?
    return 'Unknown';
  }
}

