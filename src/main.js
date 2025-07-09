import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'

const routes = [
  { path: '/', redirect: '/home' },  
  { path: '/home', component: HomeView }, 
  { path: '/login', component: LoginView},
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
