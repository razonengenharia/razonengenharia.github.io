// script.js - Dinamicidade Razon Engenharia

document.addEventListener('DOMContentLoaded', () => {
    // 1. Menu Mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.querySelector('header nav');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('hidden');
            navMenu.classList.toggle('flex');
            navMenu.classList.toggle('flex-col');
            navMenu.classList.toggle('absolute');
            navMenu.classList.toggle('top-20');
            navMenu.classList.toggle('left-0');
            navMenu.classList.toggle('w-full');
            navMenu.classList.toggle('bg-white');
            navMenu.classList.toggle('p-6');
            navMenu.classList.toggle('shadow-xl');
        });
    }

    // 2. Rolagem Suave (Smooth Scroll)
    // Já ativado nativamente via CSS (scroll-smooth), 
    // mas este JS garante compatibilidade e comportamentos extras se necessário.
});