<template>
  <div class="supply-page">
    <div class="page-scroll">
      <div ref="containerRef" class="container split-layout">
        <div class="form-section" :style="{ height: formSectionHeight + 'px' }">
        <a-card class="form-card" bordered>
          <h2>录入调度</h2>
          <a-form :model="form" layout="vertical">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="调度单号">
                <a-input v-model:value="form.dispatch_id" placeholder="DSP-20260629-005" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="预警编号">
                <a-input v-model:value="form.warn_id" placeholder="WARN-20260629-05" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="储备库位置">
                <a-input v-model:value="form.storage_addr" placeholder="北京市朝阳区应急储备库（116.46,39.92）" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="6">
              <a-form-item label="物资类型">
                <a-select v-model:value="form.supply_type" placeholder="请选择">
                  <a-select-option value="排水">排水</a-select-option>
                  <a-select-option value="救生">救生</a-select-option>
                  <a-select-option value="医疗">医疗</a-select-option>
                  <a-select-option value="食品">食品</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="数量">
                <a-input-number v-model:value="form.supply_num" :min="1" style="width:100%" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="需求区域">
                <a-input v-model:value="form.demand_area" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="里程(km)">
                <a-input-number v-model:value="form.distance" :min="0" style="width:100%" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="出库时间">
                <a-input v-model:value="form.depart_time" placeholder="2026-06-29 08:10" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="预计到达">
                <a-input v-model:value="form.plan_arrive" placeholder="2026-06-29 10:20" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="运输队伍 / 状态">
                <a-input v-model:value="form.transport_team" placeholder="应急运输一队" style="margin-bottom:8px" />
                <a-select v-model:value="form.dispatch_state" style="width:100%">
                  <a-select-option :value="0">待出库</a-select-option>
                  <a-select-option :value="1">运输中</a-select-option>
                  <a-select-option :value="2">已送达</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <div style="text-align:right; margin-top:12px">
            <a-button type="primary" :loading="submitting" @click="addRecord">录入调度</a-button>
            <a-button style="margin-left:8px" @click="resetForm">重置</a-button>
          </div>
        </a-form>
        </a-card>
      </div>

      <div class="resize-tool">
        <span class="tool-label">调节“录入调度”区域高度：</span>
        <a-button type="text" @click="changeHeight(-20)">-20</a-button>
        <a-button type="text" @click="changeHeight(20)">+20</a-button>
        <a-slider
          class="resize-slider"
          :min="minFormHeight"
          :max="maxFormHeight"
          v-model:value="formSectionHeight"
          tooltip-visible
        />
        <span class="tool-value">{{ formSectionHeight }}px</span>
      </div>

        <div class="table-section">
        <a-card class="table-card" bordered>
          <h3>调度列表</h3>
          <div class="table-scroll-right">
          <a-table
            :columns="columns"
            :data-source="records"
            row-key="dispatch_id"
            :loading="loading"
            :pagination="{ pageSize: 6 }"
            :scroll="{ x: 1500, y: 380 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'dispatch_state'">
                <a-tag :color="getStatusColor(record.dispatch_state)">{{ getStatusText(record.dispatch_state) }}</a-tag>
              </template>
              <template v-else-if="column.dataIndex === 'distance'">
                {{ record.distance }} km
              </template>
              <template v-else-if="column.dataIndex === 'actions'">
                <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                <a-button type="link" size="small" danger @click="confirmDelete(record)">删除</a-button>
              </template>
            </template>
          </a-table>
          </div>
        </a-card>
      </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal v-model:open="editModalVisible" title="编辑调度记录" @ok="submitEdit" :confirm-loading="submitting" width="720px">
      <a-form :model="editingRecord" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="调度单号">
              <a-input v-model:value="editingRecord.dispatch_id" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="预警编号">
              <a-input v-model:value="editingRecord.warn_id" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="储备库位置">
          <a-input v-model:value="editingRecord.storage_addr" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="物资类型">
              <a-select v-model:value="editingRecord.supply_type">
                <a-select-option value="排水">排水</a-select-option>
                <a-select-option value="救生">救生</a-select-option>
                <a-select-option value="医疗">医疗</a-select-option>
                <a-select-option value="食品">食品</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数量">
              <a-input-number v-model:value="editingRecord.supply_num" :min="1" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="里程(km)">
              <a-input-number v-model:value="editingRecord.distance" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="需求区域">
          <a-input v-model:value="editingRecord.demand_area" />
        </a-form-item>
        <a-form-item label="配送路径">
          <a-input v-model:value="editingRecord.transport_route" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="出库时间">
              <a-input v-model:value="editingRecord.depart_time" placeholder="2026-06-29 08:10:00" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="预计到达">
              <a-input v-model:value="editingRecord.plan_arrive" placeholder="2026-06-29 10:20:00" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="运输队伍">
              <a-input v-model:value="editingRecord.transport_team" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="调度状态">
              <a-select v-model:value="editingRecord.dispatch_state">
                <a-select-option :value="0">待出库</a-select-option>
                <a-select-option :value="1">运输中</a-select-option>
                <a-select-option :value="2">已送达</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { request } from '@/utils/request'

const records = ref([])
const loading = ref(false)
const submitting = ref(false)
const formSectionHeight = ref(260)
const minFormHeight = 180
const maxFormHeight = 520

function changeHeight(delta) {
  formSectionHeight.value = Math.min(Math.max(formSectionHeight.value + delta, minFormHeight), maxFormHeight)
}

