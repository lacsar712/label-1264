<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import {
  ElButton,
  ElCard,
  ElInput,
  ElTag,
  ElEmpty,
  ElDialog,
  ElSelect,
  ElOption,
  ElSkeleton,
  ElScrollbar,
  ElIcon,
} from 'element-plus'
import {
  Plus,
  ChatDotRound,
  ChatLineRound,
  Search,
  Files,
  Promotion,
  Clock,
} from '@element-plus/icons-vue'

import { api } from '../lib/api'
import { useAuth } from '../stores/auth'
import { DEFAULT_AVATAR_COLOR } from '../lib/themeColors'

const { state } = useAuth()

const loading = ref(false)
const availableResources = ref([])
const sessions = ref([])
const currentSession = ref(null)
const messages = ref([])
const recommendedQuestions = ref([])

const inputValue = ref('')
const isSending = ref(false)
const isTyping = ref(false)
const typingMessageId = ref(null)
const typingContent = ref('')

const showResourceDialog = ref(false)
const resourceSearchKeyword = ref('')
const resourceFilterSubject = ref('')

const chatContainerRef = ref(null)

const filteredResources = computed(() => {
  const kw = resourceSearchKeyword.value.trim().toLowerCase()
  return availableResources.value.filter((r) => {
    if (resourceFilterSubject.value && r.subject !== resourceFilterSubject.value) return false
    if (!kw) return true
    return r.name.toLowerCase().includes(kw) || r.code.toLowerCase().includes(kw)
  })
})

async function fetchIndexData() {
  loading.value = true
  try {
    const res = await api.get('/pages/qa')
    if (res.data.ok) {
      availableResources.value = res.data.data.availableResources || []
      sessions.value = res.data.data.sessions || []
    }
  } catch (e) {
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchIndexData()
  if (sessions.value.length > 0) {
    await loadSession(sessions.value[0].id)
  }
})

