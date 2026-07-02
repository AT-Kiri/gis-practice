<template>
  <!-- 左侧导航侧栏：以图标按钮形式提供各功能模块的入口 -->
  <div class="nav-sidebar">
    <!-- Logo / 品牌标识 -->
    <div class="nav-brand">
      <div class="brand-icon">
        <SafetyOutlined />
      </div>
      <div class="brand-text">
        <span class="brand-title">防灾应急</span>
        <span class="brand-sub">管理平台</span>
      </div>
    </div>

    <div class="nav-divider" />

    <!-- 菜单项列表 -->
    <div class="nav-menu">
      <div
        v-for="(item, index) in menuItems"
        :key="item.key"
      >
        <div
          v-if="item.group === 'database' && (index === 0 || menuItems[index - 1].group !== 'database')"
          class="nav-group-title"
        >
          数据库
        </div>
        <div
          class="nav-item"
          :class="{ 'nav-item--active': activeKey === item.key }"
          @click="toggleItem(item.key)"
        >
          <a-tooltip :title="item.label" placement="right">
            <div class="nav-item-inner">
              <component :is="item.icon" class="nav-item-icon" />
            </div>
          </a-tooltip>
          <span class="nav-item-label">{{ item.label }}</span>
        </div>
      </div>

      <!-- 弹性间距 -->
      <div class="nav-spacer" />

      <!-- 收起侧栏按钮 -->
      <div class="nav-item nav-item--bottom" @click="$emit('toggleCollapse')">
        <a-tooltip title="收起侧栏" placement="right">
          <div class="nav-item-inner">
            <MenuFoldOutlined v-if="!collapsed" class="nav-item-icon" />
            <MenuUnfoldOutlined v-else class="nav-item-icon" />
          </div>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { SafetyOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import {
  ToolOutlined, SearchOutlined, FileSearchOutlined,
  LineOutlined, AppstoreOutlined, EyeOutlined, ApiOutlined, NodeIndexOutlined, InboxOutlined,
  BranchesOutlined, CloudOutlined,
} from '@ant-design/icons-vue'

const props = defineProps({
  /** 当前激活的菜单项 key */
  activeKey: { type: String, default: null },
  /** 侧栏是否折叠 */
  collapsed: { type: Boolean, default: false },
})

const emit = defineEmits(['update:activeKey', 'toggleCollapse'])

/** 菜单项配置：key 对应功能标识，label 为展示名称，icon 为对应图标组件 */
const menuItems = [
  { key: 'map-tools', label: '地图工具', icon: ToolOutlined },
  { key: 'spatial-query', label: '空间查询', icon: SearchOutlined },
  { key: 'thematic-search', label: '专题检索', icon: FileSearchOutlined },
  { key: 'spatial-analysis', label: '空间分析', icon: ApiOutlined },
  { key: 'network-analysis', label: '网络分析', icon: NodeIndexOutlined },
  { key: 'measure', label: '量算工具', icon: LineOutlined },
  { key: 'layer-manager', label: '图层管理', icon: AppstoreOutlined },
  { key: 'overview', label: '鹰眼视图', icon: EyeOutlined },
  { key: 'coord-response', label: '协同处置', icon: BranchesOutlined, group: 'database' },
  { key: 'warn-info', label: '预警主表', icon: CloudOutlined, group: 'database' },
  { key: 'supply-dispatch', label: '物资调度', icon: InboxOutlined, group: 'database' },
]

/**
 * 切换菜单项：点击已激活的项则关闭，否则激活新项
 * 图层管理器特殊处理：通过 v-model:visible 控制显隐，不占用 activeKey
 */
function toggleItem(key) {
  emit('update:activeKey', props.activeKey === key ? null : key)
}
</script>

<style scoped>
.nav-sidebar {
  width: 64px;
  height: 100%;
  background: var(--color-bg-sidebar);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  flex-shrink: 0;
  z-index: 30;
  border-right: 1px solid rgba(255, 255, 255, 0.04);
  user-select: none;
}

/* ---- 品牌标识区 ---- */
.nav-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 12px;
  gap: 6px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #0050b3 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.35);
  transition: transform var(--transition-base);
}

.nav-brand:hover .brand-icon {
  transform: scale(1.05);
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.brand-title {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-on-dark);
  letter-spacing: 1px;
  line-height: 1.2;
}

.brand-sub {
  font-size: 8px;
  color: var(--color-text-on-dark-muted);
  letter-spacing: 0.5px;
}

/* ---- 分割线 ---- */
.nav-divider {
  width: 32px;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 4px 0 8px;
}

/* ---- 菜单项 ---- */
.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  padding: 0 8px;
  overflow-y: auto;
}

.nav-spacer {
  flex: 1;
}

.nav-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  border-radius: 8px;
  transition: all var(--transition-base);
  position: relative;
  padding: 4px 0;
}

.nav-item-inner {
  width: 44px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all var(--transition-base);
  color: var(--color-text-on-dark-muted);
}

.nav-item:hover .nav-item-inner {
  background: rgba(255, 255, 255, 0.08);
  color: var(--color-text-on-dark);
}

.nav-item--active .nav-item-inner {
  background: rgba(24, 144, 255, 0.15);
  color: var(--color-primary);
  box-shadow: inset 0 0 0 1px rgba(24, 144, 255, 0.2);
}

.nav-item--active .nav-item-icon {
  color: var(--color-primary);
}

.nav-item-label {
  font-size: 9px;
  color: var(--color-text-on-dark-muted);
  margin-top: 1px;
  line-height: 1;
  transition: color var(--transition-fast);
}

.nav-item--active .nav-item-label {
  color: var(--color-primary);
}

.nav-item:hover .nav-item-label {
  color: var(--color-text-on-dark);
}

.nav-item-icon {
  font-size: 18px;
  transition: transform var(--transition-base);
}

.nav-item:hover .nav-item-icon {
  transform: scale(1.1);
}

.nav-item--bottom {
  margin-top: auto;
  padding-bottom: 8px;
}

/* 数据库分组标题 */
.nav-group-title {
  width: 100%;
  margin: 12px 0 6px;
  padding: 0 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  text-align: center;
  letter-spacing: 0.5px;
}
</style>
