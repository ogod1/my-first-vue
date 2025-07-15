import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import router from './router/index'


const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
