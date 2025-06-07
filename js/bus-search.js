if (document.querySelectorAll(".book-swiper-days").length > 0)
  swiper = new Swiper(".book-swiper-days", {
    slidesPerView: 8,
    speed: 700,
    centeredSlides: !1,
    spaceBetween: 8,
    grabCursor: !0,
    // autoplay: { delay: 6500, disableOnInteraction: !1 },
    loop: 0,
    pagination: { el: ".book-swiper-pagination", clickable: !0 },
    navigation: {
      nextEl: ".book-swiper-button-next-f",
      prevEl: ".book-swiper-button-prev-f",
    },
    breakpoints: {
      640: { slidesPerView: 4, spaceBetween: 8 },
      768: { slidesPerView: 4, spaceBetween: 8 },
      1024: { slidesPerView: 8, spaceBetween: 8 },
    },
  });

if (document.querySelectorAll(".book-swiper-days-mob").length > 0)
  swiper = new Swiper(".book-swiper-days-mob", {
    slidesPerView: 4.2,
    speed: 700,
    centeredSlides: !1,
    spaceBetween: 8,
    grabCursor: !0,
    // autoplay: { delay: 6500, disableOnInteraction: !1 },
    loop: 0,
    pagination: { el: ".book-swiper-pagination", clickable: !0 },
    navigation: {
      nextEl: ".book-swiper-button-next-f",
      prevEl: ".book-swiper-button-prev-f",
    },
    breakpoints: {
      640: { slidesPerView: 4.5, spaceBetween: 8 },
      768: { slidesPerView: 4.5, spaceBetween: 8 },
      1024: { slidesPerView: 8, spaceBetween: 8 },
    },
  });

const filteringBox = document.querySelectorAll(".book-filtering-box");
filteringBox.forEach((box) => {
  const opener = box.querySelector(".book-opener");
  const arrow = box.querySelector(".book-arrow");
  const contents = box.querySelector(".book-show-content");

  opener.addEventListener("click", () => {
    arrow.classList.toggle("book-rotate-180");
    contents.classList.toggle("book-hidden");
  });
});
// ______________________________________________________

const lis = document.querySelectorAll(".book-categories-show button");

if (document.querySelector(".book-categories-show")) {
  lis.forEach(function (li) {
    lis[0].classList.add("book-actived");
    li.addEventListener("click", function () {
      lis.forEach(function (item) {
        item.classList.remove("book-actived");
      });

      li.classList.add("book-actived");
    });
  });
}
// _____________________________________________________________
busCards = document.querySelectorAll(".book-bus-card");
if (document.querySelector(".book-bus-cards-container")) {
  busCards.forEach((card) => {
    const seeMore = card.querySelector(".book-see-and-buy-ticket");
    seeMore.addEventListener("click", () => {
      seeMore.classList.add("book-hidden");
      card.querySelectorAll(".book-hidden-elements").forEach((item) => {
        item.classList.remove("book-hidden");
      });
      card.classList.remove("book-h-[240px]");
      card.classList.add("book-h-[482px]");
    });
    const closeCard = card.querySelector(".book-closeCard");

    closeCard.addEventListener("click", () => {
      seeMore.classList.remove("book-hidden");
      card.querySelectorAll(".book-hidden-elements").forEach((item) => {
        item.classList.add("book-hidden");
      });
      card.classList.add("book-h-[240px]");
      card.classList.remove("book-h-[482px]");
    });
    const openFirstMenu = card.querySelector(".book-open-first-menu");
    openFirstMenu.addEventListener("click", () => {
      card.querySelector(".book-first-menu").classList.remove("book-translate-x-[105%]");
    });
    const closeFirtMenu = card.querySelector(".book-first-menu .book-clode-menu");
    closeFirtMenu.addEventListener("click", () => {
      card.querySelector(".book-first-menu").classList.add("book-translate-x-[105%]");
    });

    const openSecondMenu = card.querySelector(".book-open-second-menu");
    openSecondMenu.addEventListener("click", () => {
      card.querySelector(".book-second-menu").classList.remove("book-translate-x-[105%]");
    });
    const closeSecondMenu = card.querySelector(".book-second-menu .book-clode-menu");
    closeSecondMenu.addEventListener("click", () => {
      card.querySelector(".book-second-menu").classList.add("book-translate-x-[105%]");
    });

    const openThirddMenu = card.querySelector(".book-open-third-menu");
    openThirddMenu.addEventListener("click", () => {
      card.querySelector(".book-third-menu").classList.remove("book-translate-x-[105%]");
    });
    const closeThirdMenu = card.querySelector(".book-third-menu .book-clode-menu");
    closeThirdMenu.addEventListener("click", () => {
      card.querySelector(".book-third-menu").classList.add("book-translate-x-[105%]");
    });
  });
}
// _____________________________________________________

