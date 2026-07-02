<template>
  <div class="warn-info-page">
    <div class="page-scroll">
      <div class="container split-layout">
        <div class="form-section" :style="{ height: formSectionHeight + 'px' }">
          <a-card class="form-card" bordered>
            <h2>预警信息录入</h2>
            <a-form :model="form" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="预警编号">
                    <a-input v-model:value="form.warn_id" placeholder="WARN-20260629-01" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="区域编码">
                    <a-input v-model:value="form.district_code" placeholder="京" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="灾害类型">
                    <a-select v-model:value="form.disaster_type" placeholder="请选择">
                      <a-select-option :value="1">暴雨</a-select-option>
                      <a-select-option :value="2">大风</a-select-option>
                      <a-select-option :value="3">沙尘</a-select-option>
                      <a-select-option :value="4">强对流</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="预警等级">
                    <a-select v-model:value="form.warn_level" placeholder="请选择">
                      <a-select-option :value="1">蓝</a-select-option>
                      <a-select-option :value="2">黄</a-select-option>
                      <a-select-option :value="3">橙</a-select-option>
                      <a-select-option :value="4">红</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="实时气象">
                    <a-input v-model:value="form.real_meteor_data" placeholder="降雨120mm/h、风速13m/s" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="风险分值">
                    <a-input-number v-model:value="form.risk_score" :min="0" :max="10" style="width:100%" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="发布时间">
                    <a-input v-model:value="form.release_time" placeholder="2026-06-29 07:30:00" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="失效时间">
                    <a-input v-model:value="form.valid_end_time" placeholder="2026-06-29 12:00:00" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="推送状态">
                    <a-select v-model:value="form.push_status" placeholder="请选择">
                      <a-select-option :value="0">未推送</a-select-option>
                      <a-select-option :value="1">已推送</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="24">
                  <a-form-item label="研判内容">
                    <a-input v-model:value="form.warn_content" placeholder="京津冀部分地区将出现强对流和暴雨" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="发布责任人">
                    <a-input v-model:value="form.create_user" placeholder="user_zhang" />
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
              <h2>气象灾害预警主表</h2>
            </div>
            <div class="table-scroll-right">
              <a-table
                :columns="columns"
                :data-source="records"
                row-key="warn_id"
                :loading="loading"
                :pagination="{ pageSize: 8 }"
                :scroll="{ x: 1500, y: 420 }">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.dataIndex === 'disaster_type'">
                    <span>{{ disasterTypeText(record.disaster_type) }}</span>
                  </template>
                  <template v-else-if="column.dataIndex === 'warn_level'">
                    <a-tag :color="warnLevelColor(record.warn_level)">{{ warnLevelText(record.warn_level) }}</a-tag>
                  </template>
                  <template v-else-if="column.dataIndex === 'push_status'">
                    <span>{{ record.push_status === 1 ? '已推送' : '未推送' }}</span>
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

    <!-- 编辑弹窗：复用录入表单字段 -->
    <a-modal v-model:open="editModalVisible" title="编辑预警记录" @ok="submitEdit" :confirm-loading="submitting">
      <a-form :model="editingRecord" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="预警编号">
              <a-input v-model:value="editingRecord.warn_id" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="区域编码">
              <a-input v-model:value="editingRecord.district_code" placeholder="京" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="灾害类型">
              <a-select v-model:value="editingRecord.disaster_type">
                <a-select-option :value="1">暴雨</a-select-option>
                <a-select-option :value="2">大风</a-select-option>
                <a-select-option :value="3">沙尘</a-select-option>
                <a-select-option :value="4">强对流</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="预警等级">
              <a-select v-model:value="editingRecord.warn_level">
                <a-select-option :value="1">蓝</a-select-option>
                <a-select-option :value="2">黄</a-select-option>
                <a-select-option :value="3">橙</a-select-option>
                <a-select-option :value="4">红</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="实时气象">
          <a-input v-model:value="editingRecord.real_meteor_data" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="风险分值">
              <a-input-number v-model:value="editingRecord.risk_score" :min="0" :max="10" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="推送状态">
              <a-select v-model:value="editingRecord.push_status">
                <a-select-option :value="0">未推送</a-select-option>
                <a-select-option :value="1">已推送</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="发布时间">
              <a-input v-model:value="editingRecord.release_time" placeholder="2026-06-29 07:30:00" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="失效时间">
              <a-input v-model:value="editingRecord.valid_end_time" placeholder="2026-06-29 12:00:00" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="研判内容">
          <a-input v-model:value="editingRecord.warn_content" />
        </a-form-item>
        <a-form-item label="发布责任人">
          <a-input v-model:value="editingRecord.create_user" />
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
  warn_id: '',
  district_code: '',
  disaster_type: 1,
  warn_level: 1,
  real_meteor_data: '',
  risk_score: 0,
  release_time: '',
  valid_end_time: '',
  warn_content: '',
  push_status: 1,
  create_user: '',
})

