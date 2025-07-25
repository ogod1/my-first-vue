import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import UserProfileView from '../views/UserProfileView.vue'
import JurorReview from '../views/JurorReview.vue'
import myReported from '../views/MyReported.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/users/:email',
      name: 'UserProfile',
      component: UserProfileView
    },
    {
      path: '/juror',
      name: 'JurorReview',
      component: JurorReview
    },
    {
      path: '/reported',
      name: 'MyReported',
      component: myReported
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
