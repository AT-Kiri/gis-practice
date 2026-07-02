<template>
  <div class="coord-response-page">
    <div class="page-scroll">
      <div class="container split-layout">
        <div class="form-section" :style="{ height: formSectionHeight + 'px' }">
          <a-card class="form-card" bordered>
            <h2>协同处置录入</h2>
            <a-form :model="form" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="处置记录编号">
                    <a-input v-model:value="form.response_id" placeholder="RESP-20260629-001" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="预警编号">
                    <a-input v-model:value="form.warn_id" placeholder="WARN-20260629-01" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="联动区域">
                    <a-input v-model:value="form.union_area" placeholder="京津冀" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="责任人">
                    <a-input v-model:value="form.duty_user" placeholder="张强" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="联系电话">
                    <a-input v-model:value="form.contact_phone" placeholder="13912345678" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="叫应方式">
                    <a-select v-model:value="form.call_mode" placeholder="请选择">
                      <a-select-option :value="1">短信</a-select-option>
                      <a-select-option :value="2">电话</a-select-option>
                      <a-select-option :value="3">平台消息</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="应答状态">
                    <a-select v-model:value="form.response_state" placeholder="请选择">
                      <a-select-option :value="0">未接通</a-select-option>
                      <a-select-option :value="1">已应答</a-select-option>
                      <a-select-option :value="2">已处置</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="处置任务">
                    <a-input v-model:value="form.dispose_task" placeholder="组织跨区域会商" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="联动指令">
                    <a-input v-model:value="form.joint_cmd" placeholder="启动联防机制" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="反馈时间">
                    <a-input v-model:value="form.feedback_time" placeholder="2026-06-29 08:55:00" />
                  </a-form-item>
                </a-col>
              </a-row>

              <div class="form-actions">
                <a-button type="primary" :loading="submitting" @click="addRecord">录入信息</a-button>
                <a-button style="margin-left:8px" @click="resetForm">重置</a-button>
              </div>
            </a-form>
          </a-card>
        </div>

        <div class="resize-tool">
          <span class="tool-label">调整录入区域高度：</span>
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
          <a-card class="section-card" bordered>
            <div class="section-header">
              <h2>协同处置响应表</h2>
            </div>
            <div class="table-scroll-right">
              <a-table
                :columns="columns"
                :data-source="records"
                row-key="response_id"
                :loading="loading"
                :pagination="{ pageSize: 8 }"
                :scroll="{ x: 1500, y: 420 }">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.dataIndex === 'call_mode'">
                    <span>{{ callModeText(record.call_mode) }}</span>
                  </template>
                  <template v-else-if="column.dataIndex === 'response_state'">
                    <a-tag :color="statusColor(record.response_state)">{{ statusText(record.response_state) }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'actions'">
                    <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                    <a-button type="link" size="small" danger @click="confirmDelete(record)">删除</a-button>
                  </template>
                  <template v-else>
                    {{ record[column.dataIndex] }}
                  </template>
                </template>
              </a-table>
            </div>
          </a-card>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal v-model:open="editModalVisible" title="编辑协同处置记录" @ok="submitEdit" :confirm-loading="submitting">
      <a-form :model="editingRecord" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="处置记录编号">
              <a-input v-model:value="editingRecord.response_id" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="预警编号">
              <a-input v-model:value="editingRecord.warn_id" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="联动区域">
              <a-input v-model:value="editingRecord.union_area" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="责任人">
              <a-input v-model:value="editingRecord.duty_user" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="联系电话">
              <a-input v-model:value="editingRecord.contact_phone" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="叫应方式">
              <a-select v-model:value="editingRecord.call_mode">
                <a-select-option :value="1">短信</a-select-option>
                <a-select-option :value="2">电话</a-select-option>
                <a-select-option :value="3">平台消息</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="应答状态">
          <a-select v-model:value="editingRecord.response_state">
            <a-select-option :value="0">未接通</a-select-option>
            <a-select-option :value="1">已应答</a-select-option>
            <a-select-option :value="2">已处置</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="处置任务">
          <a-input v-model:value="editingRecord.dispose_task" />
        </a-form-item>
        <a-form-item label="联动指令">
          <a-input v-model:value="editingRecord.joint_cmd" />
        </a-form-item>
        <a-form-item label="反馈时间">
          <a-input v-model:value="editingRecord.feedback_time" placeholder="2026-06-29 08:55:00" />
        </a-form-item>
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
const formSectionHeight = ref(280)
const minFormHeight = 220
const maxFormHeight = 520

const form = ref({
  response_id: '',
  warn_id: '',
  union_area: '',
  duty_user: '',
  contact_phone: '',
  call_mode: 1,
  response_state: 0,
  dispose_task: '',
  joint_cmd: '',
  feedback_time: '',
})

const editModalVisible = ref(false)
const editingRecord = ref({})

const columns = [
  { title: '处置记录编号', dataIndex: 'response_id', key: 'response_id' },
  { title: '预警编号', dataIndex: 'warn_id', key: 'warn_id' },
  { title: '联动区域', dataIndex: 'union_area', key: 'union_area' },
  { title: '责任人', dataIndex: 'duty_user', key: 'duty_user' },
  { title: '联系电话', dataIndex: 'contact_phone', key: 'contact_phone' },
  { title: '叫应方式', dataIndex: 'call_mode', key: 'call_mode' },
  { title: '应答状态', dataIndex: 'response_state', key: 'response_state' },
  { title: '处置任务', dataIndex: 'dispose_task', key: 'dispose_task', ellipsis: true },
  { title: '联动指令', dataIndex: 'joint_cmd', key: 'joint_cmd', ellipsis: true },
  { title: '反馈时间', dataIndex: 'feedback_time', key: 'feedback_time' },
  { title: '操作', dataIndex: 'actions', key: 'actions', fixed: 'right', width: 140 },
]

function callModeText(value) {
  return value === 1 ? '短信' : value === 2 ? '电话' : '平台消息'
}

function statusText(value) {
  return value === 0 ? '未接通' : value === 1 ? '已应答' : '已处置'
}

function statusColor(value) {
  return value === 0 ? 'default' : value === 1 ? 'processing' : 'success'
}

function changeHeight(delta) {
  formSectionHeight.value = Math.min(Math.max(formSectionHeight.value + delta, minFormHeight), maxFormHeight)
}

function resetForm() {
  form.value = {
    response_id: '', warn_id: '', union_area: '', duty_user: '', contact_phone: '', call_mode: 1,
    response_state: 0, dispose_task: '', joint_cmd: '', feedback_time: '',
  }
}

// 加载列表（GET /api/coord-response）
async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/coord-response')
    records.value = res.data || []
  } finally {
    loading.value = false
  }
}