const form = ref({
  dispatch_id: '',
  warn_id: '',
  storage_addr: '',
  supply_type: '',
  supply_num: 1,
  demand_area: '',
  transport_route: '',
  distance: 0,
  depart_time: '',
  plan_arrive: '',
  transport_team: '',
  dispatch_state: 0,
})

const editModalVisible = ref(false)
const editingRecord = ref({})

const columns = [
  { title: '调度单号', dataIndex: 'dispatch_id', key: 'dispatch_id' },
  { title: '预警编号', dataIndex: 'warn_id', key: 'warn_id' },
  { title: '储备位置', dataIndex: 'storage_addr', key: 'storage_addr', ellipsis: true },
  { title: '物资类型', dataIndex: 'supply_type', key: 'supply_type' },
  { title: '数量', dataIndex: 'supply_num', key: 'supply_num' },
  { title: '需求区域', dataIndex: 'demand_area', key: 'demand_area' },
  { title: '里程', dataIndex: 'distance', key: 'distance' },
  { title: '出库时间', dataIndex: 'depart_time', key: 'depart_time' },
  { title: '预计到达', dataIndex: 'plan_arrive', key: 'plan_arrive' },
  { title: '运输队伍', dataIndex: 'transport_team', key: 'transport_team' },
  { title: '状态', dataIndex: 'dispatch_state', key: 'dispatch_state' },
  { title: '操作', dataIndex: 'actions', key: 'actions', fixed: 'right', width: 140 },
]

function getStatusText(state) {
  return state === 0 ? '待出库' : state === 1 ? '运输中' : '已送达'
}

function getStatusColor(state) {
  return state === 0 ? 'default' : state === 1 ? 'processing' : 'success'
}

function resetForm() {
  form.value = {
    dispatch_id: '', warn_id: '', storage_addr: '', supply_type: '', supply_num: 1,
    demand_area: '', transport_route: '', distance: 0, depart_time: '', plan_arrive: '', transport_team: '', dispatch_state: 0,
  }
}

// 加载列表（GET /api/supply-dispatch）
async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/supply-dispatch')
    records.value = res.data || []
  } finally {
    loading.value = false
  }
}

// 新增（POST /api/supply-dispatch）
async function addRecord() {
  if (!form.value.dispatch_id) {
    form.value.dispatch_id = `DSP-${Date.now().toString().slice(-6)}`
  }
  submitting.value = true
  try {
    await request.post('/supply-dispatch', form.value)
    message.success('调度记录已录入')
    resetForm()
    await loadList()
  } finally {
    submitting.value = false
  }
}

function openEdit(record) {
  editingRecord.value = { ...record }
  editModalVisible.value = true
}

// 提交编辑（PUT /api/supply-dispatch/{dispatchId}）
async function submitEdit() {
  submitting.value = true
  try {
    await request.put(`/supply-dispatch/${editingRecord.value.dispatch_id}`, editingRecord.value)
    message.success('已更新')
    editModalVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

// 删除二次确认（DELETE /api/supply-dispatch/{dispatchId}）
function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除调度记录 ${record.dispatch_id} 吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await request.delete(`/supply-dispatch/${record.dispatch_id}`)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(loadList)
</script>

<style scoped>
.supply-page {
  padding: 12px 24px 24px;
  background: #f3f6fb;
  min-height: 100vh;
  color: #0f172a;
}
.page-scroll {
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
}
.container {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px);
  gap: 18px;
}
.split-layout {
  height: 100%;
}
.form-section {
  flex: 0 0 auto;
}
.table-section {
  flex: 1 1 auto;
}

.resize-tool {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 0;
}

.tool-label {
  color: rgba(15, 23, 42, 0.75);
  font-size: 13px;
}

.resize-slider {
  width: 280px;
}

.tool-value {
  color: rgba(15, 23, 42, 0.75);
  min-width: 72px;
  text-align: right;
}

.form-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.04);
  border-radius: 10px;
  padding: 18px;
  height: 100%;
}
.form-card h2 {
  margin: 0 0 12px 0;
  color: #0f172a;
}
.table-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.04);
  border-radius: 10px;
  margin-top: 18px;
  padding: 12px;
}
.ant-table {
  background: transparent;
}
.ant-table-thead > tr > th {
  background: #fafafa;
  color: rgba(15, 23, 42, 0.8);
  font-weight: 600;
}
.ant-table-tbody > tr > td {
  color: rgba(15, 23, 42, 0.9);
}
.ant-input, .ant-select-selector, .ant-input-number {
  background: #fff;
  color: #111827;
}

/* 滚动容器样式 */
.page-scroll {
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 10px;
}

/* 美化 WebKit 浏览器滚动条 */
.page-scroll::-webkit-scrollbar {
  width: 10px;
}
.page-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.page-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(15,23,42,0.12);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
}

/* Firefox 滚动条样式 */
.page-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(15,23,42,0.12) transparent;
}

/* 右侧表格滚动区域 */
.table-scroll-right {
  max-height: calc(60vh - 80px);
  overflow-y: auto;
  overflow-x: auto;
  padding-right: 8px;
  border-radius: 8px;
  background: transparent;
  min-width: 1200px;
}
.table-scroll-right::-webkit-scrollbar {
  width: 10px;
}
.table-scroll-right::-webkit-scrollbar-track {
  background: transparent;
}
.table-scroll-right::-webkit-scrollbar-thumb {
  background-color: rgba(15,23,42,0.12);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.table-scroll-right {
  scrollbar-width: thin;
  scrollbar-color: rgba(15,23,42,0.12) transparent;
}
</style>