async function loadSession(sessionId) {
  try {
    const res = await api.get(`/pages/qa/session/${sessionId}`)
    if (res.data.ok) {
      currentSession.value = res.data.data.session
      messages.value = res.data.data.messages || []
      recommendedQuestions.value = res.data.data.recommendedQuestions || []
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
  }
}

async function startNewSession(resourceId) {
  try {
    const res = await api.get(`/pages/qa/resource/${resourceId}`)
    if (res.data.ok) {
      currentSession.value = res.data.data.session
      messages.value = res.data.data.messages || []
      recommendedQuestions.value = res.data.data.recommendedQuestions || []
      showResourceDialog.value = false
      await fetchIndexData()
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
  }
}

function scrollToBottom() {
  if (chatContainerRef.value) {
    const el = chatContainerRef.value
    el.scrollTop = el.scrollHeight
  }
}

function typeText(messageId, fullText, speed = 15) {
  return new Promise((resolve) => {
    isTyping.value = true
    typingMessageId.value = messageId
    typingContent.value = ''
    let i = 0
    const timer = setInterval(() => {
      if (i < fullText.length) {
        typingContent.value += fullText.charAt(i)
        i++
        nextTick(scrollToBottom)
      } else {
        clearInterval(timer)
        isTyping.value = false
        typingMessageId.value = null
        resolve()
      }
    }, speed)
  })
}

async function handleSend(text) {
  const content = (text || inputValue.value).trim()
  if (!content || isSending.value || !currentSession.value) return

  inputValue.value = ''
  isSending.value = true

  const tempUserMsg = {
    id: Date.now(),
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
    _temp: true,
  }
  messages.value.push(tempUserMsg)
  await nextTick()
  scrollToBottom()

  try {
    const res = await api.post(`/actions/qa/session/${currentSession.value.id}/send`, { content })
    if (res.data.ok) {
      messages.value = messages.value.filter((m) => !m._temp)
      messages.value.push(res.data.data.userMessage)

      const assistantMsg = res.data.data.assistantMessage
      const typingMsg = { ...assistantMsg, _typing: true }
      messages.value.push(typingMsg)

      await typeText(assistantMsg.id, assistantMsg.content, Math.max(8, 600 / assistantMsg.content.length))

      const idx = messages.value.findIndex((m) => m.id === assistantMsg.id && m._typing)
      if (idx !== -1) {
        messages.value[idx] = { ...assistantMsg, content: assistantMsg.content }
      }

      recommendedQuestions.value = res.data.data.recommendedQuestions || []
      await fetchIndexData()
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
    messages.value = messages.value.filter((m) => !m._temp)
  } finally {
    isSending.value = false
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleChipClick(question) {
  handleSend(question)
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `${h}:${m}`
  return `${d.getMonth() + 1}/${d.getDate()} ${h}:${m}`
}

function getSubjectColor(subject) {
  const map = {
    语文: '#ef4444',
    数学: '#3b82f6',
    英语: '#8b5cf6',
    物理: '#f59e0b',
    化学: '#10b981',
    生物: '#06b6d4',
  }
  return map[subject] || '#64748b'
}

function getMessageDisplay(msg) {
  if (msg._typing && typingMessageId.value === msg.id) {
    return typingContent.value
  }
  return msg.content
}
</script>

<template>
  <div class="qa-page">
    <div class="qa-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title">
          <el-icon :size="18"><ChatDotRound /></el-icon>
          <span>AI 助教</span>
        </div>
        <ElButton type="primary" size="small" @click="showResourceDialog = true">
          <el-icon style="margin-right: 4px"><Plus /></el-icon>
          新会话
        </ElButton>
      </div>

      <div class="sidebar-section-title">历史会话</div>

      <ElSkeleton :loading="loading" animated :count="5">
        <el-scrollbar class="session-list-scroll">
          <div v-if="!loading && sessions.length === 0" class="empty-sessions">
            <ElEmpty description="还没有会话" :image-size="60" />
          </div>
          <div
            v-for="s in sessions"
            :key="s.id"
            class="session-item"
            :class="{ active: currentSession?.id === s.id }"
            @click="loadSession(s.id)"
          >
            <div class="session-icon">
              <el-icon><ChatLineRound /></el-icon>
            </div>
            <div class="session-info">
              <div class="session-title">{{ s.title }}</div>
              <div class="session-meta">
                <ElTag :color="getSubjectColor(s.subject)" effect="dark" size="small" round>
                  {{ s.subject }}
                </ElTag>
                <span class="session-count">{{ s.messageCount }} 条消息</span>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </ElSkeleton>
    </div>

    <div class="qa-main">
      <div v-if="!currentSession" class="empty-chat">
        <div class="empty-chat-icon">
          <el-icon :size="48"><ChatDotRound /></el-icon>
        </div>
        <div class="empty-chat-title">资源问答助手</div>
        <div class="empty-chat-subtitle">选择一份学习资源，开始与 AI 助教对话吧</div>
        <ElButton type="primary" size="large" @click="showResourceDialog = true">
          <el-icon style="margin-right: 6px"><Files /></el-icon>
          选择资源开始问答
        </ElButton>

        <div v-if="recommendedQuestions.length > 0" class="quick-questions">
          <div class="quick-title">
            <el-icon style="margin-right: 4px"><Promotion /></el-icon>
            试试这些问题
          </div>
          <div class="chip-list">
            <ElTag
              v-for="(q, i) in recommendedQuestions.slice(0, 4)"
              :key="i"
              class="chip-item"
              size="large"
              effect="plain"
              round
              @click="handleChipClick(q)"
            >
              {{ q }}
            </ElTag>
          </div>
        </div>
      </div>

      <template v-else>
        <div class="chat-header">
          <div class="chat-resource-info">
            <div class="resource-icon" :style="{ backgroundColor: getSubjectColor(currentSession.subject) + '20', color: getSubjectColor(currentSession.subject) }">
              <el-icon><Files /></el-icon>
            </div>
            <div>
              <div class="resource-name">{{ currentSession.resourceName }}</div>
              <div class="resource-tags">
                <ElTag size="small" :color="getSubjectColor(currentSession.subject)" effect="dark" round>
                  {{ currentSession.subject }}
                </ElTag>
                <ElTag size="small" type="info" effect="plain" round>
                  {{ currentSession.difficulty }}
                </ElTag>
                <ElTag size="small" type="info" effect="plain" round>
                  {{ currentSession.type }}
                </ElTag>
                <ElTag
                  v-for="(tag, i) in (currentSession.tags || []).slice(0, 3)"
                  :key="i"
                  size="small"
                  effect="plain"
                  round
                  style="background: #eef2ff; color: #6366f1; border: none"
                >
                  {{ tag.name }}
                </ElTag>
              </div>
            </div>
          </div>
          <ElButton size="small" @click="showResourceDialog = true">
            <el-icon style="margin-right: 4px"><Plus /></el-icon>
            切换资源
          </ElButton>
        </div>

        <div class="chat-container" ref="chatContainerRef">
          <div v-if="messages.length === 0" class="chat-welcome">
            <div class="welcome-avatar">
              <el-icon :size="24"><ChatDotRound /></el-icon>
            </div>
            <div class="welcome-bubble">
              你好！我是你的学习助教 🤖<br>
              关于《<b>{{ currentSession.resourceName }}</b>》，有什么想了解的吗？
            </div>
          </div>

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-row"
            :class="msg.role === 'user' ? 'message-user' : 'message-assistant'"
          >
            <div v-if="msg.role === 'assistant'" class="msg-avatar assistant">
              <el-icon :size="16"><ChatDotRound /></el-icon>
            </div>

            <div class="msg-content-wrap">
              <div
                class="msg-bubble"
                :class="msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'"
              >
                <pre class="msg-text">{{ getMessageDisplay(msg) }}</pre>
                <span v-if="msg._typing && typingMessageId === msg.id" class="typing-cursor"></span>
              </div>
              <div class="msg-time" :class="msg.role === 'user' ? 'time-right' : ''">
                {{ formatTime(msg.createdAt) }}
              </div>
            </div>

            <div v-if="msg.role === 'user'" class="msg-avatar user">
              <div class="user-avatar-sm" :style="{ backgroundColor: state.user?.avatarColor || DEFAULT_AVATAR_COLOR }">
                {{ (state.user?.name || '?').charAt(0) }}
              </div>
            </div>
          </div>

          <div v-if="isSending && !isTyping" class="message-row message-assistant">
            <div class="msg-avatar assistant">
              <el-icon :size="16"><ChatDotRound /></el-icon>
            </div>
            <div class="msg-content-wrap">
              <div class="msg-bubble bubble-assistant thinking-bubble">
                <div class="thinking-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="messages.length === 0 || (!isSending && !isTyping)" class="chat-chips">
          <div v-if="recommendedQuestions.length > 0" class="chip-list-wrap">
            <div class="chip-label">
              <el-icon style="margin-right: 4px"><Promotion /></el-icon>
              推荐提问
            </div>
            <div class="chip-list">
              <ElTag
                v-for="(q, i) in recommendedQuestions"
                :key="i"
                class="chip-item"
                effect="plain"
                round
                @click="handleChipClick(q)"
              >
                {{ q }}
              </ElTag>
            </div>
          </div>
        </div>

        <div class="chat-input-area">
          <ElInput
            v-model="inputValue"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="输入你的问题，按 Enter 发送，Shift+Enter 换行..."
            :disabled="isSending || !currentSession"
            @keydown="handleKeydown"
          />
          <ElButton
            type="primary"
            :disabled="!inputValue.trim() || isSending || !currentSession"
            :loading="isSending"
            @click="handleSend()"
          >
            发送
          </ElButton>
        </div>
      </template>
    </div>

    <ElDialog v-model="showResourceDialog" title="选择学习资源" width="640px" :close-on-click-modal="false">
      <div class="resource-dialog">
        <div class="dialog-search-bar">
          <ElInput
            v-model="resourceSearchKeyword"
            placeholder="搜索资源名称 / 编号"
            clearable
            style="width: 260px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </ElInput>
          <ElSelect v-model="resourceFilterSubject" placeholder="学科" clearable style="width: 130px">
            <ElOption label="语文" value="语文" />
            <ElOption label="数学" value="数学" />
            <ElOption label="英语" value="英语" />
            <ElOption label="物理" value="物理" />
            <ElOption label="化学" value="化学" />
            <ElOption label="生物" value="生物" />
          </ElSelect>
        </div>

        <el-scrollbar height="380px">
          <div v-if="filteredResources.length === 0" class="empty-resources">
            <ElEmpty description="暂无可问答的资源，请先在资源库中收藏或学习资源" :image-size="80" />
          </div>
          <div
            v-for="r in filteredResources"
            :key="r.id"
            class="resource-option"
            @click="startNewSession(r.id)"
          >
            <div class="resource-option-icon" :style="{ backgroundColor: getSubjectColor(r.subject) + '20', color: getSubjectColor(r.subject) }">
              <el-icon><Files /></el-icon>
            </div>
            <div class="resource-option-info">
              <div class="resource-option-name">{{ r.name }}</div>
              <div class="resource-option-meta">
                <ElTag size="small" :color="getSubjectColor(r.subject)" effect="dark" round>
                  {{ r.subject }}
                </ElTag>
                <ElTag size="small" type="info" effect="plain" round>{{ r.difficulty }}</ElTag>
                <ElTag size="small" type="info" effect="plain" round>{{ r.type }}</ElTag>
                <ElTag
                  size="small"
                  :type="r.status === '已完成' ? 'success' : r.status === '学习中' ? 'warning' : 'info'"
                  effect="light"
                  round
                >
                  {{ r.status }}
                </ElTag>
              </div>
              <div v-if="r.tags && r.tags.length > 0" class="resource-option-tags">
                <span
                  v-for="(t, i) in r.tags.slice(0, 5)"
                  :key="i"
                  class="mini-tag"
                >#{{ t.name }}</span>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </ElDialog>
  </div>
</template>

<style scoped>
.qa-page {
  display: flex;
  height: calc(100vh - 56px - 16px);
  gap: 0;
  background: #f8fafc;
  border-radius: 12px;
  overflow: hidden;
}

.qa-sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
}

.sidebar-section-title {
  padding: 12px 16px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.session-list-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 8px 12px;
}

.empty-sessions {
  padding: 40px 0;
}

.session-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 4px;
}

.session-item:hover {
  background: #f1f5f9;
}

.session-item.active {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
}

.session-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
}

.session-item.active .session-icon {
  background: #3b82f6;
  color: white;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.session-count {
  font-size: 11px;
  color: #94a3b8;
}

.qa-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fafbfc;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-chat-icon {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.3);
}

.empty-chat-title {
  margin-top: 24px;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.empty-chat-subtitle {
  margin-top: 8px;
  font-size: 14px;
  color: #64748b;
}

.empty-chat .el-button {
  margin-top: 24px;
}

.quick-questions {
  margin-top: 40px;
  max-width: 640px;
  width: 100%;
}

.quick-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

.chat-header {
  padding: 14px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.chat-resource-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.resource-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.resource-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.resource-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.chat-container {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  min-height: 0;
}

.chat-welcome {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
}

.welcome-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.welcome-bubble {
  background: #ffffff;
  padding: 14px 18px;
  border-radius: 0 14px 14px 14px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  color: #334155;
  line-height: 1.7;
  max-width: 80%;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
}

.message-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}

.msg-avatar.assistant {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.msg-avatar.user {
  padding: 0;
}

.user-avatar-sm {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.msg-content-wrap {
  max-width: 72%;
  display: flex;
  flex-direction: column;
}

.message-user .msg-content-wrap {
  align-items: flex-end;
}

.msg-bubble {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;
  position: relative;
}

.bubble-assistant {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-top-left-radius: 4px;
  color: #334155;
}

.bubble-user {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-top-right-radius: 4px;
}

.msg-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: #3b82f6;
  margin-left: 2px;
  animation: blink 0.8s infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.thinking-bubble {
  padding: 16px 20px;
  min-width: 72px;
}

.thinking-dots {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 14px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  animation: thinkBounce 1.4s infinite ease-in-out both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinkBounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.msg-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
}

.time-right {
  text-align: right;
}

.chat-chips {
  padding: 12px 24px 0;
  flex-shrink: 0;
}

.chip-list-wrap {
  max-width: 100%;
}

.chip-label {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
}

.chip-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip-item {
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
  padding: 6px 14px !important;
}

.chip-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.chat-input-area {
  padding: 14px 24px 18px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-shrink: 0;
}

.chat-input-area :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
}

.chat-input-area .el-button {
  height: 40px;
  padding: 0 24px;
}

.resource-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialog-search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 4px;
}

.empty-resources {
  padding: 60px 0;
}

.resource-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 10px;
}

.resource-option:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
}

.resource-option-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.resource-option-info {
  flex: 1;
  min-width: 0;
}

.resource-option-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 6px;
}

.resource-option-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.resource-option-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.mini-tag {
  font-size: 11px;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 8px;
  border-radius: 10px;
}
</style>
