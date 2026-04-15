document.addEventListener("DOMContentLoaded", () => {
  const year = new Date().getFullYear();
  console.log(`Cochon & Co - landing activa (${year})`);

  const video = document.querySelector(".video-bg__media");

  if (video) {
    video.play().catch(() => {
      console.warn("El video no pudo reproducirse automáticamente.");
    });
  }
});