// tslint:disable:max-line-length
/**
 * 一共有3种类型
 * type SideNavType.NormalLink 不展开跳转链接
 * type SideNavType.GroupLink 存在展开的跳转
 * type SideNavType.Divider 分割线
 * 注意一点 link 必须统一不加 admin 前缀
 */
enum SideNavType {
  NormalLink, GroupLink, Divider
}

const SideNavCollapseStorage = 'nav-collapse';

const adminSideNav: any[] = [
  { type: SideNavType.NormalLink, a: { link: 'reportform/overview', title: 'MENU.PLATFORM_OVERVIEW', text: 'MENU.PLATFORM_OVERVIEW', icon: { shape: 'help-info' } } },
  { type: SideNavType.Divider },
  {
    type: SideNavType.GroupLink, icon: { shape: 'world', title: 'Kubernetes', solid: true }, text: 'Kubernetes', child: [
      { a: { link: 'kubernetes/node', text: 'Node', options: {exact: false}, icon: { shape: 'devices', solid: false } } },
      { a: { link: 'kubernetes/namespace', text: 'Namespace', options: {exact: false}, icon: { shape: 'vmw-app', solid: true } } },
      { a: { link: 'kubernetes/customresourcedefinition', text: 'CRD', options: {exact: false}, icon: { shape: 'plugin', solid: true } } },
      { type: SideNavType.Divider },
      { a: { link: 'kubernetes/deployment', text: 'Deployment', options: { exact: false }, icon: { shape: 'event', solid: false } } },
      { a: { link: 'kubernetes/replicaset', text: 'ReplicaSet', options: { exact: false }, icon: { shape: 'box-plot', solid: false } } },
      { a: { link: 'kubernetes/statefulset', text: 'StatefulSet', options: { exact: false }, icon: { shape: 'blocks-group', solid: false } } },
      { a: { link: 'kubernetes/daemonset', text: 'DaemonSet', options: { exact: false }, icon: { shape: 'layers', solid: false } } },
      { a: { link: 'kubernetes/cronjob', text: 'CronJob', options: { exact: false }, icon: { shape: 'clock', solid: false } } },
      { a: { link: 'kubernetes/job', text: 'Job', options: { exact: false }, icon: { shape: 'clock', solid: true } } },
      { a: { link: 'kubernetes/pod', text: 'Pod', options: { exact: false }, icon: { shape: 'tree', solid: true } } },
      { a: { link: 'kubernetes/horizontalpodautoscaler', text: 'HPA.HPA', options: { exact: false }, icon: { shape: 'cloud-scale', solid: false } } },
      { type: SideNavType.Divider },
      { a: { link: 'kubernetes/service', text: 'Service', options: { exact: false }, icon: { shape: 'network-globe', solid: false } } },
      { a: { link: 'kubernetes/endpoint', text: 'Endpoint', options: { exact: false }, icon: { shape: 'tree-view', solid: false } } },
      { a: { link: 'kubernetes/ingress', text: 'Ingress', options: { exact: false }, icon: { shape: 'network-switch', solid: false } } },
      { type: SideNavType.Divider },
      { a: { link: 'kubernetes/configmap', text: 'ConfigMap', options: { exact: false }, icon: { shape: 'file-settings', solid: false } } },
      { a: { link: 'kubernetes/secret', text: 'Secret', options: { exact: false }, icon: { shape: 'certificate', solid: false } } },
      { a: { link: 'kubernetes/persistentvolume', text: 'PersistentVolume', options: { exact: false }, icon: { shape: 'storage', solid: false } } },
      { a: { link: 'kubernetes/persistentvolumeclaim', text: 'MENU.PVC', options: { exact: false }, icon: { shape: 'data-cluster', solid: false } } },
      { a: { link: 'kubernetes/storageclass', text: 'StorageClass', options: { exact: false }, icon: { shape: 'data-cluster', solid: true } } },
      { type: SideNavType.Divider },
      { a: { link: 'kubernetes/event', text: 'Event', options: {exact: false}, icon: { shape: 'event', solid: true } } },
      { type: SideNavType.Divider },
      { a: { link: 'kubernetes/role', text: 'Role', options: {exact: false}, icon: { shape: 'assign-user' } } },
      { a: { link: 'kubernetes/clusterrole', text: 'ClusterRole', options: {exact: false}, icon: { shape: 'assign-user', solid: true } } },
      { a: { link: 'kubernetes/rolebinding', text: 'RoleBinding', options: {exact: false}, icon: { shape: 'administrator', solid: false } } },
      { a: { link: 'kubernetes/clusterrolebinding', text: 'ClusterRoleBinding', options: {exact: false}, icon: { shape: 'administrator', solid: true } } },
      { a: { link: 'kubernetes/serviceaccount', text: 'ServiceAccount', options: { exact: false }, icon: { shape: 'user', solid: false } } },
    ]
  },
  { type: SideNavType.Divider },
  {
    type: SideNavType.GroupLink, icon: { title: 'MENU.CLUSTER', shape: 'cloud-scale' }, text: 'MENU.CLUSTER', child: [
      { a: { link: 'cluster', text: 'MENU.LIST', options: { exact: true } } },
      { a: { link: 'cluster/trash', text: 'MENU.RECYCLED', options: { exact: true } } },
    ]
  },
  { type: SideNavType.Divider },
  {
    type: SideNavType.GroupLink, icon: { title: 'MENU.CONFIGURATION', shape: 'cog' }, text: 'MENU.CONFIGURATION', child: [
      { a: { link: 'config/system', text: 'MENU.SYSTEM_CONFIGURATION', options: { exact: true } } },
      { a: { link: 'k8sgpt', text: 'AI 引擎管理', options: { exact: true }, icon: { shape: 'cpu', solid: false } } },
    ]
  },
  {
    type: SideNavType.GroupLink, icon: { title: 'MENU.PERMISSION', shape: 'users' }, text: 'MENU.PERMISSION', name: 'system', child: [
      { a: { link: 'system/user', text: 'MENU.USER_LIST', options: { exact: true } } },
    ]
  },
];
export { adminSideNav, SideNavType, SideNavCollapseStorage };