// 编辑弹窗状态
const editModalVisible = ref(false)
const editingRecord = ref({})

const columns = [
  { title: '预警编号', dataIndex: 'warn_id', key: 'warn_id' },
  { title: '区域编码', dataIndex: 'district_code', key: 'district_code' },
  { title: '灾害类型', dataIndex: 'disaster_type', key: 'disaster_type' },
  { title: '预警等级', dataIndex: 'warn_level', key: 'warn_level' },
  { title: '实时气象', dataIndex: 'real_meteor_data', key: 'real_meteor_data' },
  { title: '风险分值', dataIndex: 'risk_score', key: 'risk_score' },
  { title: '发布时间', dataIndex: 'release_time', key: 'release_time' },
  { title: '失效时间', dataIndex: 'valid_end_time', key: 'valid_end_time' },
  { title: '研判内容', dataIndex: 'warn_content', key: 'warn_content', ellipsis: true },
  { title: '推送状态', dataIndex: 'push_status', key: 'push_status' },
  { title: '发布责任人', dataIndex: 'create_user', key: 'create_user' },
  { title: '操作', dataIndex: 'actions', key: 'actions', fixed: 'right', width: 140 },
]

function disasterTypeText(value) {
  return value === 1 ? '暴雨' : value === 2 ? '大风' : value === 3 ? '沙尘' : '强对流'
}

function warnLevelText(value) {
  return value === 1 ? '蓝' : value === 2 ? '黄' : value === 3 ? '橙' : '红'
}

function warnLevelColor(value) {
  return value === 1 ? 'processing' : value === 2 ? 'warning' : value === 3 ? 'orange' : 'red'
}

function changeHeight(delta) {
  formSectionHeight.value = Math.min(Math.max(formSectionHeight.value + delta, minFormHeight), maxFormHeight)
}

function resetForm() {
  form.value = {
    warn_id: '', district_code: '', disaster_type: 1, warn_level: 1,
    real_meteor_data: '', risk_score: 0, release_time: '', valid_end_time: '',
    warn_content: '', push_status: 1, create_user: '',
  }
}

// 加载列表（GET /api/warn-info）
async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/warn-info')
    records.value = res.data || []
  } finally {
    loading.value = false
  }
}

// 新增（POST /api/warn-info）
async function addRecord() {
  if (!form.value.warn_id) {
    form.value.warn_id = `WARN-${Date.now().toString().slice(-6)}`
  }
  submitting.value = true
  try {
    await request.post('/warn-info', form.value)
    message.success('预警信息已录入')
    resetForm()
    await loadList()
  } finally {
    submitting.value = false
  }
}

// 打开编辑弹窗
function openEdit(record) {
  editingRecord.value = { ...record }
  editModalVisible.value = true
}

// 提交编辑（PUT /api/warn-info/{warnId}）
async function submitEdit() {
  submitting.value = true
  try {
    await request.put(`/warn-info/${editingRecord.value.warn_id}`, editingRecord.value)
    message.success('已更新')
    editModalVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

// 删除二次确认（DELETE /api/warn-info/{warnId}）
function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除预警记录 ${record.warn_id} 吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      await request.delete(`/warn-info/${record.warn_id}`)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(loadList)
</script>

<style scoped>
.warn-info-page {
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
