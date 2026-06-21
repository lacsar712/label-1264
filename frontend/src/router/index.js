import { createRouter, createWebHistory } from 'vue-router'

import { useAuth } from '../stores/auth'

import AppLayout from '../layout/AppLayout.vue'
import LoginPage from '../pages/LoginPage.vue'
import HomePage from '../pages/HomePage.vue'
import ResourcesPage from '../pages/ResourcesPage.vue'
import RecommendationAnalysisPage from '../pages/RecommendationAnalysisPage.vue'
import ProgressPage from '../pages/ProgressPage.vue'
import LearningPathPage from '../pages/LearningPathPage.vue'
import AdminUsersPage from '../pages/admin/AdminUsersPage.vue'
import AdminResourcesPage from '../pages/admin/AdminResourcesPage.vue'
import AdminSystemPage from '../pages/admin/AdminSystemPage.vue'
import NotesPage from '../pages/NotesPage.vue'
import NoteEditorPage from '../pages/NoteEditorPage.vue'
import AdminNotesPage from '../pages/admin/AdminNotesPage.vue'
import AdminNotificationsPage from '../pages/admin/AdminNotificationsPage.vue'
import QuizCreatePage from '../pages/quiz/QuizCreatePage.vue'
import QuizTakePage from '../pages/quiz/QuizTakePage.vue'
import QuizResultPage from '../pages/quiz/QuizResultPage.vue'
import QuizHistoryPage from '../pages/quiz/QuizHistoryPage.vue'
import LeaderboardPage from '../pages/LeaderboardPage.vue'
import StudyCalendarPage from '../pages/StudyCalendarPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage },
    {
      path: '/',
      component: AppLayout,
      redirect: '/home',
      children: [
        { path: 'home', component: HomePage },
        { path: 'resources', component: ResourcesPage },
        { path: 'recommendation-analysis', component: RecommendationAnalysisPage },
        { path: 'progress', component: ProgressPage },
        { path: 'leaderboard', component: LeaderboardPage },
        { path: 'learning-path', component: LearningPathPage },
        { path: 'admin/users', component: AdminUsersPage },
        { path: 'admin/resources', component: AdminResourcesPage },
        { path: 'admin/system', component: AdminSystemPage },
        { path: 'admin/notes', component: AdminNotesPage },
        { path: 'admin/notifications', component: AdminNotificationsPage },
        { path: 'notes', component: NotesPage },
        { path: 'notes/new', component: NoteEditorPage },
        { path: 'notes/:noteId', component: NoteEditorPage },
        { path: 'quiz/create', component: QuizCreatePage },
        { path: 'quiz/take/:quizId', component: QuizTakePage },
        { path: 'quiz/result/:quizId', component: QuizResultPage },
        { path: 'quiz/history', component: QuizHistoryPage },
        { path: 'calendar', component: StudyCalendarPage },
        { path: 'settings', component: SettingsPage },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

router.beforeEach((to) => {
  const { isAuthed, isAdmin } = useAuth()
  if (to.path === '/login') {
    if (isAuthed.value) return '/home'
    return true
  }
  if (!isAuthed.value) return '/login'

  if (to.path.startsWith('/admin') && !isAdmin.value) return '/home'

  if (to.path === '/notes/new' && isAdmin.value) return '/admin/notes'

  return true
})

export default router
