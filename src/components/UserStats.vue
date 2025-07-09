<template>
  <div class="user-stats">
    <template v-if="user && isLoggedIn">
      <h3>@{{ user.username }}</h3>
      <ul>
        <li>Posts: {{ user.posts }}</li>
        <li>Following: {{ user.following }}</li>
        <li>Followers: {{ user.followers }}</li>
      </ul>
    </template>

    <template v-else>
      <router-link to="/login">Log In or Create an Account</router-link>
    </template>
  </div>
</template>

<script setup>
// Accept props from parent
defineProps({
  user: {
    type: Object,
    default: null
  },
  isLoggedIn: {
    type: Boolean,
    required: true
  }
})
</script>

<style scoped>
.user-stats {
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: 6px;
  border: 2px solid #ccc;
}

.user-stats h3 {
  margin-bottom: 0.5rem;
}

.user-stats ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.user-stats li {
  margin-bottom: 0.25rem;
}
</style>