// 新增（POST /api/coord-response）
async function addRecord() {
  if (!form.value.response_id) {
    form.value.response_id = `RESP-${Date.now().toString().slice(-6)}`
  }
  submitting.value = true
  try {
    await request.post('/coord-response', form.value)
    message.success('协同处置记录已录入')
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

// 提交编辑（PUT /api/coord-response/{responseId}）
async function submitEdit() {
  submitting.value = true
  try {
    await request.put(`/coord-response/${editingRecord.value.response_id}`, editingRecord.value)
    message.success('已更新')
    editModalVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

// 删除二次确认（DELETE /api/coord-response/{responseId}）
function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除处置记录 ${record.response_id} 吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await request.delete(`/coord-response/${record.response_id}`)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(loadList)
</script>

<style scoped>
.coord-response-page {
  padding: 20px;
  background: #f3f6fb;
  min-height: 100%;
}
.page-scroll {
  max-width: 1380px;
  margin: 0 auto;
  padding-bottom: 20px;
}
.container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.split-layout {
  width: 100%;
}
.form-section {
  min-height: 220px;
}
.table-section {
  width: 100%;
}
.form-card, .section-card {
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 12px;
  padding: 18px;
}
.form-card h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #0f172a;
}
.form-actions {
  text-align: right;
  margin-top: 10px;
}
.resize-tool {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
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
.section-header {
  margin-bottom: 16px;
}
.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
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
</style>