busCardsMobile = document.querySelectorAll(".book-bus-card-mobile");
if (document.querySelector(".book-bus-cards-container")) {
  busCardsMobile.forEach((card) => {
    const openFirstMenu = card.querySelector(".book-open-first-menu");
    openFirstMenu.addEventListener("click", () => {
      card.querySelector(".book-first-menu").classList.remove("book-translate-y-[120%]");
    });
    const closeFirtMenu = card.querySelector(".book-first-menu .book-clode-menu");
    closeFirtMenu.addEventListener("click", () => {
      card.querySelector(".book-first-menu").classList.add("book-translate-y-[120%]");
    });

    const openSecondMenu = card.querySelector(".book-open-second-menu");
    openSecondMenu.addEventListener("click", () => {
      card.querySelector(".book-second-menu").classList.remove("book-translate-y-[120%]");
    });
    const closeSecondMenu = card.querySelector(".book-second-menu .book-clode-menu");
    closeSecondMenu.addEventListener("click", () => {
      card.querySelector(".book-second-menu").classList.add("book-translate-y-[120%]");
    });

    const openThirddMenu = card.querySelector(".book-open-third-menu");
    openThirddMenu.addEventListener("click", () => {
      card.querySelector(".book-third-menu").classList.remove("book-translate-y-[120%]");
    });
    const closeThirdMenu = card.querySelector(".book-third-menu .book-clode-menu");
    closeThirdMenu.addEventListener("click", () => {
      card.querySelector(".book-third-menu").classList.add("book-translate-y-[120%]");
    });
  });
}
// _____________________________________________________
const openFilterBtn = document.querySelector(".book-open-filter-menu");
if (openFilterBtn) {
  openFilterBtn.addEventListener("click", () => {
    document
      .querySelector(".book-filtering-menu")
      .classList.remove("book-translate-y-[160%]");
    document.body.style.overflow = "book-hidden";
  });
  const closeFilterBtn = document.querySelectorAll(".book-close-filtering-menu");
  closeFilterBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelector(".book-filtering-menu")
        .classList.add("book-translate-y-[160%]");
      document.body.style.overflow = "";
      document.querySelectorAll(".book-filtering-box ").forEach((box) => {
        const contents = box.querySelector(".book-show-content");
        const arrow = box.querySelector(".book-arrow");
        contents.classList.add("book-hidden");
        arrow.classList.remove("book-rotate-180");
      });
    });
  });
}

const openChangeRouteBtn = document.querySelector(".book-open-chang-route-menu");
if (openChangeRouteBtn) {
  openChangeRouteBtn.addEventListener("click", () => {
    document
      .querySelector(".book-change-routes-menu")
      .classList.remove("book-translate-y-[160%]");
    document.body.style.overflow = "book-hidden";
  });
  const closeChangeRouteBtn = document.querySelectorAll(
    ".book-close-change-route-menu"
  );
  closeChangeRouteBtn.forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelector(".book-change-routes-menu")
        .classList.add("book-translate-y-[160%]");
      document.body.style.overflow = "";
    });
  });
}
