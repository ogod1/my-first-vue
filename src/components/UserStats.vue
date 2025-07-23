<template>
  <div class="user-stats">
    <template v-if="user && isLoggedIn">
      <h3>@{{ user.email }}</h3>
      <ul>
        <li>Posts: {{ user.posts?.length ?? 0 }}</li>
        <li>Following: {{ user.following ?? 0 }}</li>
        <li>Followers: {{ user.followers ?? 0 }}</li>
        <li>Strikes: {{ user.strikes ?? 0 }}</li>
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
