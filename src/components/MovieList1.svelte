<script>
	import Movie from './Movie.svelte';
</script>
<ul class="movie_list">
   <li>
       <Movie/>
   </li>
   <li>
      <Movie/>
   </li>
</ul>
<style>
.movie_list li {
    border-bottom: 1px dashed #ccc;
    list-style: none;
    overflow: hidden;
    padding: 12px 0;
}
</style>
