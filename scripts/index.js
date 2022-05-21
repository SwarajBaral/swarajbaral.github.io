const resumeButton = document.querySelector(".cta");

window.onscroll = () => {
   if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
      resumeButton.classList.add('cta-scroll')
    } else {
      resumeButton.classList.remove('cta-scroll')
    }
}