import { HttpParams } from '@angular/common/http';
import { PageState } from '../../page/page-state';
import { isNotEmpty } from '../../utils';

/**
 * 列表查询参数拼装 —— 全站唯一实现
 * ------------------------------------------------------------------
 * 重构前，45 个 client 方法各自内联了同一套「分页 + 过滤 + 排序」拼装逻辑，
 * 归一化后共 33 种变体。逐条比对后确认：所有差异都落在下面 5 个轴上，
 * 因此可以收敛成一个参数化函数，而不改变任何一次请求。
 *
 * 各轴与原始实现的对应关系（括号内为原始写法）：
 *   literals             —— 分页之后、动态参数之前写入的固定/调用方求值参数
 *                           （如 set('deleted', deleted)、set('relate', 'all')、set('sortby', '-id')）
 *   dynamicSource        —— 动态参数取自 pageState.params（默认）还是 pageState.filters
 *                           （auditlog 的 listPage 取的是 filters）
 *   exactFilterKeys      —— filter 串中按 `key=value` 拼接的键，其余用 `key__contains=value`
 *                           （多数为 ['deleted','id']，config/customlink/roadmap 为 ['id']）
 *   exactFilterSuffixes  —— 额外按后缀判定精确匹配（app.listPage 支持 `key__exact`）
 *   excludeSortby        —— 命中这些字段时不覆盖 sortby
 *                           （deployment 等排除 'app.name'，app-user 排除 'app.name' 与 'user.name'）
 *   trailingLiterals     —— 排序处理之后追加的字面量（customlink/roadmap 尾部补 deleted='false'）
 *
 * 注意：本函数**不**负责 appId/namespaceId 之类的默认值兜底
 * （原始实现里 `if ((typeof(appId) === 'undefined') || (!appId)) { appId = '0'; }`
 *  这类语句只影响 URL 路径段的拼接，属于调用方职责），
 * 也不负责 URL 本身 —— URL 由各 service 方法自行拼接，保持原样。
 */

/** 字面量参数对。值允许为 undefined，以保真原始 `params.set('deleted', deleted)` 的行为。 */
export type ListParamPair = [string, any];

export interface ListParamsOptions {
  /** 分页参数之后、动态参数之前写入的参数，按数组顺序 set */
  literals?: ListParamPair[];
  /** 排序处理之后写入的参数，按数组顺序 set */
  trailingLiterals?: ListParamPair[];
  /** 动态参数来源，默认 'params' */
  dynamicSource?: 'params' | 'filters';
  /** filter 串中按精确匹配拼接的 key，默认 ['deleted', 'id'] */
  exactFilterKeys?: string[];
  /** filter 串中额外按后缀判定精确匹配的规则，默认无 */
  exactFilterSuffixes?: string[];
  /** 命中这些字段时不覆盖 sortby，默认无 */
  excludeSortby?: string[];
  /** 跳过动态参数透传（notification.query 等只拼字面量的实现） */
  omitDynamicParams?: boolean;
  /** 跳过 filter 串拼装 */
  omitFilters?: boolean;
  /** 跳过排序覆盖 */
  omitSortOverride?: boolean;
}

const DEFAULT_EXACT_FILTER_KEYS = ['deleted', 'id'];

export function buildListParams(pageState: PageState, options: ListParamsOptions = {}): HttpParams {
  let params = new HttpParams();

  // 1. 分页
  params = params.set('pageNo', pageState.page.pageNo + '');
  params = params.set('pageSize', pageState.page.pageSize + '');

  // 2. 调用方指定的前置参数
  const literals = options.literals || [];
  for (let i = 0; i < literals.length; i++) {
    params = params.set(literals[i][0], literals[i][1]);
  }

  // 3. 动态参数透传
  if (!options.omitDynamicParams) {
    const source: any = options.dynamicSource === 'filters' ? pageState.filters : pageState.params;
    Object.getOwnPropertyNames(source).map(key => {
      const value = source[key];
      if (isNotEmpty(value)) {
        params = params.set(key, value);
      }
    });
  }

  // 4. 过滤条件串
  if (!options.omitFilters) {
    const exactKeys = options.exactFilterKeys || DEFAULT_EXACT_FILTER_KEYS;
    const exactSuffixes = options.exactFilterSuffixes || [];
    const filterList: Array<string> = [];
    Object.getOwnPropertyNames(pageState.filters).map(key => {
      const value: any = (pageState.filters as any)[key];
      if (isNotEmpty(value)) {
        const isExact = exactKeys.indexOf(key) > -1
          || exactSuffixes.some(suffix => key.endsWith(suffix));
        filterList.push(isExact ? `${key}=${value}` : `${key}__contains=${value}`);
      }
    });
    if (filterList.length) {
      params = params.set('filter', filterList.join(','));
    }
  }

  // 5. 排序覆盖
  if (!options.omitSortOverride) {
    const excludeSortby = options.excludeSortby || [];
    if (Object.keys(pageState.sort).length !== 0 && excludeSortby.indexOf(pageState.sort.by) < 0) {
      const sortType: any = pageState.sort.reverse ? `-${pageState.sort.by}` : pageState.sort.by;
      params = params.set('sortby', sortType);
    }
  }

  // 6. 调用方指定的尾部参数
  const trailing = options.trailingLiterals || [];
  for (let i = 0; i < trailing.length; i++) {
    params = params.set(trailing[i][0], trailing[i][1]);
  }

  return params;
}
