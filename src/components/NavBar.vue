<template>
  <header>
    <nav>
      <router-link to="/" exact-active-class="active-link">Home</router-link>
      <router-link to="/login" exact-active-class="active-link">Login/Create</router-link>
      <router-link to="/juror">Jury Duty</router-link>
      <router-link to="/reported">My Reports</router-link>
    </nav>
  </header>
</template>

<script>
export default {}
</script>

<style scoped>
header {
  position: fixed;
  top: 0;
  right: 0;
  padding: 1rem 1rem;
  background-color: #D3D3D3;
  z-index: 1000;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

nav {
  display: flex;
  gap: 1rem;
}

.active-link {
  font-weight: bold;
  text-decoration: underline;
}
</style>
