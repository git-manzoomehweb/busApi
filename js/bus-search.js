if (document.querySelectorAll(".swiper-days").length > 0)
  swiper = new Swiper(".swiper-days", {
    slidesPerView: 8,
    speed: 700,
    centeredSlides: !1,
    spaceBetween: 8,
    grabCursor: !0,
    // autoplay: { delay: 6500, disableOnInteraction: !1 },
    loop: 0,
    pagination: { el: ".swiper-pagination", clickable: !0 },
    navigation: {
      nextEl: ".swiper-button-next-f",
      prevEl: ".swiper-button-prev-f",
    },
    breakpoints: {
      640: { slidesPerView: 4, spaceBetween: 8 },
      768: { slidesPerView: 4, spaceBetween: 8 },
      1024: { slidesPerView: 8, spaceBetween: 8 },
    },
  });

if (document.querySelectorAll(".swiper-days-mob").length > 0)
  swiper = new Swiper(".swiper-days-mob", {
    slidesPerView: 4.2,
    speed: 700,
    centeredSlides: !1,
    spaceBetween: 8,
    grabCursor: !0,
    // autoplay: { delay: 6500, disableOnInteraction: !1 },
    loop: 0,
    pagination: { el: ".swiper-pagination", clickable: !0 },
    navigation: {
      nextEl: ".swiper-button-next-f",
      prevEl: ".swiper-button-prev-f",
    },
    breakpoints: {
      640: { slidesPerView: 4.5, spaceBetween: 8 },
      768: { slidesPerView: 4.5, spaceBetween: 8 },
      1024: { slidesPerView: 8, spaceBetween: 8 },
    },
  });

const filteringBox = document.querySelectorAll(".filtering-box");
filteringBox.forEach((box) => {
  const opener = box.querySelector(".opener");
  const arrow = box.querySelector(".arrow");
  const contents = box.querySelector(".show-content");

  opener.addEventListener("click", () => {
    arrow.classList.toggle("rotate-180");
    contents.classList.toggle("hidden");
  });
});
// ______________________________________________________

const lis = document.querySelectorAll(".categories-show button");

if (document.querySelector(".categories-show")) {
  lis.forEach(function (li) {
    lis[0].classList.add("actived");
    li.addEventListener("click", function () {
      lis.forEach(function (item) {
        item.classList.remove("actived");
      });

      li.classList.add("actived");
    });
  });
}
// _____________________________________________________________
busCards = document.querySelectorAll(".bus-card");
if (document.querySelector(".bus-cards-container")) {
  busCards.forEach((card) => {
    const seeMore = card.querySelector(".see-and-buy-ticket");
    seeMore.addEventListener("click", () => {
      seeMore.classList.add("hidden");
      card.querySelectorAll(".hidden-elements").forEach((item) => {
        item.classList.remove("hidden");
      });
      card.classList.remove("h-[240px]");
      card.classList.add("h-[482px]");
    });
    const closeCard = card.querySelector(".closeCard");

    closeCard.addEventListener("click", () => {
      seeMore.classList.remove("hidden");
      card.querySelectorAll(".hidden-elements").forEach((item) => {
        item.classList.add("hidden");
      });
      card.classList.add("h-[240px]");
      card.classList.remove("h-[482px]");
    });
    const openFirstMenu = card.querySelector(".open-first-menu");
    openFirstMenu.addEventListener("click", () => {
      card.querySelector(".first-menu").classList.remove("translate-x-[105%]");
    });
    const closeFirtMenu = card.querySelector(".first-menu .clode-menu");
    closeFirtMenu.addEventListener("click", () => {
      card.querySelector(".first-menu").classList.add("translate-x-[105%]");
    });

    const openSecondMenu = card.querySelector(".open-second-menu");
    openSecondMenu.addEventListener("click", () => {
      card.querySelector(".second-menu").classList.remove("translate-x-[105%]");
    });
    const closeSecondMenu = card.querySelector(".second-menu .clode-menu");
    closeSecondMenu.addEventListener("click", () => {
      card.querySelector(".second-menu").classList.add("translate-x-[105%]");
    });

    const openThirddMenu = card.querySelector(".open-third-menu");
    openThirddMenu.addEventListener("click", () => {
      card.querySelector(".third-menu").classList.remove("translate-x-[105%]");
    });
    const closeThirdMenu = card.querySelector(".third-menu .clode-menu");
    closeThirdMenu.addEventListener("click", () => {
      card.querySelector(".third-menu").classList.add("translate-x-[105%]");
    });
  });
}
// _____________________________________________________

busCardsMobile = document.querySelectorAll(".bus-card-mobile");
if (document.querySelector(".bus-cards-container")) {
  busCardsMobile.forEach((card) => {
    const openFirstMenu = card.querySelector(".open-first-menu");
    openFirstMenu.addEventListener("click", () => {
      card.querySelector(".first-menu").classList.remove("translate-y-[120%]");
    });
    const closeFirtMenu = card.querySelector(".first-menu .clode-menu");
    closeFirtMenu.addEventListener("click", () => {
      card.querySelector(".first-menu").classList.add("translate-y-[120%]");
    });

    const openSecondMenu = card.querySelector(".open-second-menu");
    openSecondMenu.addEventListener("click", () => {
      card.querySelector(".second-menu").classList.remove("translate-y-[120%]");
    });
    const closeSecondMenu = card.querySelector(".second-menu .clode-menu");
    closeSecondMenu.addEventListener("click", () => {
      card.querySelector(".second-menu").classList.add("translate-y-[120%]");
    });

    const openThirddMenu = card.querySelector(".open-third-menu");
    openThirddMenu.addEventListener("click", () => {
      card.querySelector(".third-menu").classList.remove("translate-y-[120%]");
    });
    const closeThirdMenu = card.querySelector(".third-menu .clode-menu");
    closeThirdMenu.addEventListener("click", () => {
      card.querySelector(".third-menu").classList.add("translate-y-[120%]");
    });
  });
}
// _____________________________________________________
const openFilterBtn = document.querySelector(".open-filter-menu");
if (openFilterBtn) {
  openFilterBtn.addEventListener("click", () => {
    document
      .querySelector(".filtering-menu")
      .classList.remove("translate-y-[160%]");
    document.body.style.overflow = "hidden";
  });
  const closeFilterBtn = document.querySelectorAll(".close-filtering-menu");
  closeFilterBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelector(".filtering-menu")
        .classList.add("translate-y-[160%]");
      document.body.style.overflow = "";
      document.querySelectorAll(".filtering-box ").forEach((box) => {
        const contents = box.querySelector(".show-content");
        const arrow = box.querySelector(".arrow");
        contents.classList.add("hidden");
        arrow.classList.remove("rotate-180");
      });
    });
  });
}

const openChangeRouteBtn = document.querySelector(".open-chang-route-menu");
if (openChangeRouteBtn) {
  openChangeRouteBtn.addEventListener("click", () => {
    document
      .querySelector(".change-routes-menu")
      .classList.remove("translate-y-[160%]");
    document.body.style.overflow = "hidden";
  });
  const closeChangeRouteBtn = document.querySelectorAll(
    ".close-change-route-menu"
  );
  closeChangeRouteBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelector(".change-routes-menu")
        .classList.add("translate-y-[160%]");
      document.body.style.overflow = "";
    });
  });
}
