// script.js atualizado para seu novo HTML
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.querySelector('header nav');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            // Isso faz o menu aparecer/sumir no mobile
            navMenu.classList.toggle('hidden');
            navMenu.classList.toggle('flex');
            navMenu.classList.toggle('flex-col');
            navMenu.classList.toggle('absolute');
            navMenu.classList.toggle('top-full');
            navMenu.classList.toggle('left-0');
            navMenu.classList.toggle('w-full');
            navMenu.classList.toggle('bg-white');
            navMenu.classList.toggle('p-6');
            navMenu.classList.toggle('shadow-lg');
        });
    }
});