/**
 * Global state for session management and UI updates
 */
let translations = {};
let currentLanguage = document.documentElement.lang || 'fa';
let isRTL = document.documentElement.dir === 'rtl' || currentLanguage === 'fa' || currentLanguage === 'ar';
let sessionSearchStorage = sessionStorage.getItem("sessionSearch")
    ? JSON.parse(sessionStorage.getItem("sessionSearch"))
    : {};

let schemaId = 0;
const isMobile = document.querySelector('main')?.dataset.mob === "true";
let mobileSliderReady = false;
let sliderRetryCount = 0;
const MAX_RETRY_COUNT = 10;
let isSliderActive = false;
let currentMouseMoveHandler = null;
let currentMouseUpHandler = null;




// Touch state tracking
let isDurationTouchActive = false;
let durationCurrentTouchThumb = null;
let currentDurationSliderType = null; // 'outbound' or 'inbound'

let durationSliderInitialized = false;
let activeDurationSliderType = null;
let isDurationSliderActive = false;


let tripNames = [];
let providerDataList = [];
let isClosing = false;
let totalTime = 20 * 60; // 20 minutes in seconds
let warningShown = false;
let progressTimer;
let progress = 10;

// Cached DOM elements
const progressBar = document.querySelector(".book-progress__bar");
const modalContainer = document.querySelector(".book-expire__message__modal__container");
const someTime = modalContainer?.querySelector(".book-some__time");
const noTime = modalContainer?.querySelector(".book-no__time");

let priceMinPercent = 0;
let priceMaxPercent = 100;

let durationMinPercent = 0;
let durationMaxPercent = 100;

let inboundMinPercent = 0;
let inboundMaxPercent = 100;

let outboundMinPercent = 0;
let outboundMaxPercent = 100;

const loadTranslations = async (lang = 'fa') => {
    try {
        const response = await fetch(`/json/translations?lid=1`);
        const allTranslations = await response.json();
        translations = allTranslations;
        tripNames = [translate("first_route"), translate("second_route"), translate("third_route"), translate("fourth_route")];
    } catch (error) {
        console.error('loadTranslations:', error);
    }
}

// Function to translate text
const translate = (text) => {
    try {
        return translations[text] ? translations[text][currentLanguage] : text;
    } catch (error) {
        console.error('translate:', error);
    }
};
// Function to apply direction-specific styles
const applyDirectionStyles = async () => {
    try {
        const direction = isRTL ? 'rtl' : 'ltr';
        document.documentElement.dir = direction;
        document.documentElement.lang = currentLanguage;

        // Use existing book-rtl and book-ltr classes
        document.body.classList.toggle('book-rtl', isRTL);
        document.body.classList.toggle('book-ltr', !isRTL);
    } catch (error) {
        console.error('applyDirectionStyles:', error);
    }
};

document.addEventListener("DOMContentLoaded", async function () {

    // Initialize translation
    await loadTranslations();
    // Initialize direction styles
    await applyDirectionStyles();
    sessionStorage.removeItem('sessionAmenities');
    fetch("/booking/images/sprite-booking-icons.svg")
        .then((res) => res.text())
        .then((svgText) => {
            const div = document.createElement("div");
            div.style.display = "none"; // Hide the container from view
            div.innerHTML = svgText;
            document.body.insertBefore(div, document.body.firstChild); // Inject the SVG sprite at the beginning of <body>
        })
        .catch((err) => {
            console.error(translate("SVG sprite load error") + ":", err);
        });

});
/**
 * Sets up the session data and updates the UI based on flight search parameters
 * @param {Object} args - Arguments containing source data
 * @returns {void}
 */
const setSession = async (args) => {
    try {
        if (!sessionSearchStorage) return;
        // Update session data
        schemaId = sessionSearchStorage.SchemaId;
        sessionSearchStorage.SessionId = args.source.rows[0].SessionId;
        sessionSearchStorage.rkey = getSearchCookie("rkey") || "";
        sessionStorage.setItem("sessionSearch", JSON.stringify(sessionSearchStorage));
        $bc.setSource("cms.session");

        // Set session expiry (20 minutes)
        const now = new Date();
        const ttl = 20 * 60 * 1000; // 20 minutes in milliseconds
        sessionSearchStorage = { ...sessionSearchStorage, Expiry: now.getTime() + ttl };

        // Fetch provider data for client users
        if (getSearchCookie("rkey")) {
            const userResponse = await fetch('/Client_User_Type.inc');
            const user = await userResponse.text();
            if (user === "1") {
                const providerResponse = await fetch('/Client_Provider_Library.bc');
                providerDataList = await providerResponse.json();
            }
        }

        // Update UI with search parameters
        const cabinClass = document.querySelector(".book-cabinClass__searched__content");
        const { Adults, Children, Infants, TripGroup, CabinClass } = sessionSearchStorage;

        // Update cabin class display with translations
        const cabinMap = {
            Economy: { text: translate("economy_class"), class: "Economy" },
            BusinessClass: { text: translate("business_class"), class: "BusinessClass" },
            FirstClass: { text: translate("first_class"), class: "FirstClass" }
        };
        const cabin = cabinMap[CabinClass];
        cabinClass.textContent = cabin.text;
        cabinClass.dataset.class = cabin.class;

        // Update flight type selection
        const flightTypes = document.querySelectorAll('.book-module__flight__type li');
        flightTypes.forEach(item => item.classList.remove('book-active__module__flight__type'));
        const typeIndex = { 291: 0, 290: 1, 292: 2 }[schemaId];
        if (flightTypes[typeIndex]) {
            flightTypes[typeIndex].classList.add('book-active__module__flight__type');
        }

        // Update passenger summary with translations
        const passengerParts = [];
        if (Adults > 0) passengerParts.push(`${Adults} ${translate("adult_passenger")}`);
        if (Children > 0) passengerParts.push(`${Children} ${translate("child_passenger")}`);
        if (Infants > 0) passengerParts.push(`${Infants} ${translate("infant_passenger")}`);
        const passengerSummary = passengerParts.join(' / ');
        const passengerItems = document.querySelectorAll('.book-passenger__searched__items li');
        document.querySelector('.book-passenger__count').value = passengerSummary;
        passengerItems[0].querySelector(".book-passenger__count__value").innerHTML = Adults;
        passengerItems[1].querySelector(".book-passenger__count__value").innerHTML = Children;
        passengerItems[2].querySelector(".book-passenger__count__value").innerHTML = Infants;

        // Update passenger UI for single adult case
        if (Adults === 1 && Children === 0 && Infants === 0) {
            updatePassengerUI();
        }

        // Retry section with translations
        const retryInfoContainer = document.querySelector(".book-retry__info");
        const totalPassengers = (parseInt(Adults) || 0) + (parseInt(Children) || 0) + (parseInt(Infants) || 0);

        const createTripInfo = (title, trip) => {
            const tripDiv = document.createElement("div");
            tripDiv.classList.add("book-text-sm", "book-mb-2");

            const fromTo = `${trip.OriginName} ${translate("to_destination")} ${trip.DestinationName}`;
            const date = convertToSearchedDate(trip.DepartureDate);
            const cabinText = cabin?.text || translate("unknown");

            tripDiv.innerHTML = `
    <div class="book-mb-2 book-text-zinc-800">${fromTo}</div>
    <div class="book-text-xs book-text-zinc-500">${title}: ${date} - ${cabinText} - ${totalPassengers} ${translate("passenger")}</div>
`;
            return tripDiv;
        };

        if (retryInfoContainer) {
            retryInfoContainer.innerHTML = "";

            if (schemaId === 291 && TripGroup.length === 1) {
                retryInfoContainer.appendChild(createTripInfo(translate("outbound_flight"), TripGroup[0]));

            } else if (schemaId === 290 && TripGroup.length === 2) {
                retryInfoContainer.appendChild(createTripInfo(translate("outbound_flight"), TripGroup[0]));
                retryInfoContainer.appendChild(createTripInfo(translate("return_flight"), TripGroup[1]));

            } else if (schemaId === 292 && TripGroup.length >= 2) {
                TripGroup.forEach((trip, index) => {
                    retryInfoContainer.appendChild(createTripInfo(`${translate("route")} ${tripNames[index]}`, trip));
                });
                document.querySelector(".formflight").classList.add("multicity-flight-form");
            }
        }

        // Update trip details
        if (TripGroup.length > 0) {
            const departureLocationName = document.querySelector(".departure__location__name");
            const arrivalLocationName = document.querySelector(".arrival__location__name");
            const departureDate = document.querySelector(".departure__date");
            const arrivalDate = document.querySelector(".arrival__date");
            const arrivalDateContainer = document.querySelector(".arrival__date__container");

            if (schemaId === 291) {
                // One-way trip
                const { OriginName, DestinationName, DepartureDate, Origin, Destination } = TripGroup[0];
                departureLocationName.value = OriginName;
                arrivalLocationName.value = DestinationName;
                departureLocationName.dataset.id = Origin;
                arrivalLocationName.dataset.id = Destination;
                departureDate.value = convertToSearchedDate(DepartureDate);
                departureDate.dataset.date = DepartureDate;
            } else if (schemaId === 290) {
                // Round-trip
                const { OriginName, DestinationName, DepartureDate, Origin, Destination } = TripGroup[0];
                const returnDate = TripGroup[1].DepartureDate;
                departureLocationName.value = OriginName;
                arrivalLocationName.value = DestinationName;
                departureLocationName.dataset.id = Origin;
                arrivalLocationName.dataset.id = Destination;
                departureDate.value = convertToSearchedDate(DepartureDate);
                departureDate.dataset.date = DepartureDate;
                arrivalDate.value = convertToSearchedDate(returnDate);
                arrivalDate.dataset.date = returnDate;
                arrivalDate.removeAttribute("disabled");
                arrivalDateContainer.classList.remove("disabled__date__container");

            } else {
                // Multi-city trip
                const container = document.querySelector("#route__template");
                container.classList.remove("md:book-w-3/5");
                container.classList.remove("md:book-w-3/5");
                if (!container.classList.contains("book-route__mob")) {
                    container.classList.add("book-grid", "book-grid-cols-2", "book-gap-4");
                    container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-11/12"));
                } else {
                    container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-full"));
                }
                const items = container.querySelectorAll(".book-min-w-48");
                if (items.length) {
                    items.forEach(el => el.classList.remove("book-min-w-48"));
                }
                const templateHTML = container.innerHTML;
                container.innerHTML = "";

                TripGroup.forEach((trip, index) => {
                    const { OriginName, DestinationName, DepartureDate, Origin, Destination } = trip;
                    const tripClone = document.createElement("div");
                    tripClone.innerHTML = templateHTML.trim();
                    const tripElement = tripClone.firstElementChild;

                    // Add trip name with translation
                    const tripNameDiv = document.createElement("div");
                    tripNameDiv.classList.add("route__name", "book-text-sm", "book-mb-1");
                    tripNameDiv.textContent = tripNames[index];
                    tripElement.insertAdjacentElement("afterbegin", tripNameDiv);

                    // Update trip details
                    tripElement.querySelector(".departure__location__name").value = OriginName;
                    tripElement.querySelector(".arrival__location__name").value = DestinationName;
                    tripElement.querySelector(".departure__location__name").dataset.id = Origin;
                    tripElement.querySelector(".arrival__location__name").dataset.id = Destination;
                    tripElement.querySelector(".departure__date").value = convertToSearchedDate(DepartureDate);
                    tripElement.querySelector(".departure__date").dataset.date = DepartureDate;
                    tripElement.querySelector(".arrival__date__container").classList.add("book-hidden");

                    // Add delete button for trips 3 and 4 with translation
                    if (index === 2 || index === 3) {
                        const deleteButton = document.createElement("button");
                        deleteButton.textContent = translate("Delete");
                        deleteButton.type = "button";
                        deleteButton.classList.add(
                            "route__delete",
                            "book-bg-red-500",
                            "book-text-sm",
                            "book-text-white",
                            "book-px-2",
                            "book-py-1",
                            "book-rounded",
                            "book-left-0",
                            "book-top-0",
                            "book-absolute"
                        );
                        deleteButton.onclick = () => deleteRoute(deleteButton);
                        tripElement.appendChild(deleteButton);
                    }

                    container.appendChild(tripElement);
                });

                // Update container styling for multi-city trips
                container.querySelectorAll(".departure__date__container").forEach(e => e.classList.add("book-w-full"));
                document.querySelector(".book__add__roue__container").classList.remove("book-hidden");
            }
        }
    } catch (error) {
        console.error("setSession: " + error.message);
    }
};

/**
 * Generates a 30-day calendar with Gregorian and Persian (Shamsi) dates
 * @param {Object} args - Arguments containing source data and context
 * @returns {void}
 */
const setCalendarLookUp = async (args) => {
    try {
        const result = [];
        const today = new Date();
        const prices = args.source.rows.slice(0, 30).map(row => row.min_price);

        // This code is for the mobile version
        const unit = document.querySelectorAll(".book-currency")[0]?.textContent?.trim();
        const now = new Date();

        // Get month and year names based on current language
        let month, year;
        if (currentLanguage === 'fa') {
            month = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                month: "long"
            }).format(now);
            year = new Intl.DateTimeFormat("fa-IR", {
                calendar: "persian",
                year: "numeric"
            }).format(now);
        } else if (currentLanguage === 'ar') {
            month = new Intl.DateTimeFormat("ar-SA", {
                calendar: "islamic",
                month: "long"
            }).format(now);
            year = new Intl.DateTimeFormat("ar-SA", {
                calendar: "islamic",
                year: "numeric"
            }).format(now);
        } else {
            month = new Intl.DateTimeFormat("en-US", {
                month: "long"
            }).format(now);
            year = new Intl.DateTimeFormat("en-US", {
                year: "numeric"
            }).format(now);
        }

        if (document.querySelector(".book_today__date")) {
            document.querySelector(".book_today__date").textContent = `${month} ${year}`;
        }

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            // Format Gregorian date (YYYY-MM-DD)
            const gregorian = date.toISOString().split("T")[0];

            // Format date based on current language
            let shamsi, weekday, monthName, monthNumber, day;

            if (currentLanguage === 'fa') {
                // Persian (Shamsi) calendar
                shamsi = new Intl.DateTimeFormat("fa-IR", {
                    calendar: "persian",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(date).replace(/‏/g, "");

                weekday = new Intl.DateTimeFormat("fa-IR", {
                    calendar: "persian",
                    weekday: "long"
                }).format(date);

                monthName = new Intl.DateTimeFormat("fa-IR", {
                    calendar: "persian",
                    month: "long"
                }).format(date);

                monthNumber = new Intl.DateTimeFormat("fa-IR", {
                    calendar: "persian",
                    month: "2-digit"
                }).format(date);

                day = new Intl.DateTimeFormat("fa-IR", {
                    calendar: "persian",
                    day: "2-digit"
                }).format(date);
            } else if (currentLanguage === 'ar') {
                // Arabic (Hijri) calendar
                shamsi = new Intl.DateTimeFormat("ar-SA", {
                    calendar: "islamic",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(date);

                weekday = new Intl.DateTimeFormat("ar-SA", {
                    weekday: "long"
                }).format(date);

                monthName = new Intl.DateTimeFormat("ar-SA", {
                    calendar: "islamic",
                    month: "long"
                }).format(date);

                monthNumber = new Intl.DateTimeFormat("ar-SA", {
                    calendar: "islamic",
                    month: "2-digit"
                }).format(date);

                day = new Intl.DateTimeFormat("ar-SA", {
                    calendar: "islamic",
                    day: "2-digit"
                }).format(date);
            } else {
                // English (Gregorian) calendar
                shamsi = new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(date);

                weekday = new Intl.DateTimeFormat("en-US", {
                    weekday: "long"
                }).format(date);

                monthName = new Intl.DateTimeFormat("en-US", {
                    month: "long"
                }).format(date);

                monthNumber = new Intl.DateTimeFormat("en-US", {
                    month: "2-digit"
                }).format(date);

                day = new Intl.DateTimeFormat("en-US", {
                    day: "2-digit"
                }).format(date);
            }

            const price = prices[i] ?? null;

            result.push({
                gregorian,
                shamsi,
                weekday,
                monthName,
                monthNumber,
                day,
                price,
                unit
            });
        }
        args.context.setAsSource("flight.calendar", result);
    } catch (error) {
        console.error("setCalendarLookUp: " + error.message);
    }
};

/**
 * Constructs the request body for API calls using flight search data
 * @param {Object} context - The context object
 * @param {string} sourceId - The source ID
 * @param {Object} params - Additional parameters
 * @returns {Object} The constructed request body
 */
const bodyMakerFunction = (context, sourceId, params) => {
    try {
        const sessionSearchData = JSON.parse(sessionStorage.getItem("sessionSearch")) || {};
        const cleanedData = { ...sessionSearchData };

        // Remove unnecessary fields
        delete cleanedData.SchemaId;
        delete cleanedData.Type;
        delete cleanedData.Expiry;
        (cleanedData.TripGroup || []).forEach(trip => {
            delete trip.OriginName;
            delete trip.DestinationName;
        });

        // Add domain ID and merge with params
        cleanedData.dmnid = document.querySelector("main").getAttribute("data-dmnid");
        return Object.assign({}, params, cleanedData);
    } catch (error) {
        console.error("bodyMakerFunction: " + error.message);
        return params;
    }
};

/**
 * Handles connection closure, updating UI based on success or failure
 * @param {Object} param - Parameters containing context and error status
 * @returns {void}
 */
const onCloseConnection = (param) => {
    try {
        if (!param.context) return;

        if (!param.withError) {
            isClosing = true;
            executeTimer();
            document.querySelectorAll(".book-rendered__container").forEach(e => e.classList.remove("book-hidden"));
            document.querySelector(".book-rendering__container")?.remove();
            completeProgressBar();
            setupBookCardButtons();

            if (isMobile) {
                setTimeout(() => {
                    setupMobilePriceSlider();
                    initializeDurationSliders();
                }, 200);
            }

            // Trigger calendar lookup if enabled
            if (document.querySelector("main").getAttribute("data-calendarLookUp") === 'true') {
                const { TripGroup } = sessionSearchStorage;
                const { Origin, Destination } = TripGroup[0];
                $bc.setSource("cms.calendarLookUp", { origin: Origin, destination: Destination, run: true });
                document.querySelector(".book-card__price__selection__container").classList.remove('book-hidden');
            }

            // Initialize Swiper instances with language-aware configurations
            setTimeout(() => {
                if (document.querySelectorAll('.book-airline__swiper .swiper-slide').length) {
                    new Swiper(".book-airline__swiper", {
                        slidesPerView: 'auto',
                        slidesPerGroup: 1,
                        speed: 400,
                        centeredSlides: false,
                        spaceBetween: 20,
                        loop: false,
                        watchOverflow: true,
                        resistanceRatio: 0,
                        edgeSwipeDetection: true,
                        edgeSwipeThreshold: 20,
                        touchReleaseOnEdges: true,
                        navigation: {
                            nextEl: '.book-airline__next__swiper',
                            prevEl: '.book-airline__prev__swiper',
                        },
                        breakpoints: {
                            640: {
                                slidesPerView: 2,
                                spaceBetween: 20,
                            },
                            768: {
                                slidesPerView: 3,
                                spaceBetween: 40,
                            },
                            1024: {
                                slidesPerView: 4,
                                spaceBetween: 50,
                            },
                        },
                    });
                };
                if (document.querySelectorAll('.book-price__swiper .swiper-slide').length) {
                    new Swiper(".book-price__swiper", {
                        slidesPerView: 8,
                        speed: 400,
                        centeredSlides: false,
                        spaceBetween: 0,
                        loop: false,
                        resistanceRatio: 0,
                        edgeSwipeDetection: true,
                        edgeSwipeThreshold: 20,
                        touchReleaseOnEdges: true,
                        navigation: {
                            nextEl: '.book-price__next__swiper',
                            prevEl: '.book-price__prev__swiper',
                        },
                        breakpoints: {
                            640: {
                                slidesPerView: 2,
                                spaceBetween: 20,
                            },
                            768: {
                                slidesPerView: 3,
                                spaceBetween: 40,
                            },
                            1024: {
                                slidesPerView: 4,
                                spaceBetween: 50,
                            },
                        },
                    });
                };
                if (document.querySelectorAll('.book-mob__price__swiper .swiper-slide').length) {
                    new Swiper(".book-mob__price__swiper", {
                        slidesPerView: 4,
                        speed: 400,
                        centeredSlides: false,
                        spaceBetween: 0,
                        loop: false,
                        resistanceRatio: 0,
                        edgeSwipeDetection: true,
                        edgeSwipeThreshold: 20,
                        touchReleaseOnEdges: true,
                        navigation: {
                            nextEl: '.book-mob__price__next__swiper',
                            prevEl: '.book-mob__price__next__swiper',
                        },
                        breakpoints: {
                            640: {
                                slidesPerView: 2,
                                spaceBetween: 20,
                            },
                            768: {
                                slidesPerView: 3,
                                spaceBetween: 40,
                            },
                            1024: {
                                slidesPerView: 4,
                                spaceBetween: 50,
                            },
                        },
                    });
                };
            }, 100);
        } else {
            document.querySelector(".book-main__container").classList.add("book-hidden");
            document.querySelector(".book-nodata__container").classList.remove("book-hidden");
        }
    } catch (error) {
        console.error("onCloseConnection: " + error.message);
    }
};


/**
 * Sets up event listeners for book card buttons
 * @returns {void}
 */
const setupBookCardButtons = () => {
    try {
        document.querySelectorAll(".book-card__btn").forEach(btn => {
            btn.classList.remove("book-card__btn__not__active");
            btn.onclick = function () {
                const flightId = this.getAttribute("data-id");
                selectModalContainer(this, flightId);
            };
        });
    } catch (error) {
        console.error("setupBookCardButtons: " + error.message);
    }
};

/**
 * Runs a timer for session expiry, showing warnings at 6 minutes and on expiry
 * @returns {void}
 */
const executeTimer = () => {
    try {
        if (totalTime <= 0) {
            modalContainer.classList.remove("book-hidden");
            someTime.classList.add("book-hidden");
            noTime.classList.remove("book-hidden");
            return;
        }

        totalTime--;

        if (totalTime === 360 && !warningShown) {
            warningShown = true;
            modalContainer.classList.remove("book-hidden");
            someTime.classList.remove("book-hidden");
        }

        setTimeout(executeTimer, 1000);
    } catch (error) {
        console.error("executeTimer: " + error.message);
    }
};

/**
 * Starts the progress bar animation, incrementing up to 95%
 * @param {number} [interval=500] - The interval in milliseconds
 * @returns {void}
 */
const startProgressBar = (interval = 500) => {
    try {
        clearInterval(progressTimer);
        progressTimer = setInterval(() => {
            if (isClosing) return;
            progress = Math.min(progress + 1, 95);
            progressBar.style.width = `${progress}%`;
        }, interval);
    } catch (error) {
        console.error("startProgressBar: " + error.message);
    }
};

/**
 * Completes the progress bar animation, reaching 100%
 * @returns {void}
 */
const completeProgressBar = () => {
    try {
        clearInterval(progressTimer);
        const finalInterval = setInterval(() => {
            progress = Math.min(progress + 10, 100);
            progressBar.style.width = `${progress}%`;
            if (progress >= 100) clearInterval(finalInterval);
        }, 20);
    } catch (error) {
        console.error("completeProgressBar: " + error.message);
    }
};

/**
 * Global state for flight filtering, sorting, and pagination
 */
let outboundAirlineList = [];
let inboundAirlineList = [];
let airlineList = [];
let outboundAirportList = [];
let inboundAirportList = [];
let airportList = [];
let outboundStopList = [];
let inboundStopList = [];
let stopList = [];
let outboundBaggageList = [];
let inboundBaggageList = [];
let baggageList = [];
let outboundAirlineNames = [];
let inboundAirlineNames = [];
let airlineNames = [];
let outboundAirportNames = [];
let inboundAirportNames = [];
let airportNames = [];
let outboundStopNames = [];
let inboundStopNames = [];
let stopNames = [];
let outboundBaggageNames = [];
let inboundBaggageNames = [];
let baggageNames = [];
let outboundFlightNumberNames = [];
let inboundFlightNumberNames = [];
let flightNumberNames = [];
let outboundDepartureTimeNames = [];
let inboundDepartureTimeNames = [];
let departureTimeNames = [];
let currency = "";


let currentDragType = null;
let priceSliderInitialized = false;
let cardEventsInitialized = false;
let userHasChangedPriceRange = false;
let lastUserMinPrice = 0;
let lastUserMaxPrice = 0;
let isDragging = false;
let dragStartTime = 0;
const DEBOUNCE_DELAY = 150;
let isSliderInitialized = false;


// Cached DOM elements for hour range sliders
const outboundHourMinValueLabel = document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-min__value");
const outboundHourMaxValueLabel = document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-max__value");
let outboundMinHour = 0;
let outboundMaxHour = 0;
let outboundHourRange = [0, Infinity];

const inboundHourMinValueLabel = document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-min__value");
const inboundHourMaxValueLabel = document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-max__value");
let inboundMinHour = 0;
let inboundMaxHour = 0;
let inboundHourRange = [0, Infinity];

const hourMinValueLabel = document.querySelector(".book-hour__content .book-filter__hour__container .book-min__value");
const hourMaxValueLabel = document.querySelector(".book-hour__content .book-filter__hour__container .book-max__value");
let minHour = 0;
let maxHour = 0;
let hourRange = [0, Infinity];

// Additional filter and UI state
let systemFlightNames = [];
let fareFamilyNames = [];
let selectedFlightId = null;
let dictionaries = [];
let FlightProposalsSource = [];
let mustUpdate = true;
let newDataCame = false;
let InUpdateUIProcess = false;
let InUpdatePaging = true;
let InUpdateFiltering = true;
let allDataProcessed = false;

// Cached DOM elements for price slider
const priceSlider = document.querySelector(".book-filter__price__container .book-slider__content");
const priceTrack = document.querySelector(".book-filter__price__container .book-slider__track");
const priceThumbMin = document.querySelector(".book-filter__price__container .book-thumb__min");
const priceThumbMax = document.querySelector(".book-filter__price__container .book-thumb__max");
let priceMinValueLabel = document.querySelector(".book-filter__price__container .book-min__value");
let priceMaxValueLabel = document.querySelector(".book-filter__price__container .book-max__value");
let minPrice = 0;
let maxPrice = 0;
let priceRange = [0, Infinity];
// let minPercent = 0;
// let maxPercent = 100;
let currentSort = { value: "default", order: "" };
let elseExecuted = false;
let allFlightProposals = [];
let originalFlightProposals = [];
const filterContent = document.querySelector(".book-aside__filter__content");
/**
 * Main function to process flight data, handle filtering, sorting, and pagination
 * @param {Object} args - Input arguments containing source data and context
 * @returns {void}
 */
startProgressBar(1000);
/**
 * Flight Search Manipulation Function - BasisCore Client
 * Handles pagination, filtering, and sorting for flight search results
 */
const manipulation = async (args) => {
    // ============= INITIALIZATION =============
    let currentIndex = 0;
    let start = 0;
    let end = 30;
    let dynamicFlightProposalsCount = 0;
    elseExecuted = false;
    startProgressBar();
    //  const airline__swiper = document.querySelector(".book-airline__swiper");
    // if (window.airline__swiper) {
    //     window.airline__swiper.update()
    // }
    // updateSwiperRepeatedly(airline__swiper,20,100)

    // ============= PAGINATION HANDLERS =============
    if (args.source.id === 'cms.page') {
        scrollToMainContent();
        mustUpdate = true;
        InUpdatePaging = false;
        InUpdateFiltering = false;
        selectedFlightId = null;

        const currentValue = parseInt(args.source.rows[0].value);
        const prevButton = document.querySelector(".book-prevpage");
        const nextButton = document.querySelector(".book-nextpage");
        const pagingContainer = document.querySelector(".book-paging__cards__container");

        // Update active page styling
        const activeButton = document.querySelector(".book-active__paging");
        activeButton.classList.remove("book-active__paging");
        activeButton.classList.add("bg-white");
        const newActive = pagingContainer.querySelector(`[bc-value="${currentValue}"]`);
        newActive.classList.add("book-active__paging");
        newActive.classList.remove("bg-white");

        // Calculate pagination range
        start = currentValue * 30;
        end = start + 30;

        // Toggle previous button visibility
        prevButton.classList.toggle("book-hidden", currentValue === 0);

        // Toggle next button visibility
        const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
        const lastButton = allButtons[allButtons.length - 1];
        nextButton.classList.toggle("book-hidden", newActive === lastButton);

    } else if (args.source.id === 'cms.nextpage') {
        scrollToMainContent();
        mustUpdate = true;
        InUpdatePaging = false;
        InUpdateFiltering = false;
        selectedFlightId = null;

        const prevButton = document.querySelector(".book-prevpage");
        const nextButton = document.querySelector(".book-nextpage");
        const activeButton = document.querySelector(".book-active__paging");
        const currentValue = parseInt(activeButton.getAttribute("bc-value"));
        const nextValue = currentValue + 1;
        const nextPage = document.querySelector(`.book-paging__cards__container [bc-value="${nextValue}"]`);

        if (nextPage) {
            // Update active page styling
            activeButton.classList.remove("book-active__paging");
            activeButton.classList.add("bg-white");
            nextPage.classList.add("book-active__paging");
            nextPage.classList.remove("bg-white");

            // Show next page if hidden
            if (nextPage.classList.contains("book-hidden")) {
                nextPage.classList.remove("book-hidden");
                const firstVisible = document.querySelector(".book-paging__container:not(.hidden):not(.book-prevpage):not(.book-nextpage)");
                if (firstVisible) firstVisible.classList.add("book-hidden");
            }

            // Show previous button if not on first page
            prevButton.classList.toggle("book-hidden", nextValue === 0);
        }

        // Toggle next button visibility
        const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
        const lastButton = allButtons[allButtons.length - 1];
        nextButton.classList.toggle("book-hidden", nextPage === lastButton);

        // Update pagination range
        start = nextValue * 30;
        end = start + 30;

    } else if (args.source.id === 'cms.prevpage') {
        scrollToMainContent();
        mustUpdate = true;
        InUpdatePaging = false;
        InUpdateFiltering = false;
        selectedFlightId = null;

        const prevButton = document.querySelector(".book-prevpage");
        const nextButton = document.querySelector(".book-nextpage");
        const activeButton = document.querySelector(".book-active__paging");
        const currentValue = parseInt(activeButton.getAttribute("bc-value"));
        const prevValue = currentValue - 1;
        const prevPage = document.querySelector(`.book-paging__cards__container [bc-value="${prevValue}"]`);

        if (prevPage) {
            // Update active page styling
            activeButton.classList.remove("book-active__paging");
            activeButton.classList.add("bg-white");
            prevPage.classList.add("book-active__paging");
            prevPage.classList.remove("bg-white");

            // Show previous page if hidden
            if (prevPage.classList.contains("book-hidden")) {
                prevPage.classList.remove("book-hidden");
                const allButtons = Array.from(document.querySelectorAll(".book-paging__container:not(.book-prevpage):not(.book-nextpage)"));
                const lastVisible = allButtons.reverse().find(btn => !btn.classList.contains("book-hidden"));
                if (lastVisible) lastVisible.classList.add("book-hidden");
            }

            // Toggle previous and next button visibility
            prevButton.classList.toggle("book-hidden", prevValue === 0);
            nextButton.classList.remove("book-hidden");
        }

        // Update pagination range
        start = prevValue * 30;
        end = start + 30;

        // ============= AIRLINE FILTER HANDLERS =============
    } else if (args.source.id === "cms.outboundairline") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = outboundAirlineNames.indexOf(value);

        if (index !== -1) {
            outboundAirlineNames.splice(index, 1);
            toggleFilterCheckbox(".book-outboundairline__content", value, false);
        } else {
            outboundAirlineNames.push(value);
            toggleFilterCheckbox(".book-outboundairline__content", value, true);
        }

    } else if (args.source.id === "cms.inboundairline") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = inboundAirlineNames.indexOf(value);

        if (index !== -1) {
            inboundAirlineNames.splice(index, 1);
            toggleFilterCheckbox(".book-inboundairline__content", value, false);
        } else {
            inboundAirlineNames.push(value);
            toggleFilterCheckbox(".book-inboundairline__content", value, true);
        }

    } else if (args.source.id === "cms.airline") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = airlineNames.indexOf(value);

        if (index !== -1) {
            airlineNames.splice(index, 1);
            toggleFilterCheckbox(".book-airline__content", value, false);
        } else {
            airlineNames.push(value);
            toggleFilterCheckbox(".book-airline__content", value, true);
        }

        // ============= AIRPORT FILTER HANDLERS =============
    } else if (args.source.id === "cms.outboundairport") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = outboundAirportNames.indexOf(value);

        if (index !== -1) {
            outboundAirportNames.splice(index, 1);
            toggleFilterCheckbox(".book-outboundairport__content", value, false);
        } else {
            outboundAirportNames.push(value);
            toggleFilterCheckbox(".book-outboundairport__content", value, true);
        }

    } else if (args.source.id === "cms.inboundairport") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = inboundAirportNames.indexOf(value);

        if (index !== -1) {
            inboundAirportNames.splice(index, 1);
            toggleFilterCheckbox(".book-inboundairport__content", value, false);
        } else {
            inboundAirportNames.push(value);
            toggleFilterCheckbox(".book-inboundairport__content", value, true);
        }

    } else if (args.source.id === "cms.airport") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = airportNames.indexOf(value);

        if (index !== -1) {
            airportNames.splice(index, 1);
            toggleFilterCheckbox(".book-airport__content", value, false);
        } else {
            airportNames.push(value);
            toggleFilterCheckbox(".book-airport__content", value, true);
        }

        // ============= STOP FILTER HANDLERS =============
    } else if (args.source.id === "cms.outboundstop") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const stopValue = parseInt(args.source.rows[0].value.split('-')[1]);
        const index = outboundStopNames.indexOf(stopValue);

        if (index !== -1) {
            outboundStopNames.splice(index, 1);
            toggleFilterCheckbox(".book-outboundstop__content", args.source.rows[0].value, false, "");
        } else {
            outboundStopNames.push(stopValue);
            toggleFilterCheckbox(".book-outboundstop__content", args.source.rows[0].value, true, "");
        }

    } else if (args.source.id === "cms.inboundstop") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const stopValue = parseInt(args.source.rows[0].value.split('-')[1]);
        const index = inboundStopNames.indexOf(stopValue);

        if (index !== -1) {
            inboundStopNames.splice(index, 1);
            toggleFilterCheckbox(".book-inboundstop__content", args.source.rows[0].value, false, "");
        } else {
            inboundStopNames.push(stopValue);
            toggleFilterCheckbox(".book-inboundstop__content", args.source.rows[0].value, true, "");
        }

    } else if (args.source.id === "cms.stop") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const stopValue = parseInt(args.source.rows[0].value.split('-')[1]);
        const index = stopNames.indexOf(stopValue);

        if (index !== -1) {
            stopNames.splice(index, 1);
            toggleFilterCheckbox(".book-stop__content", args.source.rows[0].value, false, "");
        } else {
            stopNames.push(stopValue);
            toggleFilterCheckbox(".book-stop__content", args.source.rows[0].value, true, "");
        }

        // ============= FLIGHT NUMBER FILTER HANDLERS =============
    } else if (args.source.id === "cms.outboundflightnumber") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const flightNumberValue = args.source.rows[0].value.trim();

        if (flightNumberValue === "") {
            outboundFlightNumberNames = [];
            if (isMobile) {
                removeFilterDiv("outbound-flight-number");
            }
        } else {
            // outboundFlightNumberNames = flightNumberValue
            //     .split(",")
            //     .map(item => item.trim().toLowerCase())
            //     .filter(item => item !== "");
            outboundFlightNumberNames = [flightNumberValue.toLowerCase()];

            // Mobile version handling
            if (isMobile) {
                removeFilterDiv("outbound-flight-number");
                addFilterDiv("outbound-flight-number", "cms.outboundflightnumber", flightNumberValue);
            }
        }

    } else if (args.source.id === "cms.inboundflightnumber") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const flightNumberValue = args.source.rows[0].value.trim();

        if (flightNumberValue === "") {
            inboundFlightNumberNames = [];
            if (isMobile) {
                removeFilterDiv("inbound-flight-number");
            }
        } else {
            inboundFlightNumberNames = [flightNumberValue.toLowerCase()];

            // Mobile version handling
            if (isMobile) {
                removeFilterDiv("inbound-flight-number");
                addFilterDiv("inbound-flight-number", "cms.inboundflightnumber", flightNumberValue);
            }
        }

    } else if (args.source.id === "cms.flightnumber") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const flightNumberValue = args.source.rows[0].value.trim();

        if (flightNumberValue === "") {
            flightNumberNames = [];
            if (isMobile) {
                removeFilterDiv("flight-number");
            }
        } else {
            flightNumberNames = [flightNumberValue.toLowerCase()];

            // Mobile version handling
            if (isMobile) {
                removeFilterDiv("flight-number");
                addFilterDiv("flight-number", "cms.flightnumber", flightNumberValue);
            }
        }

        // ============= DEPARTURE TIME FILTER HANDLERS =============
    } else if (args.source.id === "cms.outbounddeparturetime") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        const content = document.querySelector(".book-outbounddeparturetime__content");
        if (!content) return;

        const value = args.source.rows[0].value;
        const selectedEl = content.querySelector(`[bc-value="${value}"]`);
        if (!selectedEl) return;

        const timePeriod = selectedEl.dataset.timePeriod || "";
        const timeRange = selectedEl.dataset.timeRange || "";
        const flexContainer = content.querySelector(".book-times__content");
        const index = outboundDepartureTimeNames.indexOf(value);

        if (index !== -1) {
            // Remove time filter
            outboundDepartureTimeNames.splice(index, 1);
            toggleFilterCheckbox(".book-outbounddeparturetime__content", value, false, "");
            const existingElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
            if (existingElement) existingElement.remove();

            // Restore default time content if none exists
            if (!content.querySelector(".book-time__content")) {
                const defaultTimeContent = document.createElement("div");
                defaultTimeContent.className = "book-time__content";
                defaultTimeContent.setAttribute("data-value", "time");
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${translate('morning_period')}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">5:00 ${translate('until_time')} 11:59</span>
                    </div>
                `;
                content.insertBefore(defaultTimeContent, flexContainer);
            }
        } else {
            // Add time filter
            outboundDepartureTimeNames.push(value);
            toggleFilterCheckbox(".book-outbounddeparturetime__content", value, true, "");
            const existingTimeContents = content.querySelectorAll(".book-time__content");

            if (existingTimeContents.length === 1 && outboundDepartureTimeNames.length === 1) {
                const defaultTimeContent = existingTimeContents[0];
                defaultTimeContent.setAttribute("data-value", value);
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">${timeRange}</span>
                    </div>
                `;
            } else {
                const duplicateElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
                if (duplicateElement) duplicateElement.remove();

                const newTimeContent = document.createElement("div");
                newTimeContent.className = "book-time__content";
                newTimeContent.setAttribute("data-value", value);
                newTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">${timeRange}</span>
                    </div>
                `;
                content.insertBefore(newTimeContent, flexContainer);
            }
        }

    } else if (args.source.id === "cms.inbounddeparturetime") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        const content = document.querySelector(".book-inbounddeparturetime__content");
        if (!content) return;

        const value = args.source.rows[0].value;
        const selectedEl = content.querySelector(`[bc-value="${value}"]`);
        if (!selectedEl) return;

        const timePeriod = selectedEl.dataset.timePeriod || "";
        const timeRange = selectedEl.dataset.timeRange || "";
        const flexContainer = content.querySelector(".book-times__content");
        const index = inboundDepartureTimeNames.indexOf(value);

        if (index !== -1) {
            // Remove time filter
            inboundDepartureTimeNames.splice(index, 1);
            toggleFilterCheckbox(".book-inbounddeparturetime__content", value, false, "");
            const existingElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
            if (existingElement) existingElement.remove();

            if (!content.querySelector(".book-time__content")) {
                const defaultTimeContent = document.createElement("div");
                defaultTimeContent.className = "book-time__content";
                defaultTimeContent.setAttribute("data-value", "time");
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${translate('morning_period')}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">5:00 ${translate('until_time')} 11:59</span>
                    </div>
                `;
                content.insertBefore(defaultTimeContent, flexContainer);
            }
        } else {
            // Add time filter
            inboundDepartureTimeNames.push(value);
            toggleFilterCheckbox(".book-inbounddeparturetime__content", value, true, "");
            const existingTimeContents = content.querySelectorAll(".book-time__content");

            if (existingTimeContents.length === 1 && inboundDepartureTimeNames.length === 1) {
                const defaultTimeContent = existingTimeContents[0];
                defaultTimeContent.setAttribute("data-value", value);
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">${timeRange}</span>
                    </div>
                `;
            } else {
                const duplicateElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
                if (duplicateElement) duplicateElement.remove();

                const newTimeContent = document.createElement("div");
                newTimeContent.className = "book-time__content";
                newTimeContent.setAttribute("data-value", value);
                newTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">${timeRange}</span>
                    </div>
                `;
                content.insertBefore(newTimeContent, flexContainer);
            }
        }

    } else if (args.source.id === "cms.departuretime") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        const content = document.querySelector(".book-departuretime__content");
        if (!content) return;

        const value = args.source.rows[0].value;
        const selectedEl = content.querySelector(`[bc-value="${value}"]`);
        if (!selectedEl) return;

        const timePeriod = selectedEl.dataset.timePeriod || "";
        const timeRange = selectedEl.dataset.timeRange || "";
        const flexContainer = content.querySelector(".book-times__content");
        const index = departureTimeNames.indexOf(value);

        if (index !== -1) {
            // Remove time filter
            departureTimeNames.splice(index, 1);
            toggleFilterCheckbox(".book-departuretime__content", value, false, "");
            const existingElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
            if (existingElement) existingElement.remove();

            if (!content.querySelector(".book-time__content")) {
                const defaultTimeContent = document.createElement("div");
                defaultTimeContent.className = "book-time__content";
                defaultTimeContent.setAttribute("data-value", "time");
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${translate('morning_period')}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">5:00 ${translate('until_time')} 11:59</span>
                    </div>
                `;
                content.insertBefore(defaultTimeContent, flexContainer);
            }
        } else {
            // Add time filter
            departureTimeNames.push(value);
            toggleFilterCheckbox(".book-departuretime__content", value, true, "");
            const existingTimeContents = content.querySelectorAll(".book-time__content");

            if (existingTimeContents.length === 1 && departureTimeNames.length === 1) {
                const defaultTimeContent = existingTimeContents[0];
                defaultTimeContent.setAttribute("data-value", value);
                defaultTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">${timeRange}</span>
                    </div>
                `;
            } else {
                const duplicateElement = content.querySelector(`.book-time__content[data-value="${value}"]`);
                if (duplicateElement) duplicateElement.remove();

                const newTimeContent = document.createElement("div");
                newTimeContent.className = "book-time__content";
                newTimeContent.setAttribute("data-value", value);
                newTimeContent.innerHTML = `
                    <div class="book-text-primary-300 book-text-sm book-mb-1 book-heading">${timePeriod}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mb-4">
                        ${translate('time_from_label')} <span class="book-hour">${timeRange}</span>
                    </div>
                `;
                content.insertBefore(newTimeContent, flexContainer);
            }
        }

        // ============= SYSTEM FLIGHT & FARE FAMILY FILTERS =============
    } else if (args.source.id === "cms.systemflight") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = systemFlightNames.indexOf(value);

        if (index !== -1) {
            systemFlightNames.splice(index, 1);
            toggleFilterCheckbox(".book-systemflight__content", value, false);
        } else {
            systemFlightNames.push(value);
            toggleFilterCheckbox(".book-systemflight__content", value, true);
        }

    } else if (args.source.id === "cms.farefamily") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const value = args.source.rows[0].value;
        const index = fareFamilyNames.indexOf(value);

        if (index !== -1) {
            fareFamilyNames.splice(index, 1);
            toggleFilterCheckbox(".book-farefamily__content", value, false);
        } else {
            fareFamilyNames.push(value);
            toggleFilterCheckbox(".book-farefamily__content", value, true);
        }

        // ============= PRICE FILTER HANDLER =============
    } else if (args.source.id === "cms.price") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;

        if (!priceSlider) {
            return;
        }

        if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
            return;
        }

        cleanupPriceSliderEvents();

        // ===== Desktop Mouse Events =====
        if (!isMobile) {
            setupDesktopPriceSlider(args.source.rows[0].value);
        }
        // ===== Mobile Touch Events =====
        else {
            setupMobilePriceSlider(args.source.rows[0].value);
        }
    } else if (args.source.id === "cms.price.update") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        mustUpdate = true;

    } else if (args.source.id === "cms.outboundhour") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;

        if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
            return;
        }

        cleanupDurationSliderEvents();
        activeDurationSliderType = 'outbound';

        if (!isMobile) {
            setupDesktopDurationSlider(args.source.rows[0].value);
        } else {
            setupMobileDurationSlider(args.source.rows[0].value);
        }

    } else if (args.source.id === "cms.inboundhour") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;

        if (!args.source.rows || !Array.isArray(args.source.rows) || args.source.rows.length === 0) {
            return;
        }

        cleanupDurationSliderEvents();
        activeDurationSliderType = 'inbound';

        if (!isMobile) {
            setupDesktopDurationSlider(args.source.rows[0].value);
        } else {
            setupMobileDurationSlider(args.source.rows[0].value);
        }

    } else if (args.source.id === "cms.outboundhour.update" || args.source.id === "cms.inboundhour.update") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        mustUpdate = true;
    } else if (args.source.id === "cms.hour") {

        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const hourContainer = document.querySelector(".book-hour__content .book-filter__hour__container");

        initializeSlider(
            hourContainer,
            args.source.rows[0].value,
            maxHour,
            minHour,
            hourMinValueLabel,
            hourMaxValueLabel,
            hourRange,
            'hour',
            'hour-range'
        );

        // ============= BAGGAGE FILTER HANDLERS =============
    } else if (args.source.id === "cms.outboundbaggage") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const baggageValue = args.source.rows[0].value.split('-')[1] || "-";
        const index = outboundBaggageNames.indexOf(baggageValue);

        if (index !== -1) {
            outboundBaggageNames.splice(index, 1);
            toggleFilterCheckbox(".book-outboundbaggage__content", args.source.rows[0].value, false);
        } else {
            outboundBaggageNames.push(baggageValue);
            toggleFilterCheckbox(".book-outboundbaggage__content", args.source.rows[0].value, true);
        }

    } else if (args.source.id === "cms.inboundbaggage") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const baggageValue = args.source.rows[0].value.split('-')[1] || "-";
        const index = inboundBaggageNames.indexOf(baggageValue);

        if (index !== -1) {
            inboundBaggageNames.splice(index, 1);
            toggleFilterCheckbox(".book-inboundbaggage__content", args.source.rows[0].value, false);
        } else {
            inboundBaggageNames.push(baggageValue);
            toggleFilterCheckbox(".book-inboundbaggage__content", args.source.rows[0].value, true);
        }

    } else if (args.source.id === "cms.baggage") {
        scrollToMainContent();
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const baggageValue = args.source.rows[0].value.split('-')[1] || "-";
        const index = baggageNames.indexOf(baggageValue);

        if (index !== -1) {
            baggageNames.splice(index, 1);
            toggleFilterCheckbox(".book-baggage__content", args.source.rows[0].value, false);
        } else {
            baggageNames.push(baggageValue);
            toggleFilterCheckbox(".book-baggage__content", args.source.rows[0].value, true);
        }

        // ============= SORT HANDLER =============
    } else if (args.source.id === "cms.sort") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = null;
        const sortValue = args.source.rows[0].value;
        const sortItem = document.querySelector(`[bc-value="${sortValue}"]`);
        const sortOrder = sortItem.getAttribute('data-sort');
        const listItems = document.querySelectorAll(".book-sort__cards__container .book-sort__item__content");

        // Reset all sort items
        listItems.forEach(item => {
            if (item.getAttribute('data-sort')) {
                item.setAttribute('data-sort', 'ascend');
            }
            const svg = item.querySelector('svg');
            if (svg) {
                svg.innerHTML = '<use xlink:href="/booking/images/sprite-booking-icons.svg#sort-up-icon"></use>';
            }
            item.classList.remove('book-sorting__active');
        });

        if (sortValue === "default") {
            currentSort = { value: "default", order: "" };
        } else {
            const newOrder = sortOrder === "ascend" ? "descend" : "ascend";
            sortItem.setAttribute('data-sort', newOrder);
            sortItem.classList.add('book-sorting__active');
            toggleSvg(sortItem.querySelector('svg'), newOrder === "ascend");
            currentSort = { value: sortValue, order: newOrder };
        }
        mustUpdate = true;

        // ============= FLIGHT SELECTION HANDLER =============
    } else if (args.source.id === "cms.flight") {
        InUpdateFiltering = false;
        InUpdatePaging = true;
        selectedFlightId = args.source.rows[0].value;

        // ============= NEW FLIGHT DATA HANDLER =============
    } else if (args.source.id === "flight.list") {
        newDataCame = true;
        allDataProcessed = false;
    }

    // ============= UI UPDATE PROCESS =============
    if (mustUpdate && !InUpdateUIProcess) {
        InUpdateUIProcess = true;

        // Collect new flight proposals and reset for new searches
        if (newDataCame) {
            const source = args.context.tryToGetSource("flight.list");

            // Reset data for new searches
            if (source.rows[0]?.isNewSearch) {
                allFlightProposals = [];
                dictionaries = [];
            }

            const existingFlightIds = new Set(allFlightProposals.map(flight => flight.FlightId));
            source.rows.forEach(row => {
                if (Array.isArray(row.FlightProposals)) {
                    const newFlights = row.FlightProposals.filter(flight => !existingFlightIds.has(flight.FlightId));
                    allFlightProposals.push(...newFlights);
                    originalFlightProposals = [...allFlightProposals];
                    newFlights.forEach(flight => existingFlightIds.add(flight.FlightId));
                }
            });

            dictionaries.push(source.rows[source.rows.length - 1].dictionaries);
            newDataCame = false;
            allDataProcessed = true;
        }

        const flightList = args.context.tryToGetSource("flight.updated");

        // ============= SORTING LOGIC =============
        if (allDataProcessed) {
            if (currentSort.value === "default") {
                // Sort by price ascending by default
                allFlightProposals.sort((a, b) => {
                    const priceA = a.PriceInfo?.TotalCommission ? parseFloat(a.PriceInfo.TotalCommission) : Infinity;
                    const priceB = b.PriceInfo?.TotalCommission ? parseFloat(b.PriceInfo.TotalCommission) : Infinity;
                    return priceA - priceB;
                });
            } else {
                allFlightProposals.sort((a, b) => {
                    let fieldA, fieldB;

                    if (currentSort.value === "price") {
                        fieldA = a.PriceInfo?.TotalCommission ? parseFloat(a.PriceInfo.TotalCommission) : Infinity;
                        fieldB = b.PriceInfo?.TotalCommission ? parseFloat(b.PriceInfo.TotalCommission) : Infinity;
                    } else if (currentSort.value === "stop") {
                        fieldA = a.FlightGroup?.[0]?.NumberOfStops || 0;
                        fieldB = b.FlightGroup?.[0]?.NumberOfStops || 0;
                    } else if (currentSort.value === "time") {
                        fieldA = convertToMinutes(a.FlightGroup?.[0]?.Duration || "");
                        fieldB = convertToMinutes(b.FlightGroup?.[0]?.Duration || "");
                    } else if (currentSort.value === "hour") {
                        fieldA = convertToMinutes(a.FlightGroup?.[0]?.DepartureTime || "");
                        fieldB = convertToMinutes(b.FlightGroup?.[0]?.DepartureTime || "");
                    }

                    if (fieldA !== undefined && fieldB !== undefined) {
                        return currentSort.order === "ascend" ? fieldA - fieldB : fieldB - fieldA;
                    }
                    return 0;
                });
            }
        }

        // ============= FILTERING LOGIC =============
        const filters = [
            // Airline filters
            item => !outboundAirlineNames.length || item.FlightGroup[0]?.RoutesInfo.some(route => outboundAirlineNames.includes(route.AirlineCode)),
            item => !inboundAirlineNames.length || (item.FlightGroup[1]?.RoutesInfo || []).some(route => inboundAirlineNames.includes(route.AirlineCode)),
            item => !airlineNames.length || item.FlightGroup.some(flight => flight.RoutesInfo.some(route => airlineNames.includes(route.AirlineCode))),

            // Airport filters
            item => !outboundAirportNames.length || item.FlightGroup[0]?.RoutesInfo.some(route => outboundAirportNames.includes(route.DestinationAirport)),
            item => !inboundAirportNames.length || (item.FlightGroup[1]?.RoutesInfo || []).some(route => inboundAirportNames.includes(route.DestinationAirport)),
            item => !airportNames.length || item.FlightGroup.some(flight => flight.RoutesInfo.some(route => airportNames.includes(route.DestinationAirport))),

            // Stop filters
            item => !outboundStopNames.length || outboundStopNames.includes(parseInt(item.FlightGroup[0]?.NumberOfStops)),
            item => !inboundStopNames.length || inboundStopNames.includes(parseInt(item.FlightGroup[1]?.NumberOfStops)),
            item => !stopNames.length || item.FlightGroup.some(flight => stopNames.includes(parseInt(flight.NumberOfStops))),

            // Flight number filters
            item => !outboundFlightNumberNames.length || outboundFlightNumberNames.every(fn => item.FlightGroup[0]?.RoutesInfo.some(route => route.FlightNumber.toLowerCase().startsWith(fn))),
            item => !inboundFlightNumberNames.length || inboundFlightNumberNames.every(fn => item.FlightGroup[1]?.RoutesInfo.some(route => route.FlightNumber.toLowerCase().startsWith(fn))),
            item => !flightNumberNames.length || flightNumberNames.every(fn => item.FlightGroup.some(flight => flight.RoutesInfo.some(route => route.FlightNumber.toLowerCase().startsWith(fn)))),

            // Baggage filters
            item => !outboundBaggageNames.length || outboundBaggageNames.includes(item.Baggages[0]?.Baggage),
            item => !inboundBaggageNames.length || inboundBaggageNames.includes(item.Baggages[1]?.Baggage),
            item => !baggageNames.length || item.Baggages.some(flight => baggageNames.includes(flight.Baggage)),

            // Departure time filters
            item => {
                if (!outboundDepartureTimeNames.length) return true;
                const [hour, minute] = item.FlightGroup[0]?.DepartureTime.split(":").map(Number);
                if (hour == null || minute == null) return false;
                return outboundDepartureTimeNames.some(range => {
                    const [start, end] = range.split("-").map(Number);
                    return hour >= start && hour <= end;
                });
            },
            item => {
                if (!inboundDepartureTimeNames.length) return true;
                const [hour, minute] = item.FlightGroup[1]?.DepartureTime?.split(":")?.map(Number) || [];
                if (hour == null || minute == null) return false;
                return inboundDepartureTimeNames.some(range => {
                    const [start, end] = range.split("-").map(Number);
                    return hour >= start && hour <= end;
                });
            },
            item => {
                if (!departureTimeNames.length) return true;
                return item.FlightGroup.some(flight => {
                    const [hour, minute] = flight.DepartureTime?.split(":")?.map(Number) || [];
                    if (hour == null || minute == null) return false;
                    return departureTimeNames.some(range => {
                        const [start, end] = range.split("-").map(Number);
                        return hour >= start && hour <= end;
                    });
                });
            },
            // ============= DURATION FILTERS (FIXED) =============
            // Outbound duration filter (for one-way and round-trip)
            item => {
                // Only apply outbound filter for schemas 290 (round-trip) and 291 (one-way)
                if (schemaId !== 290 && schemaId !== 291) return true;

                // Check if outbound filter is active (range changed from default)
                if (outboundHourRange[0] === outboundMinHour && outboundHourRange[1] === outboundMaxHour) {
                    return true; // No filter applied
                }

                const outboundDuration = item.FlightGroup[0]?.Duration;
                if (!outboundDuration) return false;

                const outboundDurationInMinutes = convertToMinutes(outboundDuration);
                return outboundDurationInMinutes >= outboundHourRange[0] &&
                    outboundDurationInMinutes <= outboundHourRange[1];
            },

            // Inbound duration filter (only for round-trip)  
            item => {
                // Only apply inbound filter for schema 290 (round-trip)
                if (schemaId !== 290) return true;

                // Check if inbound filter is active (range changed from default)
                if (inboundHourRange[0] === inboundMinHour && inboundHourRange[1] === inboundMaxHour) {
                    return true; // No filter applied
                }

                const inboundDuration = item.FlightGroup[1]?.Duration;
                if (!inboundDuration) return false;

                const inboundDurationInMinutes = convertToMinutes(inboundDuration);
                return inboundDurationInMinutes >= inboundHourRange[0] &&
                    inboundDurationInMinutes <= inboundHourRange[1];
            },

            // General duration filter (for multi-city)
            item => {
                // Only apply general filter for schema 292 (multi-city)
                if (schemaId !== 292) return true;

                // Check if general filter is active (range changed from default)
                if (hourRange[0] === minHour && hourRange[1] === maxHour) {
                    return true; // No filter applied
                }

                return item.FlightGroup.some(flight => {
                    const duration = flight.Duration;
                    if (!duration) return false;

                    const durationInMinutes = convertToMinutes(duration);
                    return durationInMinutes >= hourRange[0] && durationInMinutes <= hourRange[1];
                });
            },

            // System flight and fare family filters
            item => !systemFlightNames.length || item.FlightGroup.some(flight => systemFlightNames.includes(flight.isSystemFlight)),
            item => !fareFamilyNames.length || (fareFamilyNames.includes("farefamily") && item.FlightGroup.some(flight => flight.FareFamily === true)),

            // Price filter
            item => {
                const price = item.PriceInfo?.TotalCommission ? parseFloat(item.PriceInfo.TotalCommission) : Infinity;
                return price >= priceRange[0] && price <= priceRange[1];
            }
        ];

        // Filter flight proposals
        const newSource = allFlightProposals.filter(item => filters.every(filter => filter(item)));

        // Update flight count display
        dynamicFlightProposalsCount = newSource.length;
        document.querySelector(".book-count__api__content").textContent = dynamicFlightProposalsCount;

        // Add index and selection state
        const indexedSource = newSource.map((item, i) => ({
            ...item,
            SelectedFlight: item.FlightId === selectedFlightId,
            index: currentIndex + i
        }));
        currentIndex += newSource.length;

        // Handle selected flight scrolling
        const selectedIndex = indexedSource.findIndex(item => item.SelectedFlight);
        if (selectedIndex !== -1) {
            const page = Math.floor(selectedIndex / 30);
            start = page * 30;
            end = start + 30;
            setTimeout(() => {
                const targetElement = document.getElementById(`flight__${selectedIndex}`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 100);
        }

        // Apply pagination
        const pagedSource = indexedSource.slice(start, end);
        FlightProposalsSource = pagedSource;

        // ============= UI UPDATE LOGIC =============
        if (pagedSource.length > 0) {
            // Update price range with parsed prices
            const pricesSource = allFlightProposals.map(item => item.PriceInfo?.TotalCommission ? parseFloat(item.PriceInfo.TotalCommission) : null).filter(Boolean);
            minPrice = pricesSource.length ? Math.min(...pricesSource) : 0;
            maxPrice = pricesSource.length ? Math.max(...pricesSource) : 0;
            priceMaxValueLabel.textContent = new Intl.NumberFormat().format(maxPrice);
            priceMinValueLabel.textContent = new Intl.NumberFormat().format(minPrice);

            // Update pagination UI
            if (InUpdatePaging) {
                const container = document.querySelector(".book-paging__cards__container");
                const nextPage = container.querySelector(".book-nextpage");
                const prevPage = container.querySelector(".book-prevpage");
                prevPage.classList.add("book-hidden");

                const roundedNumber = Math.ceil(currentIndex / 30);
                const activePage = selectedIndex !== -1 ? Math.floor(selectedIndex / 30) : 0;
                const maxVisiblePages = 5;
                const startPage = Math.max(0, activePage - Math.floor(maxVisiblePages / 2));
                const endPage = Math.min(roundedNumber, startPage + maxVisiblePages);
                const adjustedStartPage = endPage - startPage < maxVisiblePages ? Math.max(0, endPage - maxVisiblePages) : startPage;

                const arrayPaging = Array.from({ length: roundedNumber }, (_, i) => ({
                    index: i,
                    page: i + 1,
                    isActive: i === activePage,
                    isVisible: i >= adjustedStartPage && i < endPage
                }));

                nextPage.classList.toggle("book-hidden", arrayPaging.length <= 1);
                args.context.setAsSource("flight.paging", arrayPaging);
            }

            // ============= FILTER UPDATE LOGIC =============
            if (InUpdateFiltering) {
                const filteringSource = allFlightProposals;

                // Merge dictionaries for carriers, currency, and locations
                const mergedCarriers = {};
                const mergedCurrency = {};
                const mergedLocation = {};
                dictionaries.forEach(item => {
                    Object.assign(mergedCarriers, item.carriers || {});
                    Object.assign(mergedCurrency, item.currency || {});
                    Object.assign(mergedLocation, item.location || {});
                });

                // Reset airline lists
                let allAirlineItems = [];
                let allOutboundAirlineItems = [];
                let allInboundAirlineItems = [];

                // Collect airline items with parsed prices
                filteringSource.forEach(item => {
                    const airlineItems = (item.FlightGroup || []).flatMap(flight =>
                        (flight.RoutesInfo || []).map(value => ({
                            Name: mergedCarriers[value.AirlineCode]?.name || "",
                            Logo: mergedCarriers[value.AirlineCode]?.image || "",
                            Code: value.AirlineCode || "",
                            NumberOfStops: flight.NumberOfStops || 0,
                            FlightId: item.FlightId || "",
                            Price: item.PriceInfo?.Total ? parseFloat(item.PriceInfo.Total) : Infinity,
                            Unit: mergedCurrency[item.PriceInfo?.Currency] || ""
                        }))
                    ).filter(item => item.Name && item.Code && item.Price !== Infinity);

                    allAirlineItems.push(...airlineItems);

                    if (schemaId === 290 || schemaId === 291) {
                        const outboundAirline = (item.FlightGroup?.[0]?.RoutesInfo || []).map(value => ({
                            Name: mergedCarriers[value.AirlineCode]?.name || "",
                            Logo: mergedCarriers[value.AirlineCode]?.image || "",
                            Code: value.AirlineCode || "",
                            NumberOfStops: item.FlightGroup[0]?.NumberOfStops || 0,
                            FlightId: item.FlightId || "",
                            Price: item.PriceInfo?.Total ? parseFloat(item.PriceInfo.Total) : Infinity,
                            Unit: mergedCurrency[item.PriceInfo?.Currency] || ""
                        })).filter(item => item.Name && item.Code && item.Price !== Infinity);

                        allOutboundAirlineItems.push(...outboundAirline);

                        if (item.FlightGroup?.[1]) {
                            const inboundAirline = (item.FlightGroup[1].RoutesInfo || []).map(value => ({
                                Name: mergedCarriers[value.AirlineCode]?.name || "",
                                Logo: mergedCarriers[value.AirlineCode]?.image || "",
                                Code: value.AirlineCode || "",
                                NumberOfStops: item.FlightGroup[1]?.NumberOfStops || 0,
                                FlightId: item.FlightId || "",
                                Price: item.PriceInfo?.Total ? parseFloat(item.PriceInfo.Total) : Infinity,
                                Unit: mergedCurrency[item.PriceInfo?.Currency] || ""
                            })).filter(item => item.Name && item.Code && item.Price !== Infinity);

                            allInboundAirlineItems.push(...inboundAirline);
                        }
                    }
                });

                // ============= AIRLINE FILTER PROCESSING =============
                // Deduplicate airlines and select lowest price
                const nameToMinPrice = {};
                allAirlineItems.forEach(item => {
                    if (!nameToMinPrice[item.Name] || nameToMinPrice[item.Name].Price > item.Price) {
                        nameToMinPrice[item.Name] = item;
                    }
                });
                const airlineListResult = Object.values(nameToMinPrice).sort((a, b) => a.Price - b.Price);
                args.context.setAsSource("flight.slider", airlineListResult);

                if (schemaId === 290 || schemaId === 291) {
                    // Outbound airline filter
                    const nameToMinPriceOutbound = {};
                    allOutboundAirlineItems.forEach(item => {
                        if (!nameToMinPriceOutbound[item.Name] || nameToMinPriceOutbound[item.Name].Price > item.Price) {
                            nameToMinPriceOutbound[item.Name] = item;
                        }
                    });
                    const outboundAirlineListResult = Object.values(nameToMinPriceOutbound).sort((a, b) => a.Price - b.Price);
                    args.context.setAsSource("flight.outboundairline", outboundAirlineListResult);

                    // Inbound airline filter
                    const nameToMinPriceInbound = {};
                    allInboundAirlineItems.forEach(item => {
                        if (!nameToMinPriceInbound[item.Name] || nameToMinPriceInbound[item.Name].Price > item.Price) {
                            nameToMinPriceInbound[item.Name] = item;
                        }
                    });
                    const inboundAirlineListResult = Object.values(nameToMinPriceInbound).sort((a, b) => a.Price - b.Price);
                    if (inboundAirlineListResult.length > 0) {
                        args.context.setAsSource("flight.inboundairline", inboundAirlineListResult);
                    }

                    // ============= AIRPORT FILTER PROCESSING =============
                    const outboundAirports = filteringSource.flatMap(item =>
                        (item.FlightGroup?.[0]?.RoutesInfo || []).map(value => ({
                            Name: mergedLocation[value.DestinationAirport]?.airport || "",
                            Code: value.DestinationAirport || ""
                        }))
                    ).filter(item => item.Name && item.Code);

                    const inboundAirports = filteringSource.some(item => item.FlightGroup?.[1])
                        ? filteringSource.flatMap(item =>
                            (item.FlightGroup?.[1]?.RoutesInfo || []).map(value => ({
                                Name: mergedLocation[value.DestinationAirport]?.airport || "",
                                Code: value.DestinationAirport || ""
                            }))
                        ).filter(item => item.Name && item.Code)
                        : [];

                    const outboundAirportListResult = outboundAirports.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    const inboundAirportListResult = inboundAirports.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );

                    args.context.setAsSource("flight.outboundairport", outboundAirportListResult);
                    if (inboundAirports.length > 0) {
                        args.context.setAsSource("flight.inboundairport", inboundAirportListResult);
                    }

                    // ============= STOP FILTER PROCESSING =============
                    const outboundStopList = filteringSource
                        .filter(item => item.FlightGroup?.[0]?.NumberOfStops != null)
                        .map(item => ({ Name: item.FlightGroup[0].NumberOfStops }))
                        .filter(item => item.Name != null);

                    const inboundStopList = filteringSource.some(item => item.FlightGroup?.[1])
                        ? filteringSource
                            .filter(item => item.FlightGroup?.[1]?.NumberOfStops != null)
                            .map(item => ({ Name: item.FlightGroup[1].NumberOfStops }))
                            .filter(item => item.Name != null)
                        : [];

                    const outboundStopListResult = outboundStopList.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    const inboundStopListResult = inboundStopList.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );

                    args.context.setAsSource("flight.outboundstop", outboundStopListResult);
                    if (inboundStopList.length > 0) {
                        args.context.setAsSource("flight.inboundstop", inboundStopListResult);
                    }

                    // ============= BAGGAGE FILTER PROCESSING =============
                    const outboundBaggages = filteringSource
                        .map(item => ({ Name: item.Baggages?.[0]?.Baggage, Unit: item.Baggages?.[0]?.Unit }))
                        .filter(item => item.Name != null && item.Unit != null);

                    const inboundBaggages = filteringSource.some(item => item.FlightGroup?.[1])
                        ? filteringSource
                            .map(item => ({ Name: item.Baggages?.[1]?.Baggage, Unit: item.Baggages?.[1]?.Unit }))
                            .filter(item => item.Name != null && item.Unit != null)
                        : [];

                    const outboundBaggageListResult = outboundBaggages.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    const inboundBaggageListResult = inboundBaggages.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );

                    args.context.setAsSource("flight.outboundbaggage", outboundBaggageListResult);
                    if (inboundBaggages.length > 0) {
                        args.context.setAsSource("flight.inboundbaggage", inboundBaggageListResult);
                    }

                    // ============= HOUR RANGE UPDATE =============
                    const outboundHoursSource = allFlightProposals.map(item => item.FlightGroup?.[0]?.Duration).filter(Boolean);
                    const inboundHoursSource = allFlightProposals.map(item => item.FlightGroup?.[1]?.Duration).filter(Boolean);

                    const uniqueHoursSource = [...new Set(outboundHoursSource)];
                    const timesInMinutes = uniqueHoursSource.map(convertToMinutes);
                    outboundMinHour = timesInMinutes.length ? Math.min(...timesInMinutes) : 0;
                    outboundMaxHour = timesInMinutes.length ? Math.max(...timesInMinutes) : 0;
                    outboundHourMaxValueLabel.textContent = convertToTime(outboundMaxHour);
                    outboundHourMinValueLabel.textContent = convertToTime(outboundMinHour);

                    if (inboundHoursSource.length > 0) {
                        const uniqueInboundHours = [...new Set(inboundHoursSource)];
                        const inboundTimesInMinutes = uniqueInboundHours.map(convertToMinutes);
                        inboundMinHour = inboundTimesInMinutes.length ? Math.min(...inboundTimesInMinutes) : 0;
                        inboundMaxHour = inboundTimesInMinutes.length ? Math.max(...inboundTimesInMinutes) : 0;
                        inboundHourMaxValueLabel.textContent = convertToTime(inboundMaxHour);
                        inboundHourMinValueLabel.textContent = convertToTime(inboundMinHour);
                    }

                    // Update trip type visibility
                    document.querySelectorAll(".book-multitrip__content").forEach(e => e.classList.add("book-hidden"));
                    if (schemaId === 290) {
                        document.querySelectorAll(".book-roundtrip__content").forEach(e => e.classList.remove("book-hidden"));
                    }

                } else {
                    // ============= SINGLE TRIP FILTER PROCESSING =============
                    args.context.setAsSource("flight.airline", airlineListResult);

                    // Airport filter
                    const uniqueAirport = filteringSource.flatMap(item =>
                        (item.FlightGroup || []).flatMap(flight =>
                            (flight.RoutesInfo || []).map(value => ({
                                Name: mergedLocation[value.DestinationAirport]?.airport || "",
                                Code: value.DestinationAirport || ""
                            }))
                        )
                    ).filter(item => item.Name && item.Code);

                    const airportListResult = uniqueAirport.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    args.context.setAsSource("flight.airport", airportListResult);

                    // Stop filter
                    const uniqueStop = filteringSource.flatMap(item =>
                        (item.FlightGroup || []).map(flight => ({ Name: flight.NumberOfStops }))
                    ).filter(item => item.Name != null);

                    const stopListResult = uniqueStop.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    args.context.setAsSource("flight.stop", stopListResult);

                    // Baggage filter
                    const uniqueBaggage = filteringSource.flatMap(item =>
                        (item.Baggages || []).map(value => ({ Name: value.Baggage, Unit: value.Unit }))
                    ).filter(item => item.Name != null && item.Unit != null);

                    const baggageListResult = uniqueBaggage.filter((item, index, self) =>
                        index === self.findIndex(t => t.Name === item.Name)
                    );
                    args.context.setAsSource("flight.baggage", baggageListResult);

                    // Update trip type visibility
                    document.querySelectorAll(".book-multitrip__content").forEach(e => e.classList.remove("book-hidden"));
                    document.querySelectorAll(".book-roundtrip__content").forEach(e => e.classList.add("book-hidden"));
                    document.querySelectorAll(".book-onewaytrip__content").forEach(e => e.classList.add("book-hidden"));
                }
            } else {
                setTimeout(() => {
                    setupBookCardButtons();
                }, 0);
            }

            // Update flight list
            args.context.setAsSource("flight.updated", pagedSource, { keyFieldName: "FlightId" });
            setTimeout(() => {
                preservePriceLabels();
            }, 10);
            InUpdateUIProcess = false;

        } else {
            // ============= NO RESULTS HANDLING =============
            InUpdateUIProcess = false;

            // Display no flights found message using translations
            document.querySelector(".book-list__cards__container").innerHTML = `
                <div class="book-text-center">
                    <div>${translate('no_flights_matching_filters')}</div>
                    <div class="book-text-zinc-900 book-text-xs book-mt-2">${translate('clear_filters_to_see_results')}</div>
                </div>
            `;

            // Hide pagination controls when no results
            const container = document.querySelector(".book-paging__cards__container");
            const buttons = container.querySelectorAll(".book-paging__container:not(.book-nextpage):not(.book-prevpage)");
            const nextPage = container.querySelector(".book-nextpage");
            const prevPage = container.querySelector(".book-prevpage");

            prevPage.classList.add("book-hidden");
            nextPage.classList.add("book-hidden");
            buttons.forEach(button => button.remove());
        }
    }
};




/**
 * Global state and cached DOM elements for rendering functions.
 */
let defaultTotalCommission = 0; // Default commission for fare comparison

// Cached DOM elements
const pagingContainer = document.querySelector(".book-paging__cards__container");
const apiContainer = document.querySelector(".book-api__container__rendering");

/**
 * Renders a pagination button for flight search results.
 * @param {Object} element - Pagination data with index, page, isActive, and isVisible properties
 * @returns {string} HTML string for the pagination button
 */
const renderPaging = async (element) => {
    try {
        const { index, page, isActive, isVisible } = element;
        const nextPage = pagingContainer?.querySelector(".book-nextpage");
        const prevPage = pagingContainer?.querySelector(".book-prevpage");

        // Show next button if there are more than 5 pages
        if (index >= 5 && nextPage?.classList.contains("book-hidden")) {
            nextPage.classList.remove("book-hidden");
        }

        // Show previous button if not on the first active page
        if (index > 0 && isActive && prevPage?.classList.contains("book-hidden")) {
            prevPage.classList.remove("book-hidden");
        }

        // Render button with active/visible styling
        // This code is for the mobile version
        return `<button class="book-paging__container book-leading-9 book-border book-border-solid book-border-zinc-200 book-rounded-lg book-w-8 book-h-8${isActive ? ' book-active__paging' : ' book-bg-white'} ${isVisible ? '' : ' book-hidden'}" type="button" bc-value="${index}" bc-name="cms.page" bc-triggers="click">${page}</button>`;
    } catch (error) {
        console.error(`renderPaging: ${error.message}`);
        return "";
    }
};

/**
 * Renders a stop filter item for flight search.
 * @param {Object} element - Stop data with Name property
 * @param {string} type - Type of stop filter (e.g., 'outboundstop', 'inboundstop')
 * @returns {string} HTML string for the stop filter item
 */
const renderStops = async (element, type) => {
    try {
        const stopCount = element.Name;
        const stopMap = {
            0: { text: translate("direct_flight"), img: "without-stop" },
            1: { text: translate("one_stop_flight"), img: "withone-stop" },
            2: { text: translate("multi_stop_flight"), img: "withtwoOrmore-stop" }
        };
        const stop = stopMap[stopCount] || stopMap[2]; // Default to multi-stop for >1

        // Render single or one-stop item
        if (stopCount < 2) {
            return `<div class="book-filter__item book-mt-5 book-flex book-items-center book-justify-between">
        <img src="/booking/images/${stop.img}.png" alt="${stop.text}" />
        <div bc-value="stop-${stopCount}" bc-name="cms.${type}" data-textshow="${stop.text}" bc-triggers="click" class="book-custom__checkbox book-button__content book-text-center book-cursor-pointer book-w-1/2 book-py-3 book-rounded-lg book-border book-border-zinc-500 book-text-sm">
          <span>${stop.text}</span>
        </div>
      </div>`;
        }

        // Render multi-stop item once
        if (!elseExecuted) {
            elseExecuted = true;
            return `<div class="book-filter__item book-mt-5 book-flex book-items-center book-justify-between">
        <img src="/booking/images/${stop.img}.png" width="72" height="22" alt="${stop.text}" />
        <div bc-value="stop-${stopCount}" bc-name="cms.${type}" bc-triggers="click" class="book-custom__checkbox book-button__content book-text-center book-cursor-pointer book-w-1/2 book-py-3 book-rounded-lg book-border book-border-zinc-500 book-text-sm">
          <span>${stop.text}</span>
        </div>
      </div>`;
        }
        return "";
    } catch (error) {
        console.error(`renderStops: ${error.message}`);
        return "";
    }
};

/**
 * Renders the currency symbol for a given currency code.
 * @param {string} element - Currency code
 * @returns {string} HTML string for the currency symbol
 */
const renderCurrency = async (element) => {
    try {
        const mergedCurrency = dictionaries.reduce((acc, item) => ({ ...acc, ...item.currency }), {});
        document.querySelectorAll(".book-unit__value").forEach(e => {
            if (e.textContent == '') {
                e.textContent = mergedCurrency[element];
            }
        });

        // Use appropriate margin class based on direction
        const marginClass = isRTL ? 'book-mr-1' : 'book-ml-1';
        return `<span class="${marginClass} book-currency">${mergedCurrency[element] || ""}</span>`;
    } catch (error) {
        console.error(`renderCurrency: ${error.message}`);
        return "";
    }
};

/**
 * Renders a flight group card with route details, airline info, and amenities.
 * @param {Object} element - Flight group data with FlightGroup, Baggages, and Provider
 * @returns {string} HTML string for the flight group card
 */
const renderFlightGroupMob = async (element) => {
    try {
        let output = "";
        const lastIndex = element.FlightGroup.length - 1;

        for (const [index, item] of element.FlightGroup.entries()) {
            const isLast = index === lastIndex;
            const cardClass = isLast ? '' : 'book-mb-6';
            // Map flight class to translated text
            const classMap = {
                economy: translate("economy_class"),
                businessclass: translate("business_class"),
                firstclass: translate("first_class")
            };
            const flightClass = classMap[item.Class.toLowerCase()] || translate("economy_class");

            // Direction-aware margin classes
            const marginRightClass = isRTL ? 'book-mr-2' : 'book-ml-2';
            const marginLeftClass = isRTL ? 'book-ml-1' : 'book-mr-1';

            // Render flight group card
            // This code is for the mobile version
            output += `<div class="${cardClass}"><div class="book-card__logo__class__provider">
        <div class="book-flex book-text-sm book-items-center book-justify-between book-text-xs">
          <div class="book-flex book-gap-2">
            <div class="book-bg-zinc-50 book-border book-border-zinc-100 book-rounded">
              ${await renderAirlineLogo(item.RoutesInfo[0].AirlineCode, '2-13', '85', '34', item)}
            </div>
            <div>
              <div class="book-text-zinc-800 book-mb-1">${await renderAirlineName(item.RoutesInfo[0].AirlineCode)}</div>
              <span class="book-text-zinc-500 ${marginLeftClass}">${item.RoutesInfo[0].FlightNumber}</span><span>${flightClass}</span>
            </div>
          </div>
          <div>
            <div class="book-flex book-gap-1 book-text-emerald-500">
             <svg width="17" height="17" class="book-fill-emerald-500">
                <use href="/booking/images/sprite-booking-icons.svg#wheel-bag-cart-icon"></use>
            </svg>
              ${await renderBaggages(Array.isArray(element.Baggages) && element.Baggages.length > 0 ? element.Baggages[0] : null, '')}
           
            </div>
            <div class="book-flex book-text-secondary-600">
              <svg width="17" height="17" class="book-fill-secondary-500">
                <use href="/booking/images/sprite-booking-icons.svg#user-icon"></use>
              </svg>
              <span class="book-relative book-top-[3px]">
                ${translate("remaining_seats")}: <span class="${marginRightClass}">${item.AvailableSeats}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="book-card__route__map">
        <div class="book-flex book-justify-between book-mt-3">
          <div class="book-text-center">
            <div class="book-text-lg book-font-bold book-text-zinc-900">${item.DepartureTime}</div>
            <div class="book-text-xs book-text-zinc-900 book-mt-1 book-mb-2">${await renderCity(item.Origin)}</div>
            <div class="book-text-xs book-text-zinc-400">${item.Origin}</div>
          </div>
          <div class="book-relative book-mx-2 book-mt-4 book-text-center">
            <div class="book-w-full">
              <div class="book-flight__progress__line book-bg-zinc-300 book-min-w-40 book-relative">
                   <svg width="26" height="26" class="book-fill-secondary-500 book-absolute book-right-0 book--bottom-3">
                        <use href="/booking/images/sprite-booking-icons.svg#flight-icon"></use>
                    </svg>
                    ${await renderNumberOfStops(item, 'mob')}
                    <svg width="17" height="18" class="book-absolute book--left-2 book--bottom-0.5">
                        <use href="/booking/images/sprite-booking-icons.svg#pin-icon"></use>
                    </svg>
              </div>
            </div>
            <div class="book-text-xs book-text-zinc-500 book-mt-9 book-flex book-gap-1 book-justify-center">
              <svg width="17" height="17">
                <use href="/booking/images/sprite-booking-icons.svg#hour-icon"></use>
              </svg>
              <span class="book-relative book-top-[3px]">${renderFormatterDuration(item.Duration)}</span>
            </div>
          </div>
          <div class="book-text-center">
            <div class="book-text-lg book-font-bold book-text-zinc-900">${item.ArrivalTime}</div>
            <div class="book-text-xs book-text-zinc-900 book-mt-1 book-mb-2">${await renderCity(item.Destination)}</div>
            <div class="book-text-xs book-text-zinc-400">${item.Destination}</div>
          </div>
        </div></div>`;

            // Add amenities for the last flight group
            if (index === lastIndex) {
                output += `
          <div class="book-flex book-items-center book-mt-4 book-gap-1 book-flex-wrap">
            <div class="book-text-zinc-800 book-rounded-full book-px-2 book-bg-zinc-100 book-flex book-gap-1 book-text-xs book-items-center book-justify-center ${marginLeftClass} book-py-1">
              <span>${await renderIsSystemFlight(item.isSystemFlight)}</span>
            </div>
            ${await renderEnablePoint(element, 'mob')}
            ${await renderFareFamily(item.FareFamily, 'mob')}
            ${await renderProvider(element.Provider?.ProviderId)}
          </div>`;
            }

            output += `</div>`;
        }

        return output;
    } catch (error) {
        console.error(`renderFlightGroupMob: ${error.message}`);
        return "";
    }
};

const renderFlightGroupPc = async (element) => {
    try {
        let output = "";
        const lastIndex = element.FlightGroup.length - 1;

        for (const [index, item] of element.FlightGroup.entries()) {
            // Map flight class to translated text
            const classMap = {
                economy: translate("economy_class"),
                businessclass: translate("business_class"),
                firstclass: translate("first_class")
            };
            const FlightClass = classMap[item.Class.toLowerCase()] || translate("economy_class");

            // Direction-aware margin classes
            const marginLeftClass = isRTL ? 'book-ml-1' : 'book-mr-1';
            const marginRightClass = isRTL ? 'book-mr-1' : 'book-ml-1';
            const marginTopClass2 = (element.FlightGroup.length === 1 && element.PriceInfo?.PassengerFare?.[0]?.Commission !== '0')
                ? "book-mt-18"
                : "book-mt-3";
            const marginTopClass1 = (element.FlightGroup.length === 1 && element.PriceInfo?.PassengerFare?.[0]?.Commission !== '0')
                ? "book-mt-20"
                : "book-mt-5";
            // Render flight group card
            output += `<div class="book-flex book-justify-between book-px-4 book-py-3">
    <div class="book-card__logo__class__provider book-text-center">
        <div class="book-bg-zinc-50 book-border book-border-zinc-100 book-rounded">
            ${await renderAirlineLogo(item.RoutesInfo[0].AirlineCode, '2-13', '85', '34', item)}
        </div>
        <div class="book-mt-3">
            <div class="book-text-xs book-text-zinc-800 book-font-bold">${await renderAirlineName(item.RoutesInfo[0].AirlineCode)}</div>
            <div class="book-text-xs book-text-zinc-500 book-my-3">
                ${translate("flight_number")}<span class="${marginRightClass}">${item.RoutesInfo[0].FlightNumber}</span>
            </div>
            <div class="book-text-xs book-flex book-text-secondary-600 ${marginTopClass1}">
                <svg width="17" height="17" class="book-fill-secondary-500">
                    <use href="/booking/images/sprite-booking-icons.svg#user-icon"></use>
                </svg><span class="book-relative book-top-[3px]">
                ${translate("remaining_seats")} :<span class="book-mx-1">${item.AvailableSeats}</span>${translate("seats")}</span>
            </div>
        </div>
    </div>
    <div class="book-card__route__map">
        <div class="book-flex book-justify-between book-mt-6">
            <div class="book-text-center">
                <div class="book-text-lg book-font-bold book-text-zinc-900">${item.DepartureTime}</div>
                <div class="book-text-xs book-text-zinc-900 book-mt-1 book-mb-2">
                    ${await renderCity(item.Origin)}</div>
                <div class="book-text-xs book-text-zinc-400">${item.Origin}</div>
            </div>
            <div class="book-relative book-mx-4 book-mt-4 book-text-center">
                <div class="book-w-full">
                    <div class="book-flight__progress__line book-min-w-[29rem] book-relative">
                        <svg width="26" height="26" class="book-fill-secondary-500 book-absolute book-right-0 book--bottom-3">
                            <use href="/booking/images/sprite-booking-icons.svg#flight-icon"></use>
                        </svg>
                        ${await renderNumberOfStops(item, 'pc')}
                        <svg width="17" height="18" class="book-absolute book--left-2 book--bottom-0.5">
                            <use href="/booking/images/sprite-booking-icons.svg#pin-icon"></use>
                        </svg>
                    </div>
                </div>
                <div class="book-text-xs book-text-zinc-500 book-mt-9 book-flex book-gap-1 book-justify-center">
                    <svg width="17" height="17">
                        <use href="/booking/images/sprite-booking-icons.svg#hour-icon"></use>
                    </svg>
                    <span class="book-relative book-top-[3px]">${renderFormatterDuration(item.Duration)}</span>
                </div>
            </div>
            <div class="book-text-center">
                <div class="book-text-lg book-font-bold book-text-zinc-900">${item.ArrivalTime}</div>
                <div class="book-text-xs book-text-zinc-900 book-mt-1 book-mb-2">
                    ${await renderCity(item.Destination)}</div>
                <div class="book-text-xs book-text-zinc-400">${item.Destination}</div>
            </div>
        </div>`;

            // Add amenities for the last flight group
            if (index === lastIndex) {
                output += `
        <div class="book-flex book-items-center ${marginTopClass2} book-gap-1 book-flex-wrap">
            <div class="book-bg-zinc-100 book-text-emerald-500 book-flex book-gap-1 book-rounded-full book-text-xs book-min-w-24 book-py-2 book-items-center book-justify-center">
                <svg width="17" height="17" class="book-fill-emerald-500">
                    <use href="/booking/images/sprite-booking-icons.svg#wheel-bag-cart-icon"></use>
                </svg>
                ${await renderBaggages(Array.isArray(element.Baggages) && element.Baggages.length > 0 ? element.Baggages[0] : null, 'style')}
            </div>
            <div class="book-bg-zinc-100 book-text-zinc-500 book-flex book-gap-1 book-rounded-full book-text-xs book-min-w-24 book-py-2 book-items-center book-justify-center">
                <svg width="17" height="17">
                    <use href="/booking/images/sprite-booking-icons.svg#class-icon"></use>
                </svg>
                <span><span class="${marginLeftClass}">${FlightClass}</span></span>
            </div>
            <div class="book-bg-zinc-100 book-text-zinc-500 book-flex book-gap-1 book-rounded-full book-text-xs book-min-w-24 book-py-2 book-items-center book-justify-center">
                <svg width="17" height="17">
                    <use href="/booking/images/sprite-booking-icons.svg#ticket-icon"></use>
                </svg>
                <span>${await renderIsSystemFlight(item.isSystemFlight)}</span>
            </div>
            ${await renderEnablePoint(element, 'pc')}
            ${await renderFareFamily(item.FareFamily, 'pc')}
            ${await renderProvider(element.Provider?.ProviderId)}
        </div>`;
            }

            output += `</div></div>`;
        }

        return output;
    } catch (error) {
        console.error("renderFlightGroupPc: " + error.message);
        return "";
    }
};

/**
 * Renders an airline logo image.
 * @param {string} element - Airline code
 * @param {string} heightClass - CSS height class
 * @param {string} width - Image width
 * @param {string} height - Image height
 * @param {Object} item - Flight route info
 * @returns {string} HTML string for the airline logo
 */
const renderAirlineLogo = async (element, heightClass, width, height, item) => {
    try {
        const mergedCarriers = dictionaries.reduce((acc, item) => ({ ...acc, ...item.carriers }), {});
        const carrier = mergedCarriers[element] || { image: "", name: "" };
        const imgTag = `<img class="book-route-airline book-mx-auto book-h-${heightClass}" src="/${carrier.image}" width="${width}" height="${height}" alt="${carrier.name}"/>`;

        if (item?.RoutesInfo?.length > 1) {
            const codes = item.RoutesInfo.map(route => route.AirlineCode);
            const uniqueCodes = [...new Set(codes)];
            if (uniqueCodes.length > 1) {
                return `<div class="book-multi-airlines">${imgTag}</div>`;
            }
        }
        return imgTag;
    } catch (error) {
        console.error(`renderAirlineLogo: ${error.message}`);
        return "";
    }
};

/**
 * Renders the airline name for a given airline code.
 * @param {string} element - Airline code
 * @returns {string} Airline name
 */
const renderAirlineName = async (element) => {
    try {
        const mergedCarriers = dictionaries.reduce((acc, item) => ({ ...acc, ...item.carriers }), {});
        return mergedCarriers[element]?.name || "";
    } catch (error) {
        console.error(`renderAirlineName: ${error.message}`);
        return "";
    }
};

/**
 * Renders the city name for a given location code.
 * @param {string} element - Location code
 * @returns {string} City name
 */
const renderCity = async (element) => {
    try {
        const mergedLocation = dictionaries.reduce((acc, item) => ({ ...acc, ...item.location }), {});
        return mergedLocation[element]?.city || "";
    } catch (error) {
        console.error(`renderCity: ${error.message}`);
        return "";
    }
};

/**
 * Renders the country name for a given location code.
 * @param {string} element - Location code
 * @returns {string} Country name
 */
const renderCountry = async (element) => {
    try {
        const mergedLocation = dictionaries.reduce((acc, item) => ({ ...acc, ...item.location }), {});
        return mergedLocation[element]?.country || "";
    } catch (error) {
        console.error(`renderCountry: ${error.message}`);
        return "";
    }
};

/**
 * Renders baggage information.
 * @param {Object} element - Baggage data with Baggage and Unit
 * @param {string} style - Optional style class
 * @returns {string} HTML string for baggage info
 */
const renderBaggages = async (element, style) => {
    try {
        if (!element) return "";
        if (Number(element?.Baggage) === 0) {
            return `<span class="book-baggage__info ${style ? 'book-font-bold' : ''}">${translate("no_baggage_allowed")}</span>`;
        };
        const marginLeftClass = isRTL ? 'book-ml-1' : 'book-mr-1';
        const baggageHTML = `
    <span class="book-baggage__info ${style ? 'book-relative book-top-[2px] book-font-bold' : ''}">
        ${element.Baggage}
        <span class="${marginLeftClass}">${element.Unit || ""}</span>
    </span>`;
        return baggageHTML.trim();
    } catch (error) {
        console.error("renderBaggages: " + error.message);
        return "";
    }
};

/**
 * Renders system flight status (system or charter).
 * @param {string|boolean} element - System flight status
 * @returns {string} System or charter label
 */
const renderIsSystemFlight = async (element) => {
    try {
        return element === "true" || element === true ? translate("system_flight") : translate("charter_flight");
    } catch (error) {
        console.error(`renderIsSystemFlight: ${error.message}`);
        return "";
    }
};

/**
 * Renders club points if enabled.
 * @param {Object} element - Flight data with ClubMembers
 * @returns {string} HTML string for club points
 */
const renderEnablePoint = async (element, type) => {
    try {
        if (Number(element.ClubMembers?.EnablePoint) === 1 && Number(element.ClubMembers.ClubPoint) !== 0) {
            const marginLeftClass = isRTL ? 'book-ml-1' : 'book-mr-1';

            if (type == 'mob') {
                return `
                <div class="book-text-zinc-800 book-rounded-full book-px-2 book-bg-primary-100 book-flex book-gap-1 book-text-xs book-items-center book-justify-center ${marginLeftClass} book-py-1">
                   <span class="${marginLeftClass}">${translate("club_points")}:</span>
                    ${element.ClubMembers.ClubPoint}
                </div>`;
            } else {
                return `<div class="book-relative"><div class="book-bg-primary-100 book-text-zinc-500 book-flex book-gap-1 book-rounded-full book-text-xs book-min-w-24 book-p-2  book-items-center book-justify-center">
                <svg width="17" height="17">
                    <use href="/booking/images/sprite-booking-icons.svg#club-member-icon"></use>
                </svg>
                <span class="book-relative book-top-[2px]"><span class="${marginLeftClass}">${translate("club_points")}:</span>${element.ClubMembers.ClubPoint}</span>
            </div></div>`;
            }

        }
        return "";
    } catch (error) {
        console.error(`renderEnablePoint: ${error.message}`);
        return "";
    }
};

/**
 * Renders fare family indicator if applicable.
 * @param {string|boolean} element - Fare family status
 * @returns {string} HTML string for fare family indicator
 */
const renderFareFamily = async (element, type) => {
    try {
        if (element === "true" || element === true) {
            if (type == 'mob') {
                return `
                <div class="book-text-zinc-800 book-rounded-full book-px-2 book-bg-zinc-100 book-flex book-gap-1 book-text-xs book-items-center">
                  <span>${translate("special_rate")}</span>
                </div>`;
            } else {
                return `
               <div class="book-bg-zinc-100 book-text-zinc-500 book-flex book-gap-1 book-rounded-full book-text-xs book-min-w-24 book-py-2 book-items-center book-justify-center">
            <svg width="17" height="17">
                <use href="/booking/images/sprite-booking-icons.svg#bulleted-list-icon"></use>
            </svg>
            <span>${translate("special_rate")}</span>
        </div>`;
            }

        }
        return "";
    } catch (error) {
        console.error(`renderFareFamily: ${error.message}`);
        return "";
    }
};

/**
 * Renders codeshare indicator for operating airline.
 * @param {Object} element - Flight data with OperatingAirlineCode and AirlineCode
 * @returns {string} HTML string for codeshare info
 */
const renderOperatingAirlineCode = async (element) => {
    try {
        if (element.OperatingAirlineCode) {
            if (element.OperatingAirlineCode !== element.AirlineCode) {
                const marginRightClass = isRTL ? 'book-ml-1' : 'book-mr-1';

                return `
        <div class="book-text-zinc-600 book-text-sm book-my-2 book-mx-3">
          <span>${translate("operated_by")}</span>
          <span class="${marginRightClass}">${element.OperatingAirlineCode}</span>
          <span>(${await renderAirlineName(element.OperatingAirlineCode)})</span>
        </div>`;
            }
        }
        return "";
    } catch (error) {
        console.error(`renderOperatingAirlineCode: ${error.message}`);
        return "";
    }
};

/**
 * Renders stop indicators for a flight group, displaying the number of stops and connection times.
 * @param {Object} element - The flight group data containing NumberOfStops and RoutesInfo.
 * @returns {Promise<string>} HTML string representing stop indicators or an empty string if no stops.
 */
const renderNumberOfStops = async (element, type) => {
    try {
        if (element.NumberOfStops > 0) {
            let output = `<div class="book-absolute book-w-full book-top--6"><div class="book-flex book-justify-around">`;
            for (let i = 0; i < element.NumberOfStops; i++) {
                output += `<span><svg width="26" height="26" class="book-fill-secondary-500 book-mx-auto">
                  <use href="/booking/images/sprite-booking-icons.svg#${type === 'mob' ? 'tag-mob-icon' : 'tag-icon'}"></use>
              </svg>
              ${await renderConnectionTime(element.RoutesInfo[i].ConnectionTime)}</span>`;
            }
            output += `</div></div>`;
            return output;
        }
        return "";
    } catch (error) {
        console.error(`renderNumberOfStops: ${error.message}`);
        return "";
    }
};

/**
* Renders the connection time between flights in hours and minutes format.
* @param {number} element - Connection time in minutes.
* @returns {Promise<string>} HTML string representing formatted connection time or an empty string if invalid.
*/
const renderConnectionTime = async (element) => {
    try {
        if (element > 0) {
            const hours = Math.floor(element / 60);
            const minutes = element % 60;
            const marginRightClass = isRTL ? 'book-mr-1' : 'book-ml-1';

            return `<div class="book-text-xs book-text-zinc-600 book-mt-2 book-flex book-items-center">
              <svg width="15" height="15" class="${isMobile ? '' : 'book-mx-auto'}">
                  <use href="/booking/images/sprite-booking-icons.svg#time-circle-icon"></use>
              </svg>
              <span class="${marginRightClass} book-relative book-top-[2px]">${hours}:${minutes}</span>
          </div>`;
        }
        return "";
    } catch (error) {
        console.error(`renderConnectionTime: ${error.message}`);
        return "";
    }
};

/**
* Renders the provider name for a given provider ID.
* @param {string} element - The provider ID.
* @returns {string} HTML string representing the provider name or an empty string if not found.
*/
const renderProvider = (element) => {
    try {
        const providerData = providerDataList.find(provider => provider.id === parseInt(element));
        if (providerData) {
            const marginLeftClass = isRTL ? 'book-mr-1' : 'book-ml-1';
            return `<div class="book-bg-secondary-100 book-text-zinc-500 book-flex book-gap-1 book-rounded-full book-text-xs book-min-w-24 book-py-2 book-items-center book-justify-center ${marginLeftClass}">
              <span>${providerData.name}</span>
          </div>`;
        }
        return "";
    } catch (error) {
        console.error(`renderProvider: ${error.message}`);
        return "";
    }
};

/**
* Renders detailed route information for a flight group, including airline, baggage, and flight details.
* @param {Object} element - The flight group data containing FlightGroup and Baggages.
* @returns {Promise<string>} HTML string representing detailed route information.
*/
const renderRoutesInfoMob = async (element) => {
    try {
        /**
         * Renders airline information with an icon, label, and value.
         * @param {string} icon - The icon identifier for the SVG sprite.
         * @param {string} label - The label for the airline information.
         * @param {string} value - The value to display.
         * @returns {string} HTML string for airline information or empty string if value is invalid.
         */
        const renderAirlineInfo = (icon, label, value) => {
            if (value && value !== "") {
                return `
                  <div class="book-text-sm">
                      <div class="book-w-8 book-h-8 book-bg-primary-50 book-flex book-items-center book-justify-center book-rounded">
                           <svg width="25" height="24" class="book-fill-primary-400">
                              <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
                          </svg>
                      </div>
                      <div>
                          <p class="book-text-zinc-500 book-my-1">${label}:</p>
                          <p class="book-text-zinc-900">${value}</p>
                      </div>
                  </div>`;
            }
            return "";
        };

        /**
         * Renders HTML for a single route with flight details and optional title for first route in group.
         * @param {Object} item - Route information.
         * @param {Object} baggage - Baggage information for the route.
         * @param {number} index - Index of the route.
         * @param {boolean} isFirstInGroup - Whether this is the first route in the group.
         * @param {number} groupIndex - Index of the flight group.
         * @returns {Promise<string>} HTML string for the route.
         */
        const routeHtml = async (item, baggage, index, isFirstInGroup, groupIndex) => {
            let titleDiv = "";
            if (isFirstInGroup && index === 0) {

                if (schemaId === 290) {
                    titleDiv = `
            <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                ${groupIndex === 0 ? translate("outbound_flight") : translate("return_flight")}
            </div>`;
                } else if (schemaId === 292) {

                    const routeNames = [translate("first_route"), translate("second_route"), translate("third_route"), translate("fourth_route")];
                    const name = routeNames[groupIndex];
                    titleDiv = `
            <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                ${name}
            </div>`;
                }
            }

            return `
          <div class="book-route__info">
              ${titleDiv}
              <div class="book-mb-2">
                  <div class="book-flex book-items-stretch">
                      <div class="book-flight__details__progress__line book-bg-zinc-300 book-ml-4 book-mr-2 book-relative">
                          <svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book-top-1.2 book--translate-y-1.2 book-z-10">
                              <use href="/booking/images/sprite-booking-icons.svg#path-icon"></use>
                          </svg>
                      </div>
                      <div class="book-flex book-flex-col book-px-3 book-items-stretch book-w-full">
                          <div class="book-border-b book-border-zinc-300 book-mb-3 book-pb-4">
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900">${item.OriginAirport}</h5>
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900 book-my-1">${item.DepartureTime}</h5>
                              <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.DepartureDate)}</p>
                          </div>
                          <div>
                              <h6 class="book-text-sm book-text-zinc-900">${await renderAirport(item.OriginAirport)}</h6>
                              <p class="book-text-zinc-600 book-text-sm book-my-2">
                                  ${await renderCity(item.OriginAirport)}, ${await renderCountry(item.OriginAirport)}
                              </p>
                              <div class="book-flex book-text-sm book-items-center book-gap-2">
                                  <div>
                                      ${await renderAirlineLogo(item.AirlineCode, '5', '50', '20')}
                                  </div>
                                  <span class="book-text-zinc-900 book-text-sm">
                                      ${await renderAirlineName(item.AirlineCode)} ${item.FlightNumber}
                                  </span>
                              </div>
                              ${await renderOperatingAirlineCode(item)}
                          </div>
                          <div class="book-text-sm book-text-primary-400 book-my-3">
                              ${translate("flight_duration")}<span class="${isRTL ? 'book-mr-1' : 'book-ml-1'}">${await renderFormatterDuration(item.Duration)}</span>
                          </div>
                          <div class="book-flex book-gap-5 book-my-3">
                                ${renderAirlineInfo("class-details-icon", translate("ticket_class"), `${await renderFlightClass(item.Class)}`)}
                                ${renderAirlineInfo("wheel-bag-details-icon", translate("allowed_baggage"), await renderBaggages(baggage))}
                                ${renderAirlineInfo("ticket-details-icon", translate("fare_class"), item.ClassCode)}
                                ${renderAirlineInfo("plane-details-icon", translate("aircraft_type"), item.AirCraft)}
                          </div>
                          <div class="book-border-b book-border-zinc-300 book-my-3 book-pb-4">
                              <h6 class="book-text-sm book-text-zinc-900">${await renderAirport(item.DestinationAirport)}</h6>
                              <p class="book-text-zinc-600 book-text-sm book-my-2">
                                  ${await renderCity(item.DestinationAirport)}, ${await renderCountry(item.DestinationAirport)}
                              </p>
                          </div>
                          <div>
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900">${item.DestinationAirport}</h5>
                              <h5 class="book-text-xm book-font-bold book-text-zinc-900 book-my-1">${item.ArrivalTime}</h5>
                              <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.ArrivalDate)}</p>
                          </div>
                      </div>
                  </div>
              </div>
              ${await renderConnectionTime(item.ConnectionTime)}
          </div>`;
        };

        let output = "";
        for (let groupIndex = 0; groupIndex < (element.FlightGroup || []).length; groupIndex++) {
            const flightGroup = element.FlightGroup[groupIndex];

            const routeHtmls = await Promise.all(
                (flightGroup.RoutesInfo || []).map((item, i) =>
                    routeHtml(item, element.Baggages?.[i], i, true, groupIndex)
                )
            );

            output += routeHtmls.join('');
        }

        return output;
    } catch (error) {
        console.error(`renderRoutesInfoMob: ${error.message}`);
        return "";
    }
};

const renderRoutesInfoPc = async (element) => {
    try {
        const renderAirlineInfo = (icon, label, value) => {
            if (value && value !== "") {
                const marginLeftClass = isRTL ? 'book-ml-2' : 'book-mr-2';
                return `
        <div class="book-flex">
            <div class="book-w-10 book-h-10 book-bg-primary-50 book-flex book-items-center book-justify-center book-rounded ${marginLeftClass}">
                <svg width="25" height="24" class="book-fill-primary-400">
                    <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
                </svg>
            </div>
            <div>
                <p class="book-text-zinc-500 book-mb-1">${label}:</p>
                <p class="book-text-zinc-900">${value}</p>
            </div>
        </div>`;
            }
            return "";
        };

        // Added new parameters: isFirstInGroup (first route in the group), groupIndex (group number)
        const routeHtml = async (item, baggage, index, isFirstInGroup, groupIndex) => {
            let titleDiv = "";
            if (isFirstInGroup && index === 0) {
                if (schemaId === 290) {
                    titleDiv = `
            <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                ${groupIndex === 0 ? translate("outbound_flight") : translate("return_flight")}
            </div>`;
                } else if (schemaId === 292) {
                    // Names for first to fourth routes
                    const routeNames = [translate("first_route"), translate("second_route"), translate("third_route"), translate("fourth_route")];
                    const name = routeNames[groupIndex];
                    titleDiv = `
            <div class="book-route__title book-text-lg book-font-bold book-mb-4">
                ${name}
            </div>`;
                }
            }

            return `
<div class="book-route__info">
    ${titleDiv}
    <div class="book-flex book-mb-4">
        <div class="book-flex">
            <div class="book-flight__details__progress__line book-ml-14 book-mr-3 book-relative">
                <svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book-z-10">
                    <use href="/booking/images/sprite-booking-icons.svg#path-icon"></use>
                </svg>
                <svg width="26" height="40" class="book-fill-primary-400 book-absolute book--right-3 book--bottom-3 book-z-10">
                    <use href="/booking/images/sprite-booking-icons.svg#tag-details-icon"></use>
                </svg>
            </div>
            <div class="book-flex book-flex-col book-border-l book-items-center book-justify-between book-border-zinc-300 book-px-7 book-ml-7">
                <div>
                    <h5 class="book-text-xl book-font-bold book-text-zinc-900">${item.OriginAirport}</h5>
                    <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${item.DepartureTime}</h5>
                    <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.DepartureDate)}</p>
                </div>
                <div class="book-text-sm book-text-primary-400  book-w-40">
                    ${translate("flight_duration")}<span class="${isRTL ? 'book-mr-1' : 'book-ml-1'}">${await renderFormatterDuration(item.Duration)}</span>
                </div>
                <div>
                    <h5 class="book-text-xl book-font-bold book-text-zinc-900">${item.DestinationAirport}</h5>
                    <h5 class="book-text-xl book-font-bold book-text-zinc-900 book-my-2">${item.ArrivalTime}</h5>
                    <p class="book-text-zinc-500 book-text-sm">${await renderFormatterDate(item.ArrivalDate)}</p>
                </div>
            </div>
        </div>
        <div class="book-flex">
            <div class="book-flex book-flex-col">
                <div>
                    <h6 class="book-text-xl book-text-zinc-900">${await renderAirport(item.OriginAirport)}</h6>
                    <p class="book-text-zinc-600 book-text-sm book-my-2">
                        ${await renderCity(item.OriginAirport)}, ${await renderCountry(item.OriginAirport)}
                    </p>
                    <div class="book-flex book-items-center book-gap-2">
                        <div class="">
                            ${await renderAirlineLogo(item.AirlineCode, '5', '50', '20')}
                        </div>
                        <span class="book-text-zinc-900 book-text-sm">
                            ${await renderAirlineName(item.AirlineCode)} ${item.FlightNumber}
                        </span>
                    </div>
                    ${await renderOperatingAirlineCode(item)}
                </div>
                <div class="book-text-sm book-my-6">
                    <div class="book-grid book-grid-cols-2 book-gap-10">
                        <div class="book-space-y-4">
                            ${renderAirlineInfo("class-details-icon", translate("ticket_class"), `${await renderFlightClass(item.Class)}`)}
                            ${renderAirlineInfo("wheel-bag-details-icon", translate("allowed_baggage"), await renderBaggages(baggage))}
                        </div>
                        <div class="book-space-y-4">
                            ${renderAirlineInfo("ticket-details-icon", translate("fare_class"), item.ClassCode)}
                            ${renderAirlineInfo("plane-details-icon", translate("aircraft_type"), item.AirCraft)}
                        </div>
                    </div>
                </div>
                <div>
                    <h6 class="book-text-xl book-text-zinc-900">${await renderAirport(item.DestinationAirport)}</h6>
                    <p class="book-text-zinc-600 book-text-sm book-my-2">
                        ${await renderCity(item.DestinationAirport)}, ${await renderCountry(item.DestinationAirport)}
                    </p>
                </div>
            </div>
        </div>
    </div>
    ${await renderConnectionTimeRoute(item)}
</div>`;
        };

        let output = "";
        for (let groupIndex = 0; groupIndex < (element.FlightGroup || []).length; groupIndex++) {
            const flightGroup = element.FlightGroup[groupIndex];

            const routeHtmls = await Promise.all(
                (flightGroup.RoutesInfo || []).map((item, i) =>
                    routeHtml(item, element.Baggages?.[i], i, true, groupIndex)
                )
            );

            output += routeHtmls.join('');
        }

        return output;
    } catch (error) {
        console.error("renderRoutesInfoPc: " + error.message);
        return "";
    }
};

/**
 * Renders connection time for a route stop in translated format.
 * @param {Object} element - Route data containing ConnectionTime and DestinationAirport.
 * @returns {Promise<string>} HTML string representing connection time or empty string if invalid.
 */
const renderConnectionTimeRoute = async (element) => {
    try {
        if (element?.ConnectionTime > 0) {
            const hours = Math.floor(element.ConnectionTime / 60);
            const minutes = element.ConnectionTime % 60;

            return `<div class="book-my-10 book-flex book-text-zinc-800 book-text-sm book-justify-between book-bg-zinc-100 book-rounded-xl book-p-3">
              <div class="book-flex book-gap-1">
                  <svg width="15" height="16">
                      <use href="/booking/images/sprite-booking-icons.svg#hourglass-icon"></use>
                  </svg>
                  <span>${translate("connection_time")}: ${hours} ${translate("hour")} ${translate("and")} ${minutes} ${translate("minute")}</span>
              </div>
              <div>
                  (${element.DestinationAirport})
                  ${await renderAirport(element.DestinationAirport)}
              </div>
          </div>`;
        }
        return "";
    } catch (error) {
        console.error(`renderConnectionTimeRoute: ${error.message}`);
        return "";
    }
};

/**
* Formats a date to language-specific format with weekday, day, and month.
* @param {string} element - Date string to format.
* @returns {Promise<string>} Formatted date string or empty string on error.
*/
const renderFormatterDate = async (element) => {
    try {
        const gregorianDate = new Date(element);
        let formatter;

        if (currentLanguage === 'fa') {
            formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        } else if (currentLanguage === 'ar') {
            formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        } else {
            formatter = new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        }

        return formatter.format(gregorianDate);
    } catch (error) {
        console.error(`renderFormatterDate: ${error.message}`);
        return "";
    }
};

/**
* Renders the airport name for a given location code.
* @param {string} element - Location code for the airport.
* @returns {Promise<string>} Airport name or empty string if not found.
*/
const renderAirport = async (element) => {
    try {
        const mergedLocation = dictionaries.reduce((acc, item) => ({ ...acc, ...item.location }), {});
        return mergedLocation[element]?.airport || "";
    } catch (error) {
        console.error(`renderAirport: ${error.message}`);
        return "";
    }
};

/**
* Renders the flight class in translated text.
* @param {string} element - Flight class (e.g., economy, businessclass, firstclass).
* @returns {Promise<string>} Translated flight class or default value.
*/
const renderFlightClass = async (element) => {
    try {
        const classMap = {
            economy: translate("economy_class"),
            businessclass: translate("business_class"),
            firstclass: translate("first_class")
        };
        return classMap[element.toLowerCase()] || translate("economy_class");
    } catch (error) {
        console.error(`renderFlightClass: ${error.message}`);
        return "";
    }
};

/**
* Formats duration string (e.g., '2h30m') to translated format.
* @param {string} str - Duration string to format.
* @returns {string} Formatted duration string or original string on error.
*/
const renderFormatterDuration = (str) => {
    try {
        const match = str.match(/(\d+)h(?:\s*(\d+)m)?/);
        if (!match) return str;

        const hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        let result = `<span>${hours} ${translate("hour")}</span>`;
        if (minutes > 0) {
            result += `<span class="book-mx-1">${translate("and")}</span> <span>${minutes} ${translate("minute")}</span>`;
        }
        return result;
    } catch (error) {
        console.error(`renderFormatterDuration: ${error.message}`);
        return str;
    }
};

/**
* Renders passenger fare details including base fare, tax, unit, and total.
* @param {Object} element - Price information containing PassengerFare and Currency.
* @returns {Promise<string>} HTML string of fare details or empty string on error.
*/
const renderPassengerFare = async (element) => {
    try {
        let output = "";
        const passengerMap = {
            Adult: translate("adult_passenger"),
            Child: translate("child_passenger"),
            Infant: translate("infant_passenger")
        };

        const items = element.PriceInfo.PassengerFare || [];
        const validCount = items.filter(item => item.Count > 0).length;
        let currentIndex = 0;

        for (const item of items) {
            if (item.Count > 0) {
                const passengerType = passengerMap[item.passengerType] || item.passengerType;
                currentIndex++;

                const ulClass = (currentIndex === validCount) ? '' : 'book-mb-6';

                output += `<ul class="${ulClass}">
                   <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("per_passenger")} ${passengerType}</span>
                      <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.Unit)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                  <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("base_fare")}</span>
                      <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.BaseFare)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                  <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("taxes_and_fees")}</span>
                      <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.Tax)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                    <li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("taxes_and_services")}</span>
                      <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.providerFare)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>`;
                if (item.Commission && item.Commission !== '0') {
                    output += `<li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("total_price")} ${passengerType}<span class="book-mx-1">(${item.Count}<span class="book-mx-1">نفر</span>)</span></span>
                      <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.Total)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li><li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                        <span>${translate("commission")}</span>
                        <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.Commission)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                    </li><li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                        <span>${translate("amount_after_commission")} ${passengerType}<span class="book-mx-1">(${item.Count}<span class="book-mx-1">نفر</span>)</span></span>
                        <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.TotalCommission)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                    </li></ul>`;
                } else {
                    output += `<li class="book-flex book-justify-between book-py-3 book-px-2 book-bg-zinc-100 book-rounded-lg book-mb-2">
                      <span>${translate("total_price")} ${passengerType}<span class="book-mx-1">(${item.Count}<span class="book-mx-1">نفر</span>)</span></span>
                      <span><span class="book-ltr book-inline-block">${new Intl.NumberFormat().format(item.Total)}</span>${await renderCurrency(element.PriceInfo.Currency)}</span>
                  </li>
                 </ul>`;
                }
            }
        }

        return output;
    } catch (error) {
        console.error(`renderPassengerFare: ${error.message}`);
        return "";
    }
};
/**
* Renders passenger fare details including base fare, tax, unit, and total.
* @param {Object} element - Price information containing PassengerFare and Currency.
* @returns {Promise<string>} HTML string of fare details or empty string on error.
*/
const renderPerPrice = async (element) => {
    try {
        let output = "";

        const count = parseInt(element.Count) || 1;
        const commission = parseFloat(element.Commission) || 0;
        const totalCommission = parseFloat(element.TotalCommission) || 0;

        if (commission === 0) {
            output = `<div class="book-text-xs book-text-zinc-500 book-mb-2">${translate("total_per_passenger")}:</div>
            <h4  class="book-text-xl book-font-bold book-text-zinc-900"><span>
                ${new Intl.NumberFormat().format(Math.floor(totalCommission / count))}
            </span>${await renderCurrency(element.Currency)}</h4>`;
        } else {
            const perCommission = Math.floor(commission / count);
            const perTotalCommission = Math.floor(totalCommission / count);

            output = `
                <div class="book-mb-2">
                   <div class="book-text-xs book-text-zinc-500 book-mb-2">${translate("commission_per_passenger")}:</div>
                    <h4><span class="book-ltr book-inline-block">
                        ${new Intl.NumberFormat().format(perCommission)}
                    </span>${await renderCurrency(element.Currency)}</h4>
                </div>
                <div>
                    <div class="book-text-xs book-text-zinc-500 book-mb-2">${translate("total_after_commission_per_passenger")}:</div>
                    <h4 class="book-text-xl book-font-bold book-text-zinc-900"><span class="book-ltr book-inline-block">
                        ${new Intl.NumberFormat().format(perTotalCommission)}
                    </span>${await renderCurrency(element.Currency)}</h4>
                </div>
            `;
        }

        return output;
    } catch (error) {
        console.error(`renderPerPrice: ${error.message}`);
        return "";
    }
};

/**
* Renders amenities list with chargeable status indicators.
* @param {Array} element - List of amenities with description and isChargeable status.
* @returns {Promise<string>} HTML string of amenities list or empty string on error.
*/
const renderAmenities = async (element) => {
    try {
        let output = "";
        for (const item of element || []) {
            const icon = item.isChargeable == 0 ? "check-circle-icon" : "dash-circle-icon";
            output += `<li class="book-flex book-items-center book-gap-2 book-my-1">
              <svg width="${icon === "check-circle-icon" ? 17 : 20}" height="${icon === "check-circle-icon" ? 16 : 20}" class="book-shrink-0">
                  <use href="/booking/images/sprite-booking-icons.svg#${icon}"></use>
              </svg>
              <span>${item.description}</span>
          </li>`;
        }
        return output;
    } catch (error) {
        console.error(`renderAmenities: ${error.message}`);
        return "";
    }
};

/**
* Renders base fare button with price difference or selected state.
* @param {string|number} element - Base fare amount.
* @param {string} unit - Currency unit.
* @param {string|number} id - Identifier for the card.
* @returns {Promise<string>} HTML string for base fare button or empty string on error.
*/
const renderBaseFare = async (element, unit, id) => {
    try {
        const differencePrice = parseInt(element) - parseInt(defaultTotalCommission);
        if (differencePrice === 0) {
            const cardContainer = apiContainer?.closest(".book-card__container");
            if (cardContainer) {
                cardContainer.querySelector(".book-modal__btn__container").setAttribute("onclick", `submitCard(this,${id})`);
            }
            return `<div class="book-baseFare__btn book-active__baseFare__btn book-p-2 book-text-sm book-text-center book-rounded-3xl book-mt-6 book-rtl">${translate("selected")}</div>`;
        }
        const changeTypeText = differencePrice < 0 ? translate("decrease") : translate("increase");
        return `<div class="book-baseFare__btn book-bg-primary-50 book-p-2 book-text-sm book-text-center book-text-primary-300 book-rounded-3xl book-mt-6 book-rtl">
          <span class="book-addition__price__container book-font-bold">${new Intl.NumberFormat().format(differencePrice)}</span>${await renderCurrency(unit)}
          <span class="book-mx-2">${changeTypeText}</span>
      </div>`;
    } catch (error) {
        console.error(`renderBaseFare: ${error.message}`);
        return "";
    }
};

/**
* Renders active class for selected amenities based on price difference.
* @param {string|number} element - Base fare amount.
* @returns {Promise<string>} CSS class for active amenities or empty string on error.
*/
const renderSelectedAmenities = async (element) => {
    try {
        const differencePrice = parseInt(element) - parseInt(defaultTotalCommission);
        return differencePrice === 0 ? " book-active__amenities" : "";
    } catch (error) {
        console.error(`renderSelectedAmenities: ${error.message}`);
        return "";
    }
};

/**
* Renders fare rules as title-text pairs.
* @param {Array} element - List of fare rules with title and text.
* @returns {Promise<string>} HTML string of fare rules or empty string on error.
*/
const renderRule = async (element) => {
    try {
        let output = "";
        for (const item of element || []) {
            output += `<div class="book-text-sm">
              <div class="book-text-zinc-600 book-mb-1">${item.title}:</div>
              <div>${item.text}</div>
          </div>`;
        }
        return output;
    } catch (error) {
        console.error(`renderRule: ${error.message}`);
        return "";
    }
};

/**
* Renders styling class for selected flight.
* @param {string|boolean} element - Indicates if flight is selected ("true", true, or false).
* @returns {Promise<string>} CSS class for selected flight or empty string on error.
*/
const renderSelectedFlight = async (element) => {
    try {
        return element === "true" || element === true ? " book-card__container__selected" : "";
    } catch (error) {
        console.error(`renderSelectedFlight: ${error.message}`);
        return "";
    }
};

/**
 * Global state for modal and API functions.
 */
let FlightAmenitiesProposalsSource = []; // Stores flight amenities data

/**
 * Opens a modal container for a flight card and triggers fare family rules if applicable.
 * @param {HTMLElement} element - The element triggering the modal.
 * @param {string|number} idToFind - The ID of the flight to find.
 */
const selectModalContainer = (element, idToFind) => {
    try {
        // Remove rendering class from any existing active container
        const renderingContainer = document.querySelector(".book-api__container__rendering");
        if (renderingContainer) {
            renderingContainer.classList.remove("book-api__container__rendering");
        }

        // Update card and modal classes
        const cardsContainer = document.querySelectorAll(".book-card__container");
        cardsContainer.forEach(card => {
            card.classList.remove("book-card__container__selected");
            const modal = card.querySelector(".book-modal__container");
            if (modal.classList.contains("book-modal__mob__container")) {
                modal.classList.add("book-hidden");
            } else {
                modal.classList.add("book--left-full");
                modal.classList.remove("book-left-0");
            }
        });

        const cardContainer = element.closest(".book-card__container");
        cardContainer.classList.add("book-card__container__selected");
        const modalContainer = cardContainer.querySelector(".book-modal__container");
        if (modalContainer.classList.contains("book-modal__mob__container")) {
            modalContainer.classList.remove("book-hidden");
        } else {
            modalContainer.classList.remove("book--left-full");
            modalContainer.classList.add("book-left-0");
        }

        // Trigger fare family rules on first run
        if (element.dataset.run === "0") {
            const foundObject = FlightProposalsSource.find(item => item.FlightId === idToFind);
            if (foundObject?.FlightGroup.some(group => group.FareFamily === true)) {
                const fareFamily = cardContainer.querySelector(".book-flight__fareFamily");
                fareFamily.classList.remove("book-hidden");
                fareFamily.querySelector(".book-api__container__content").classList.add("book-api__container__rendering");

                $bc.setSource("cms.rule", {
                    type: "upselling",
                    SessionId: sessionSearchStorage.SessionId || "",
                    FlightId: idToFind,
                    FlightGroup: JSON.stringify(foundObject.FlightGroup),
                    run: true
                });
            }
            element.setAttribute("data-run", "1");
            defaultTotalCommission = foundObject?.PriceInfo.TotalCommission || 0;
        }
    } catch (error) {
        console.error(`selectModalContainer: ${error.message}`);
    }
};

/**
 * Closes a modal container and optionally removes a class from the card container.
 * @param {HTMLElement} element - The element triggering the modal close.
 * @param {string} [className] - Optional class to remove from the card container.
 */
const closeModalContainer = (element, className) => {
    try {
        const cardContainer = element.closest(".book-card__container");
        const modalContainer = element.closest(".book-modal__container");
        if (className) {
            cardContainer.classList.remove(className);
        }
        if (modalContainer.classList.contains("book-modal__mob__container")) {
            modalContainer.classList.add("book-hidden");
        } else {
            modalContainer.classList.add("book--left-full");
            modalContainer.classList.remove("book-left-0");
        }
    } catch (error) {
        console.error(`closeModalContainer: ${error.message}`);
    }
};

/**
 * Scrolls to a specific section within a modal and updates tab navigation.
 * @param {HTMLElement} element - The element triggering the scroll.
 * @param {string} type - Type of content to toggle.
 * @param {string} parent - Parent container class name.
 * @param {string|number} idToFind - The ID of the flight.
 */
const scrollModalContainerItem = (element, type, parent, idToFind) => {
    try {
        const cardContainer = element.closest(".book-card__container");
        const target = cardContainer.querySelector(`.${parent}`);
        const scrollable = cardContainer.querySelector(".book-modal__container");

        // Smooth scroll to target
        scrollable.scroll({ top: target.offsetTop, behavior: "smooth" });

        // Update tab navigation
        cardContainer.querySelectorAll(".book-tab__navigation__content").forEach(tab =>
            tab.classList.remove("book-active__tab__navigation")
        );
        element.classList.add("book-active__tab__navigation");
        element.closest(".book-modal__card__content")
            .querySelectorAll(".book-api__container")
            .forEach(e => {
                if (e !== target && !e.querySelector(".book-api__container__content").classList.contains("book-hidden")) {
                    e.querySelector(".book-api__container__content").classList.add("book-hidden");
                }
            });
        toggleContentApi(target.querySelector(".book-content__api"), type, parent, idToFind, true);

    } catch (error) {
        console.error(`scrollModalContainerItem: ${error.message}`);
    }
};

/**
 * Selects a date option, updates pricing, and redirects to the search page.
 * @param {HTMLElement} element - The element triggering the date selection.
 * @param {string} date - Selected date.
 * @returns {Promise<void>}
 */
const selectDatedFlight = async (element, date) => {
    try {
        sessionSearchStorage.TripGroup[0].DepartureDate = date;
        sessionStorage.setItem("sessionSearch", JSON.stringify(sessionSearchStorage));
        window.location.href = "/flight/search";
    } catch (error) {
        console.error(`selectDatedFlight: ${error.message}`);
    }
};

/**
 * Selects an amenities option, updates pricing, and sets submit button action.
 * @param {HTMLElement} element - The element triggering the amenities selection.
 * @param {string|number} idToFind - The ID of the flight.
 * @returns {Promise<void>}
 */
const selectAmenities = async (element, idToFind) => {
    try {
        const parent = element.parentNode;
        const siblings = parent.children;
        const modalContainer = element.closest(".book-modal__container");
        const foundObject = FlightAmenitiesProposalsSource.find(item => item.FlightId === idToFind);
        if (foundObject) {
            sessionStorage.setItem("sessionAmenities", JSON.stringify(foundObject));
        };
        //  sibling classes
        Array.from(siblings).forEach(sibling => {
            sibling.classList.remove("book-active__amenities");
            sibling.querySelector(".book-baseFare__btn")?.classList.remove("book-active__baseFare__btn");
        });

        // Update selected element classes
        element.classList.add("book-active__amenities");
        const baseFareBtn = element.querySelector(".book-baseFare__btn");
        if (baseFareBtn) baseFareBtn.classList.add("book-active__baseFare__btn");

        // Calculate additional price
        const additionPriceContainer = element.querySelector(".book-addition__price__container");
        const additionPrice = additionPriceContainer
            ? parseInt(additionPriceContainer.textContent.replace(/,/g, ""), 10)
            : 0;

        // Update submit button text and action with translations
        const submitButton = modalContainer.querySelector(".book-modal__btn__container");
        submitButton.textContent = additionPrice == 0 ? translate("increase_fare_and_continue") : translate("continue_with_current_fare");
        submitButton.setAttribute("onclick", `submitCard(this,'${foundObject.FlightId}')`);

        // Update total price display
        modalContainer.querySelector(".book-cart__price__container").textContent =
            new Intl.NumberFormat().format(parseInt(defaultTotalCommission) + parseInt(additionPrice));

        // Update all .book-content__api elements in modalContainer
        const apiContents = modalContainer.querySelectorAll(".book-content__api");
        apiContents.forEach(apiContent => {
            const onclickAttr = apiContent.getAttribute("onclick");
            if (onclickAttr && onclickAttr.includes("toggleContentApi")) {
                const match = onclickAttr.match(/toggleContentApi\(this,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
                if (match && match.length === 4) {
                    const [, arg1, arg2] = match;
                    apiContent.setAttribute(
                        "onclick",
                        `toggleContentApi(this,'${arg1}','${arg2}','${idToFind}')`
                    );
                }
                if (apiContent.getAttribute("data-run") !== "0") {
                    apiContent.setAttribute("data-run", "0");
                }
            }
        });

        // Update all .book-api__container__content elements in modalContainer
        const apiContainerContents = modalContainer.querySelectorAll(".book-api__container__content");
        apiContainerContents.forEach(content => {
            const parent = content.parentNode;
            const hasFareFamily = parent.classList.contains("book-flight__fareFamily");
            const hasDetails = parent.classList.contains("book-flight__details");
            const hasPrice = parent.classList.contains("book-flight__price");

            if (!hasFareFamily && !hasDetails && !content.classList.contains("book-hidden")) {
                content.classList.add("book-hidden");
            }

            if (!hasFareFamily && !hasDetails && !hasPrice) {
                content.innerHTML = `
                    <span class="book-api__container__loader book-bg-white book-relative book-block book-w-3 book-h-3 book-rounded-full book-mx-auto book-my-3"></span>
                `;
            }
        });

        // Update .book-route__info elements with Baggages data using translations
        if (foundObject["0"] && Array.isArray(foundObject["0"].Baggages)) {
            const routeInfos = modalContainer.querySelectorAll(".book-route__info");
            foundObject["0"].Baggages.forEach((baggage, index) => {
                if (routeInfos[index]) {
                    const baggageSpan = routeInfos[index].querySelector(".book-baggage-info");
                    if (baggageSpan) {
                        const marginLeftClass = isRTL ? 'book-mr-1' : 'book-ml-1';
                        baggageSpan.innerHTML = baggage.Baggage === "0"
                            ? translate("no_baggage_allowed")
                            : `<span class="book-ltr book-inline-block">${baggage.Baggage || translate("unknown")}<span class="${marginLeftClass}">${baggage.Unit || translate("unknown")}</span></span>`;
                    }
                }
            });
        }
    } catch (error) {
        console.error(`selectAmenities: ${error.message}`);
    }
};

/**
 * Submits the selected flight and redirects to the booking page.
 * @param {HTMLElement} element - The element triggering the submission.
 * @param {string|number} idToFind - The ID of the flight.
 */
const submitCard = (element, idToFind) => {
    try {
        let foundObject = FlightProposalsSource.find(item => item.FlightId === idToFind);

        // If not found in FlightProposalsSource, try FlightAmenitiesProposalsSource
        if (!foundObject) {
            foundObject = FlightAmenitiesProposalsSource.find(item => item.FlightId === idToFind);
        }

        // If found in either source, proceed
        if (foundObject) {
            foundObject.dictionaries = dictionaries;
            sessionStorage.setItem("sessionBook", JSON.stringify(foundObject));
            window.location.href = "/flight/book";
        } else {
            console.error(`submitCard: No object found with FlightId ${idToFind}`);
        }
    } catch (error) {
        console.error(`submitCard: ${error.message}`);
    }
};

/**
* Toggles the visibility of an API content container and fetches rules if needed.
* @param {HTMLElement} element - The element triggering the toggle.
* @param {string} type - Type of content to toggle.
* @param {string} parent - Parent container class name.
* @param {string|number} idToFind - The ID of the flight.
*/
const toggleContentApi = (element, type, parent, idToFind, fromScroll = false) => {
    try {
        // Remove rendering class from any existing active container
        const renderingContainer = document.querySelector(".book-api__container__rendering");
        if (renderingContainer) {
            renderingContainer.classList.remove("book-api__container__rendering");
        }

        // Toggle content visibility and arrow icon
        const apiContainer = element.closest(`.${parent}`);
        const content = apiContainer.querySelector(".book-api__container__content");
        const arrow = apiContainer.querySelector(".book-api__container__arrow use");
        // Toggle content visibility based on scroll or click
        if (fromScroll) {
            if (content.classList.contains('book-hidden')) {
                content.classList.remove('book-hidden');
            }
        } else {
            content.classList.toggle('book-hidden');
        }
        toggleSearchedArrowIcon(arrow);

        // Fetch rules on first run if loader exists
        if (element.dataset.run === "0" && apiContainer.querySelector(".book-api__container__loader")) {
            content.classList.add("book-api__container__rendering");
            let foundObject = FlightProposalsSource.find(item => item.FlightId === idToFind);
            if (!foundObject) {
                foundObject = FlightAmenitiesProposalsSource.find(item => item.FlightId === idToFind);
            }
            if (foundObject) {
                $bc.setSource("cms.rule", {
                    type,
                    SessionId: sessionSearchStorage.SessionId || "",
                    FlightId: idToFind,
                    FlightGroup: JSON.stringify(foundObject.FlightGroup),
                    run: true
                });
            }
            element.setAttribute("data-run", "1");
        }
    } catch (error) {
        console.error(`toggleContentApi: ${error.message}`);
    }
};

/**
* Toggles the sort icon between up and down states.
* @param {HTMLElement} element - The SVG use element to toggle.
* @param {boolean} isAscend - Whether to show the ascending sort icon.
*/
const toggleSvg = (element, isAscend) => {
    try {
        if (!element) return;
        element.innerHTML = `<use xlink:href="/booking/images/sprite-booking-icons.svg#${isAscend ? "sort-up-icon" : "sort-down-icon"}"></use>`;
    } catch (error) {
        console.error(`toggleSvg: ${error.message}`);
    }
};

/**
* Toggles the visibility of a content container and its arrow icon.
* @param {HTMLElement} element - The element triggering the toggle.
*/
const toggleContent = (element) => {
    try {
        const selectorContainer = element.closest(".book-selector__container");
        const content = selectorContainer.querySelector(".book-selector__content");
        content.classList.toggle("book-hidden");
        toggleSearchedArrowIcon(element.querySelector("svg use"));
    } catch (error) {
        console.error(`toggleContent: ${error.message}`);
    }
};

/**
* Toggles the visibility of a content container in the aside section.
* @param {string} element - The type of content to toggle ("filter" or "sort").
*/
const toggleAside = (element) => {
    try {
        // Show the main aside container
        const asideContainer = document.querySelector(".book-aside__container");
        if (asideContainer) {
            asideContainer.classList.remove("book-hidden");
        }

        // Show the relevant content section and hide the other
        const filterContent = document.querySelector(".book-aside__filter__container");
        const sortContent = document.querySelector(".book-aside__sort__container");

        if (element === "filter") {
            filterContent?.classList.remove("book-hidden");
            sortContent?.classList.add("book-hidden");
        } else if (element === "sort") {
            sortContent?.classList.remove("book-hidden");
            filterContent?.classList.add("book-hidden");
        }
    } catch (error) {
        console.error(`toggleAside: ${error.message}`);
    }
};

/**
 * Toggles checkbox state in filter UI
 * @param {string} selector - CSS selector for the filter content container
 * @param {string} value - Value to check or uncheck
 * @param {boolean} isChecked - Whether to add or remove the 'book-checked' class
 * @param {string} [itemSelector=".book-filter__item"] - Selector for the filter item container
 * @returns {void}
 */
const toggleFilterCheckbox = (selector, value, isChecked, itemSelector = ".book-filter__item") => {
    try {
        const part = selector.match(/\.book-([a-zA-Z0-9_-]+?)__/)[1];
        const element = document.querySelector(selector)?.querySelector(`[bc-value="${value}"]`);
        const target = itemSelector ? element?.closest(itemSelector) : element;
        const isSpecialCase =
            selector.includes("book-systemflight__content") ||
            selector.includes("book-farefamily__content");

        if (isSpecialCase && element) {
            // For specific selectors, toggle class directly on element
            if (isChecked) {
                element.classList.add("book-checked");
            } else {
                element.classList.remove("book-checked");
            }

            // Handle mobile add/remove filter
            if (isMobile) {
                if (isChecked) {
                    addFilterDiv(value, `cms.${part}`, '', element.dataset.textshow);
                } else {
                    removeFilterDiv(value);
                }
            }
        } else {
            // Default behavior for all other selectors
            if (target) {
                target.classList.toggle("book-checked", isChecked);
            }
            if (isMobile) {
                if (isChecked) {
                    addFilterDiv(value, `cms.${part}`, '', element?.dataset.textshow);
                } else {
                    removeFilterDiv(value);
                }
            }
        }
    } catch (error) {
        console.error("toggleFilterCheckbox: " + error.message);
    }
};

/**
 * Processes flight API rule responses and renders rules, baggage, or amenities.
 * @param {Object} args - The API response object containing flight rules, baggage, or amenities.
 * @returns {Promise<void>}
 */
const onProcessedFlightApiRule = async (args) => {
    try {
        const { response } = args;
        if (response.status !== 200) return;

        const renderingContainer = document.querySelector(".book-api__container__rendering");
        if (!renderingContainer) return;

        const responseJson = await response.json();
        if (!responseJson) {
            renderingContainer.innerHTML = translate("no_data_available") || "داده‌ای در دسترس نیست";
            return;
        }

        // Render flight rules
        if (responseJson.FlightRules) {
            if (responseJson.FlightRules.length > 0) {
                let output = "";
                for (const item of responseJson.FlightRules) {
                    if (item.Rule?.length > 0) {
                        output += `<div class="book-text-zinc-900 book-text-sm book-text-justify" dir="auto">
                          <div class="book-mb-2 book-flex book-gap-1">
                              <span>${item.From}</span>
                              <svg width="24" height="24">
                                  <use href="/booking/images/sprite-booking-icons.svg#right-arrow-icon"></use>
                              </svg>
                              <span>${item.To}</span>
                          </div>
                          <div>${await renderRule(item.Rule)}</div>
                      </div>`;
                    } else {
                        renderingContainer.innerHTML = translate("no_rules_available") || " با پشتیبانی آژانس تماس بگیرید";
                    }
                }
                renderingContainer.innerHTML = output || (translate("no_rules_available") || " با پشتیبانی آژانس تماس بگیرید");
            } else {
                renderingContainer.innerHTML = translate("no_rules_available") || " با پشتیبانی آژانس تماس بگیرید";
            }
        }
        // Render baggage details
        else if (responseJson.Baggages) {
            if (responseJson.Baggages.length > 0) {
                const originHeader = translate("origin") || "مبدا";
                const destinationHeader = translate("destination") || "مقصد";
                const baggageHeader = translate("baggage") || "بار";

                let output = `<table class="book-w-full  book-table-auto book-border-separate [border-spacing:0_8px]">
                  <thead>
                      <tr>
                          <th class="book-pt-2 book-pb-2 book-pr-2 book-text-center book-text-primary-400">${originHeader}</th>
                          <th class="book-pt-2 book-pb-2 book-text-center book-text-primary-400">${destinationHeader}</th>
                          <th class="book-pt-2 book-pb-2 book-pl-2 book-text-center book-text-primary-400">${baggageHeader}</th>
                      </tr>
                  </thead>
                  <tbody>`;
                for (const item of responseJson.Baggages) {
                    output += `<tr>
                      <td class="book-py-2 book-bg-zinc-100 book-rounded-s-lg book-pr-2 book-text-center">${item.Origin}</td>
                      <td class="book-py-2 book-bg-zinc-100 book-text-center">${item.Destination}</td>
                      <td class="book-py-2 book-bg-zinc-100 book-rounded-e-lg book-pl-2 book-text-center book-ltr book-font-arial">${item.Baggage} ${item.Unit}</td>
                  </tr>`;
                }
                output += `</tbody></table>`;
                renderingContainer.innerHTML = output;
            } else {
                renderingContainer.innerHTML = translate("no_rules_available") || " با پشتیبانی آژانس تماس بگیرید";
            }
        }
        // Render amenities proposals
        else if (responseJson.FlightProposals) {
            if (responseJson.FlightProposals.length > 0) {
                FlightAmenitiesProposalsSource = responseJson.FlightProposals;
                let output = `<div class="book-grid md:book-grid-cols-3 book-gap-4 book-ltr">`;
                for (const item of responseJson.FlightProposals) {
                    output += `<div class="book-border book-rounded-2xl book-border-zinc-200 book-cursor-pointer${await renderSelectedAmenities(item.PriceInfo.TotalCommission)}" onclick="selectAmenities(this,'${item.FlightId}')">
                      <div class="book-p-3">`;
                    for (const group of item.FlightGroup || []) {
                        output += `
                          <h6 class="book-font-bold book-mb-2 book-text-zinc-900">${group.BrandedFare}</h6>
                          <p class="book-mb-2 book-text-zinc-900">Included | NotOffered</p>
                          <ul class="book-font-arial book-space-y-2 book-text-sm book-text-zinc-700 book-h-[21rem] book-overflow-auto">
                              ${await renderAmenities(group.Amenities)}
                          </ul>`;
                    }
                    output += `${await renderBaseFare(item.PriceInfo.TotalCommission, item.PriceInfo.Currency, item.FlightId)}</div></div>`;
                }
                output += `</div>`;
                renderingContainer.innerHTML = output;
            } else {
                renderingContainer.innerHTML = translate("no_amenities_available");
            }
        }
    } catch (error) {
        console.error(`onProcessedFlightApiRule: ${error.message}`);
    }
};

/**
* Initializes a slider for hour range filtering.
* @param {HTMLElement} hourContainer - The container element for the slider.
* @param {string} argsValue - The value indicating min or max thumb ("min" or "max").
* @param {number} maxHour - Maximum hour value in minutes.
* @param {number} minHour - Minimum hour value in minutes.
* @param {HTMLElement} hourMinValueLabel - Element to display minimum value.
* @param {HTMLElement} hourMaxValueLabel - Element to display maximum value.
* @param {Array<number>} hourRange - Array to store current min and max values.
* @param {string} type - Type of slider ("outboundhour", "inboundhour", or "hour").
* @param {string} label - Label for the filter.
* @returns {Promise<void>}
*/
function getOutboundDurationElements() {
    return {
        slider: document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-slider__content"),
        track: document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-slider__track"),
        thumbMin: document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-thumb__min"),
        thumbMax: document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-thumb__max"),
        minLabel: document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-min__value"),
        maxLabel: document.querySelector(".book-outboundhour__content .book-filter__hour__container .book-max__value")
    };
}

function getInboundDurationElements() {
    return {
        slider: document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-slider__content"),
        track: document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-slider__track"),
        thumbMin: document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-thumb__min"),
        thumbMax: document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-thumb__max"),
        minLabel: document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-min__value"),
        maxLabel: document.querySelector(".book-inboundhour__content .book-filter__hour__container .book-max__value")
    };
}

const initializeSlider = async (hourContainer, argsValue, maxHour, minHour, hourMinValueLabel, hourMaxValueLabel, hourRange, type, label) => {
    try {
        const hourSlider = hourContainer.querySelector(".book-slider__content");
        const hourTrack = hourContainer.querySelector(".book-slider__track");
        const hourThumbMin = hourContainer.querySelector(".book-thumb__min");
        const hourThumbMax = hourContainer.querySelector(".book-thumb__max");
        const sliderRect = hourSlider.getBoundingClientRect();

        // Get current percentages based on type
        let currentMinPercent, currentMaxPercent;

        if (type === "outboundhour") {
            currentMinPercent = outboundMinPercent;
            currentMaxPercent = outboundMaxPercent;
        } else if (type === "inboundhour") {
            currentMinPercent = inboundMinPercent;
            currentMaxPercent = inboundMaxPercent;
        } else {
            currentMinPercent = durationMinPercent;
            currentMaxPercent = durationMaxPercent;
        }

        /**
         * Updates slider position on mouse move.
         * @param {MouseEvent} e - Mouse event.
         */
        const onMouseMove = (e) => {
            const x = Math.min(Math.max(e.clientX - sliderRect.left, 0), sliderRect.width);
            const percent = (x / sliderRect.width) * 100;

            if (argsValue === "min" && percent <= currentMaxPercent) {
                currentMinPercent = percent;
                if (type === "outboundhour") outboundMinPercent = percent;
                else if (type === "inboundhour") inboundMinPercent = percent;
                else durationMinPercent = percent;
            } else if (argsValue === "max" && percent >= currentMinPercent) {
                currentMaxPercent = percent;
                if (type === "outboundhour") outboundMaxPercent = percent;
                else if (type === "inboundhour") inboundMaxPercent = percent;
                else durationMaxPercent = percent;
            }
            updateHourSlider(type, label, minHour, maxHour, hourContainer, hourRange);
        };

        /**
         * Removes mouse event listeners on mouse up.
         */
        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);

        // Initial update
        updateHourSlider(type, label, minHour, maxHour, hourContainer, hourRange);
    } catch (error) {
        console.error(`initializeSlider: ${error.message}`);
    }
};

/**
* Updates the filter display in the filter container.
* @param {string} type - Type of filter ("price", "outboundhour", "inboundhour", or "hour").
* @param {string} label - Label for the filter.
* @param {number} minValue - Current minimum value.
* @param {number} maxValue - Current maximum value.
* @param {number} originalMin - Original minimum value.
* @param {number} originalMax - Original maximum value.
* @param {HTMLElement} hourContainer - The container element for the slider.
* @param {Array<number>} hourRange - Array to store current min and max values.
*/
const updateFilterDisplay = (type, label, minValue, maxValue, originalMin, originalMax, hourContainer = null, hourRange = null) => {
    try {
        if (isMobile) {
            removeFilterDiv(label);
        };

        if (minValue !== originalMin || maxValue !== originalMax) {
            let displayValue;
            let filterLabel;

            if (type === "price") {
                const formattedMin = new Intl.NumberFormat().format(minValue);
                const formattedMax = new Intl.NumberFormat().format(maxValue);
                displayValue = `${formattedMin} - ${formattedMax}`;
                filterLabel = `${translate("price") || "قیمت"}: ${displayValue}`;
                if (isMobile) {
                    addFilterDiv(label, `cms.${type}`, filterLabel, null, {
                        originalMin,
                        originalMax,
                        hourContainer,
                        hourRange
                    });
                }

            } else if (type === "outboundhour" || type === "inboundhour" || type === "hour") {
                const formatTime = (minutes) => {
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    return `${hours} ${translate("hour")} ${mins} ${translate("minute")}`;
                };
                const formattedMin = formatTime(minValue);
                const formattedMax = formatTime(maxValue);
                displayValue = `${formattedMin} - ${formattedMax}`;
                filterLabel =
                    type === "outboundhour" ? `${translate("outbound_time") || "ساعت رفت"}: ${displayValue}` :
                        type === "inboundhour" ? `${translate("return_time") || "ساعت برگشت"}: ${displayValue}` :
                            `${translate("time") || "ساعت"}: ${displayValue}`;
                if (isMobile) {
                    addFilterDiv(label, `cms.${type}`, filterLabel, null, {
                        originalMin,
                        originalMax,
                        hourContainer,
                        hourRange
                    });
                }
            }
        }
    } catch (error) {
        console.error(`updateFilterDisplay: ${error.message}`);
    }
};

/**
* Resets the filter range to its original values and updates the UI.
* @param {string} type - Type of filter ("price", "outboundhour", "inboundhour", or "hour").
* @param {string} label - Label for the filter.
* @param {number} originalMin - Original minimum value.
* @param {number} originalMax - Original maximum value.
* @param {HTMLElement} hourContainer - The container element for the slider.
* @param {Array<number>} hourRange - Array to store current min and max values.
*/
const resetFilterRange = (type, label, originalMin, originalMax, hourContainer, hourRange) => {
    try {
        if (type === "price") {
            priceMinPercent = 0;
            priceMaxPercent = 100;
            resetPriceFilter();
        } else if (type === "outboundhour") {
            outboundMinPercent = 0;
            outboundMaxPercent = 100;
            updateHourSlider(type, label, originalMin, originalMax, hourContainer, hourRange);
        } else if (type === "inboundhour") {
            inboundMinPercent = 0;
            inboundMaxPercent = 100;
            updateHourSlider(type, label, originalMin, originalMax, hourContainer, hourRange);
        } else if (type === "hour") {
            durationMinPercent = 0;
            durationMaxPercent = 100;
            updateHourSlider(type, label, originalMin, originalMax, hourContainer, hourRange);
        }

        if (isMobile) {
            // Remove the filter
            removeFilterDiv(label);
        }

        // Trigger source update
        $bc.setSource(`cms.${type}`, {
            value: "reset",
            min: originalMin,
            max: originalMax
        });
    } catch (error) {
        console.error(`resetFilterRange: ${error.message}`);
    }
};

const preservePriceLabels = () => {
    try {
        const totalRange = maxPrice - minPrice;
        const currentMinPrice = Math.round((priceMinPercent / 100) * totalRange + minPrice);
        const currentMaxPrice = Math.round((priceMaxPercent / 100) * totalRange + minPrice);

        if (priceMinValueLabel) {
            priceMinValueLabel.textContent = new Intl.NumberFormat().format(currentMinPrice);
        }
        if (priceMaxValueLabel) {
            priceMaxValueLabel.textContent = new Intl.NumberFormat().format(currentMaxPrice);
        }

    } catch (error) {
        console.error("preservePriceLabels: " + error.message);
    }
};

const resetPriceFilter = () => {
    try {
        priceMinPercent = 0;
        priceMaxPercent = 100;
        priceRange = [minPrice, maxPrice];
        userHasChangedPriceRange = false;
        lastUserMinPrice = minPrice;
        lastUserMaxPrice = maxPrice;

        updatePriceSlider();
        mustUpdate = true;
        if (typeof manipulation === 'function') {
            manipulation({
                source: {
                    id: 'cms.price.update',
                    rows: [{ value: 'reset' }]
                },
                context: {
                    setAsSource: function () { },
                    tryToGetSource: function () { return null; }
                }
            });
        }

    } catch (error) {
        console.error("resetPriceFilter: " + error.message);
    }
};

function cleanupPriceSliderEvents() {
    try {
        if (window.priceMouseMoveHandler) {
            document.removeEventListener("mousemove", window.priceMouseMoveHandler);
            delete window.priceMouseMoveHandler;
        }
        if (window.priceMouseUpHandler) {
            document.removeEventListener("mouseup", window.priceMouseUpHandler);
            delete window.priceMouseUpHandler;
        }

        if (priceThumbMin && priceThumbMin._touchStartHandler) {
            priceThumbMin.removeEventListener('touchstart', priceThumbMin._touchStartHandler);
            delete priceThumbMin._touchStartHandler;
        }
        if (priceThumbMax && priceThumbMax._touchStartHandler) {
            priceThumbMax.removeEventListener('touchstart', priceThumbMax._touchStartHandler);
            delete priceThumbMax._touchStartHandler;
        }

        if (window.priceTouchMoveHandler) {
            document.removeEventListener('touchmove', window.priceTouchMoveHandler);
            delete window.priceTouchMoveHandler;
        }
        if (window.priceTouchEndHandler) {
            document.removeEventListener('touchend', window.priceTouchEndHandler);
            document.removeEventListener('touchcancel', window.priceTouchEndHandler);
            delete window.priceTouchEndHandler;
        }
    } catch (error) {
        console.error("cleanupPriceSliderEvents:", error.message);
    }
}

function setupDesktopPriceSlider(thumbType) {
    try {
        let isDragging = false;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const rect = priceSlider.getBoundingClientRect();
            const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
            const percent = (x / rect.width) * 100;

            if (thumbType === "min" && percent <= priceMaxPercent) {
                priceMinPercent = percent;
            } else if (thumbType === "max" && percent >= priceMinPercent) {
                priceMaxPercent = percent;
            }
            updatePriceSlider();
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;

            document.removeEventListener("mousemove", window.priceMouseMoveHandler);
            document.removeEventListener("mouseup", window.priceMouseUpHandler);

            applyPriceFilter();
        };

        window.priceMouseMoveHandler = onMouseMove;
        window.priceMouseUpHandler = onMouseUp;

        isDragging = true;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);

    } catch (error) {
        console.error("setupDesktopPriceSlider:", error.message);
    }
}

function setupMobilePriceSlider(thumbType) {
    try {
        let isTouchDragging = false;
        let currentThumb = thumbType;

        const getTouchX = (e) => {
            const touch = e.touches[0] || e.changedTouches[0];
            return touch ? touch.clientX : 0;
        };

        const updateSliderFromTouch = (clientX) => {
            const rect = priceSlider.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percent = (x / rect.width) * 100;

            if (currentThumb === "min" && percent <= priceMaxPercent) {
                priceMinPercent = percent;
            } else if (currentThumb === "max" && percent >= priceMinPercent) {
                priceMaxPercent = percent;
            }
            updatePriceSlider();
        };

        const onTouchMove = (e) => {
            if (!isTouchDragging) return;
            e.preventDefault();
            e.stopPropagation();

            const touchX = getTouchX(e);
            updateSliderFromTouch(touchX);
        };

        const onTouchEnd = (e) => {
            if (!isTouchDragging) return;

            isTouchDragging = false;

            document.removeEventListener("touchmove", window.priceTouchMoveHandler);
            document.removeEventListener("touchend", window.priceTouchEndHandler);
            document.removeEventListener("touchcancel", window.priceTouchEndHandler);

            applyPriceFilter();
        };

        window.priceTouchMoveHandler = onTouchMove;
        window.priceTouchEndHandler = onTouchEnd;

        isTouchDragging = true;
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd, { passive: false });
        document.addEventListener("touchcancel", onTouchEnd, { passive: false });

    } catch (error) {
        console.error("setupMobilePriceSlider:", error.message);
    }
}

function applyPriceFilter() {
    try {
        userHasChangedPriceRange = true;
        lastUserMinPrice = priceRange[0];
        lastUserMaxPrice = priceRange[1];
        mustUpdate = true;

        if (typeof $bc !== 'undefined' && $bc.setSource) {
            $bc.setSource("cms.price.update", {
                value: "range",
                minPrice: priceRange[0],
                maxPrice: priceRange[1],
                run: true
            });
        } else {
            manipulation({
                source: {
                    id: 'cms.price.update',
                    rows: [{
                        value: 'range',
                        minPrice: priceRange[0],
                        maxPrice: priceRange[1]
                    }]
                },
                context: {
                    setAsSource: function (sourceId, data) {
                    },
                    tryToGetSource: function (sourceId) {
                        return null;
                    }
                }
            });
        }

    } catch (error) {
        console.error("applyPriceFilter:", error.message);
    }
}

const updatePriceSlider = () => {
    try {
        const totalRange = maxPrice - minPrice;
        const priceMinValue = Math.round((priceMinPercent / 100) * totalRange + minPrice);
        const priceMaxValue = Math.round((priceMaxPercent / 100) * totalRange + minPrice);

        priceRange = [priceMinValue, priceMaxValue];

        if (priceMinValueLabel) {
            priceMinValueLabel.textContent = new Intl.NumberFormat().format(priceMinValue);
        }
        if (priceMaxValueLabel) {
            priceMaxValueLabel.textContent = new Intl.NumberFormat().format(priceMaxValue);
        }

        if (priceThumbMin) {
            priceThumbMin.style.left = `${priceMinPercent}%`;
        }
        if (priceThumbMax) {
            priceThumbMax.style.left = `${priceMaxPercent}%`;
        }
        if (priceTrack) {
            priceTrack.style.left = `${priceMinPercent}%`;
            priceTrack.style.right = `${100 - priceMaxPercent}%`;
        }

        if (typeof updateFilterDisplay === 'function') {
            updateFilterDisplay(
                "price",
                "price-range",
                priceMinValue,
                priceMaxValue,
                minPrice,
                maxPrice,
                null,
                null
            );
        }

    } catch (error) {
        console.error(`updatePriceSlider: ${error.message}`);
    }
};

// duration filter
// =============================================================================
// APPLY FILTER FUNCTIONS
// =============================================================================

function applyDurationFilter() {
    try {
        durationUserHasChanged = true;
        durationLastUserMinHour = hourRange[0];
        durationLastUserMaxHour = hourRange[1];
        mustUpdate = true;

        if (typeof $bc !== 'undefined' && $bc.setSource) {
            $bc.setSource("cms.hour.update", {
                value: "range",
                minDuration: hourRange[0],
                maxDuration: hourRange[1],
                run: true
            });
        } else {
            manipulation({
                source: {
                    id: 'cms.hour.update',
                    rows: [{
                        value: 'range',
                        minDuration: hourRange[0],
                        maxDuration: hourRange[1]
                    }]
                },
                context: {
                    setAsSource: function (sourceId, data) {
                    },
                    tryToGetSource: function (sourceId) {
                        return null;
                    }
                }
            });
        }

    } catch (error) {
        console.error("applyDurationFilter:", error.message);
    }
}

// =============================================================================
// RESET FUNCTIONS
// =============================================================================

const resetDurationFilter = () => {
    try {
        durationMinPercent = 0;  // تغییر از minPercent به durationMinPercent
        durationMaxPercent = 100; // تغییر از maxPercent به durationMaxPercent
        hourRange = [minHour, maxHour];
        durationUserHasChanged = false;
        durationLastUserMinHour = minHour;
        durationLastUserMaxHour = maxHour;

        updateDurationSliderUI();
        mustUpdate = true;
        if (typeof manipulation === 'function') {
            manipulation({
                source: {
                    id: 'cms.hour.update',
                    rows: [{ value: 'reset' }]
                },
                context: {
                    setAsSource: function () { },
                    tryToGetSource: function () { return null; }
                }
            });
        }

    } catch (error) {
        console.error("resetDurationFilter: " + error.message);
    }
};

function resetDurationFilters() {
    try {
        // Reset outbound filter
        outboundMinPercent = 0;
        outboundMaxPercent = 100;
        outboundHourRange = [outboundMinHour, outboundMaxHour];

        // Reset inbound filter  
        inboundMinPercent = 0;
        inboundMaxPercent = 100;
        inboundHourRange = [inboundMinHour, inboundMaxHour];

        // Reset general filter
        durationMinPercent = 0;  // تغییر از minPercent به durationMinPercent
        durationMaxPercent = 100; // تغییر از maxPercent به durationMaxPercent
        hourRange = [minHour, maxHour];

        // Update UI
        updateOutboundDurationSlider();
        updateInboundDurationSlider();

        // Remove mobile filters
        if (isMobile) {
            removeFilterDiv("outboundhour-range");
            removeFilterDiv("inboundhour-range");
            removeFilterDiv("hour-range");
        }

    } catch (error) {
        console.error("resetDurationFilters:", error.message);
    }
}
// =============================================================================
// INITIALIZATION
// =============================================================================

function initializeDurationSliders() {
    try {
        if (durationSliderInitialized) return;

        // Setup event listeners for outbound slider
        const outboundElements = getOutboundDurationElements();
        if (outboundElements.thumbMin && outboundElements.thumbMax) {
            setupDurationSliderEvents(outboundElements.thumbMin, outboundElements.thumbMax, 'outbound');
        }

        // Setup event listeners for inbound slider  
        const inboundElements = getInboundDurationElements();
        if (inboundElements.thumbMin && inboundElements.thumbMax) {
            setupDurationSliderEvents(inboundElements.thumbMin, inboundElements.thumbMax, 'inbound');
        }

        durationSliderInitialized = true;

    } catch (error) {
        console.error("initializeDurationSliders:", error.message);
    }
}

function setupDurationSliderEvents(thumbMin, thumbMax, sliderType) {
    try {
        // Mouse events for desktop
        thumbMin.addEventListener('mousedown', (e) => {
            e.preventDefault();
            cleanupDurationSliderEvents();
            activeDurationSliderType = sliderType;
            if (!isMobile) {
                setupDesktopDurationSlider('min');
            }
        });

        thumbMax.addEventListener('mousedown', (e) => {
            e.preventDefault();
            cleanupDurationSliderEvents();
            activeDurationSliderType = sliderType;
            if (!isMobile) {
                setupDesktopDurationSlider('max');
            }
        });

        // Touch events for mobile
        if (isMobile) {
            thumbMin.addEventListener('touchstart', (e) => {
                e.preventDefault();
                cleanupDurationSliderEvents();
                activeDurationSliderType = sliderType;
                setupMobileDurationSlider('min');
            }, { passive: false });

            thumbMax.addEventListener('touchstart', (e) => {
                e.preventDefault();
                cleanupDurationSliderEvents();
                activeDurationSliderType = sliderType;
                setupMobileDurationSlider('max');
            }, { passive: false });
        }

    } catch (error) {
        console.error(`setupDurationSliderEvents (${sliderType}):`, error.message);
    }
}

// =============================================================================
// PRESERVE EXISTING UPDATEHOURSLIDER FUNCTION
// =============================================================================

function preserveDurationLabels() {
    try {
        const totalRange = maxHour - minHour;
        const currentMinHour = Math.round((minPercent / 100) * totalRange + minHour);
        const currentMaxHour = Math.round((maxPercent / 100) * totalRange + minHour);

        if (hourMinValueLabel) {
            hourMinValueLabel.textContent = convertToTime(currentMinHour);
        }
        if (hourMaxValueLabel) {
            hourMaxValueLabel.textContent = convertToTime(currentMaxHour);
        }

    } catch (error) {
        console.error("preserveDurationLabels: " + error.message);
    }
}

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

function cleanupDurationSliderEvents() {
    try {
        isDurationSliderActive = false;
        // Remove any existing listeners (they will be replaced with new ones)
    } catch (error) {
        console.error("cleanupDurationSliderEvents:", error.message);
    }
}

// =============================================================================
// DESKTOP DURATION SLIDER FUNCTIONS
// =============================================================================
function setupDesktopDurationSlider(thumbType) {
    try {
        const elements = activeDurationSliderType === 'outbound'
            ? getOutboundDurationElements()
            : getInboundDurationElements();

        if (!elements.slider) {
            console.warn(`Duration slider not found for ${activeDurationSliderType}`);
            return;
        }

        isDurationSliderActive = true;

        const onMouseMove = (e) => {
            if (!isDurationSliderActive) return;

            const rect = elements.slider.getBoundingClientRect();
            const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
            const percent = (x / rect.width) * 100;

            if (thumbType === "min") {
                const maxPercent = activeDurationSliderType === 'outbound' ? outboundMaxPercent : inboundMaxPercent;
                if (percent <= maxPercent) {
                    if (activeDurationSliderType === 'outbound') {
                        outboundMinPercent = percent;
                    } else {
                        inboundMinPercent = percent;
                    }
                    updateDurationSliderUI();
                }
            } else if (thumbType === "max") {
                const minPercent = activeDurationSliderType === 'outbound' ? outboundMinPercent : inboundMinPercent;
                if (percent >= minPercent) {
                    if (activeDurationSliderType === 'outbound') {
                        outboundMaxPercent = percent;
                    } else {
                        inboundMaxPercent = percent;
                    }
                    updateDurationSliderUI();
                }
            }
        };

        const onMouseUp = () => {
            if (!isDurationSliderActive) return;

            isDurationSliderActive = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);

            applyDurationFilterImmediate();
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);

    } catch (error) {
        console.error("setupDesktopDurationSlider:", error.message);
    }
}

// =============================================================================
// MOBILE DURATION SLIDER FUNCTIONS
// =============================================================================
function setupMobileDurationSlider(thumbType) {
    try {
        const elements = activeDurationSliderType === 'outbound'
            ? getOutboundDurationElements()
            : getInboundDurationElements();

        if (!elements.slider) {
            console.warn(`Duration slider not found for ${activeDurationSliderType}`);
            return;
        }

        isDurationSliderActive = true;

        const getTouchX = (e) => {
            const touch = e.touches[0] || e.changedTouches[0];
            return touch ? touch.clientX : 0;
        };

        const onTouchMove = (e) => {
            if (!isDurationSliderActive) return;
            e.preventDefault();

            const rect = elements.slider.getBoundingClientRect();
            const x = Math.max(0, Math.min(getTouchX(e) - rect.left, rect.width));
            const percent = (x / rect.width) * 100;

            if (thumbType === "min") {
                const maxPercent = activeDurationSliderType === 'outbound' ? outboundMaxPercent : inboundMaxPercent;
                if (percent <= maxPercent) {
                    if (activeDurationSliderType === 'outbound') {
                        outboundMinPercent = percent;
                    } else {
                        inboundMinPercent = percent;
                    }
                    updateDurationSliderUI();
                }
            } else if (thumbType === "max") {
                const minPercent = activeDurationSliderType === 'outbound' ? outboundMinPercent : inboundMinPercent;
                if (percent >= minPercent) {
                    if (activeDurationSliderType === 'outbound') {
                        outboundMaxPercent = percent;
                    } else {
                        inboundMaxPercent = percent;
                    }
                    updateDurationSliderUI();
                }
            }
        };

        const onTouchEnd = () => {
            if (!isDurationSliderActive) return;

            isDurationSliderActive = false;
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            document.removeEventListener("touchcancel", onTouchEnd);

            applyDurationFilterImmediate();
        };

        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd, { passive: false });
        document.addEventListener("touchcancel", onTouchEnd, { passive: false });

    } catch (error) {
        console.error("setupMobileDurationSlider:", error.message);
    }
}

function updateDurationSliderUI() {
    try {
        const elements = activeDurationSliderType === 'outbound'
            ? getOutboundDurationElements()
            : getInboundDurationElements();

        if (!elements.slider) return;

        const isOutbound = activeDurationSliderType === 'outbound';
        const currentMinPercent = isOutbound ? outboundMinPercent : inboundMinPercent;
        const currentMaxPercent = isOutbound ? outboundMaxPercent : inboundMaxPercent;
        const minHourValue = isOutbound ? outboundMinHour : inboundMinHour;
        const maxHourValue = isOutbound ? outboundMaxHour : inboundMaxHour;
        const hourRangeRef = isOutbound ? outboundHourRange : inboundHourRange;

        const totalRange = maxHourValue - minHourValue;
        const minValue = Math.round(minHourValue + (currentMinPercent / 100) * totalRange);
        const maxValue = Math.round(minHourValue + (currentMaxPercent / 100) * totalRange);

        // Update range
        hourRangeRef[0] = minValue;
        hourRangeRef[1] = maxValue;

        // Update labels
        if (elements.minLabel) {
            elements.minLabel.textContent = convertToTime(minValue);
        }
        if (elements.maxLabel) {
            elements.maxLabel.textContent = convertToTime(maxValue);
        }

        // Update slider visual
        if (elements.thumbMin) {
            elements.thumbMin.style.left = `${currentMinPercent}%`;
        }
        if (elements.thumbMax) {
            elements.thumbMax.style.left = `${currentMaxPercent}%`;
        }
        if (elements.track) {
            elements.track.style.left = `${currentMinPercent}%`;
            elements.track.style.right = `${100 - currentMaxPercent}%`;
        }

    } catch (error) {
        console.error("updateDurationSliderUI:", error.message);
    }
}







// Apply Duration Filter
function applyDurationFilterImmediate() {
    try {
        mustUpdate = true;

        const isOutbound = activeDurationSliderType === 'outbound';
        const sourceId = isOutbound ? "cms.outboundhour.update" : "cms.inboundhour.update";
        const rangeRef = isOutbound ? outboundHourRange : inboundHourRange;

        if (typeof $bc !== 'undefined' && $bc.setSource) {
            $bc.setSource(sourceId, {
                value: "range",
                minDuration: rangeRef[0],
                maxDuration: rangeRef[1],
                run: true
            });
        }

        // Update filter display for mobile
        if (isMobile) {
            const type = isOutbound ? "outboundhour" : "inboundhour";
            const label = `${type}-range`;
            const originalMin = isOutbound ? outboundMinHour : inboundMinHour;
            const originalMax = isOutbound ? outboundMaxHour : inboundMaxHour;

            updateFilterDisplay(
                type,
                label,
                rangeRef[0],
                rangeRef[1],
                originalMin,
                originalMax,
                null,
                rangeRef
            );
        }

    } catch (error) {
        console.error("applyDurationFilterImmediate:", error.message);
    }
}

/**
* Converts minutes to a formatted hour-minute string.
* @param {number} minutes - Time in minutes.
* @returns {string|null} Formatted time string or null on error.
*/
const convertToTime = (minutes) => {
    try {
        if (isNaN(minutes)) throw new Error("Invalid input for minutes");
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;

        let result = '';
        if (h > 0) result += `${h} ${translate("hour")}`;
        if (m > 0) result += (h > 0 ? ' ' : '') + `${translate("and")} ${m} ${translate("minute")}`;

        return result || `0 ${translate("minute")}`;
    } catch (error) {
        console.error(`convertToTime: ${error.message}`);
        return null;
    }
};

/**
* Converts various time formats to total minutes.
* @param {string} input - Time input in various formats.
* @returns {number} Total minutes or 0 on error.
*/
const convertToMinutes = (input) => {
    try {
        if (typeof input === "string" && input.includes(" ")) {
            const [hours, minutes] = input.split(" ").map(part => parseInt(part, 10));
            return (hours || 0) * 60 + (minutes || 0);
        }
        if (typeof input === "string" && input.match(/\d+h.*\d+m/)) {
            const hoursMatch = input.match(/(\d+)h/);
            const minutesMatch = input.match(/(\d+)m/);
            const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
            return hours * 60 + minutes;
        }
        if (typeof input === "string" && input.includes(":")) {
            const [hours, minutes] = input.split(":").map(Number);
            return (hours || 0) * 60 + (minutes || 0);
        }
        return 0;
    } catch (error) {
        console.error(`convertToMinutes: ${error.message}`);
        return 0;
    }
};

/**
* Removes a filter div from the filter container.
* @param {string} value - The filter value to remove.
* @returns {number} 0 on error or if filter not found.
*/
const removeFilterDiv = (value) => {
    try {
        const existingFilter = document.querySelector(".book-aside__filter__header").querySelector(`[data-filter-value="${value}"]`);
        if (existingFilter) {
            existingFilter.remove();
        }
        return 1;
    } catch (error) {
        console.error(`removeFilterDiv: ${error.message}`);
        return 0;
    }
};

/**
* Updates the hour slider UI based on current percentages.
* @param {string} type - Type of slider ("outboundhour", "inboundhour", or "hour").
* @param {string} label - Label for the filter.
* @param {number} minHour - Minimum hour value in minutes.
* @param {number} maxHour - Maximum hour value in minutes.
* @param {HTMLElement} hourContainer - The container element for the slider.
* @param {Array<number>} hourRange - Array to store current min and max values.
*/
const updateHourSlider = (type, label, minHour, maxHour, hourContainer, hourRange) => {
    try {
        // Get current percentages based on type
        let currentMinPercent, currentMaxPercent;

        if (type === "outboundhour") {
            currentMinPercent = outboundMinPercent;
            currentMaxPercent = outboundMaxPercent;
        } else if (type === "inboundhour") {
            currentMinPercent = inboundMinPercent;
            currentMaxPercent = inboundMaxPercent;
        } else {
            currentMinPercent = durationMinPercent;
            currentMaxPercent = durationMaxPercent;
        }

        // Get slider elements
        const hourMinValueLabel = hourContainer.querySelector(".book-min__value");
        const hourMaxValueLabel = hourContainer.querySelector(".book-max__value");
        const hourThumbMin = hourContainer.querySelector(".book-thumb__min");
        const hourThumbMax = hourContainer.querySelector(".book-thumb__max");
        const hourTrack = hourContainer.querySelector(".book-slider__track");

        // Calculate values
        const totalRange = maxHour - minHour;
        const hourMinValue = Math.round((currentMinPercent / 100) * totalRange + minHour);
        const hourMaxValue = Math.round((currentMaxPercent / 100) * totalRange + minHour);

        // Update labels
        hourMinValueLabel.textContent = `${Math.floor(hourMinValue / 60)} ${translate("hour")} ${hourMinValue % 60} ${translate("minute")}`;
        hourMaxValueLabel.textContent = `${Math.floor(hourMaxValue / 60)} ${translate("hour")} ${hourMaxValue % 60} ${translate("minute")}`;

        // Update range array
        hourRange[0] = hourMinValue;
        hourRange[1] = hourMaxValue;

        // Update slider UI
        hourThumbMin.style.left = `${currentMinPercent}%`;
        hourThumbMax.style.left = `${currentMaxPercent}%`;
        hourTrack.style.left = `${currentMinPercent}%`;
        hourTrack.style.right = `${100 - currentMaxPercent}%`;

        // Update filter display
        updateFilterDisplay(type, label, hourMinValue, hourMaxValue, minHour, maxHour, hourContainer, hourRange);
    } catch (error) {
        console.error(`updateHourSlider (${type}): ${error.message}`);
    }
};

/**
* Adds a filter div to the filter container if it doesn't exist.
* @param {string} identifier - Unique identifier for the filter.
* @param {string} cmsName - CMS name for the filter source.
* @param {string} [displayValue] - Display value for the filter.
* @param {string} [displayText] - Display text for the filter.
* @returns {number} 0 on error, 1 on success.
*/
const addFilterDiv = (identifier, cmsName, displayValue = null, displayText = null, extra = {}) => {
    try {
        const existingFilter = filterContent.querySelector(`[data-filter-value="${identifier}"]`);
        if (!existingFilter) {
            const filterDiv = document.createElement("div");
            filterDiv.className = "book-filtered__item book-text-zinc-600 book-cursor-pointer book-text-center book-p-1 book-min-w-16 book-inline-block book-rounded-2xl book-text-xs book-bg-white book-ml-2";
            filterDiv.setAttribute("data-filter-value", identifier);

            const removeSpan = document.createElement("span");
            removeSpan.className = "book-filter__remove book-align-middle book-mr-1 book-inline-block";
            removeSpan.innerHTML = `<svg width="18" height="18">
              <use href="/booking/images/sprite-booking-icons.svg#close-icon"></use>
          </svg>`;
            removeSpan.style.cursor = "pointer";

            if (cmsName === 'cms.outboundhour' || cmsName === 'cms.inboundhour' || cmsName === 'cms.hour') {
                filterDiv.addEventListener("click", () => {
                    resetFilterRange(
                        cmsName.replace("cms.", ""),
                        identifier,
                        extra.originalMin,
                        extra.originalMax,
                        extra.hourContainer,
                        extra.hourRange
                    );
                });
            } else if (identifier === 'outbound-flight-number' || identifier === 'inbound-flight-number' || identifier === 'flight-number') {
                filterDiv.addEventListener("click", () => {
                    $bc.setSource(cmsName, { value: '' });
                    const contentClass = `.book-${identifier.replace(/-/g, "")}__content`;
                    const container = document.querySelector(contentClass);
                    if (container) {
                        const input = container.querySelector("input");
                        if (input) input.value = "";
                    }
                });
            }
            else if (cmsName === "cms.price") {
                filterDiv.addEventListener("click", () => {
                    priceMinPercent = 0;  // تغییر از minPercent به priceMinPercent
                    priceMaxPercent = 100; // تغییر از maxPercent به priceMaxPercent
                    priceRange = [minPrice, maxPrice];
                    updatePriceSlider();
                    removeFilterDiv(identifier);
                    $bc.setSource("cms.price", {
                        value: "reset",
                        min: extra.originalMin,
                        max: extra.originalMax
                    });
                });
            }
            else {
                filterDiv.addEventListener("click", () => {
                    $bc.setSource(cmsName, { value: identifier });
                });
            }

            const textToShow = displayText || displayValue || identifier;
            filterDiv.appendChild(document.createTextNode(textToShow + " "));
            filterDiv.appendChild(removeSpan);
            document.querySelector(".book-aside__filter__header").appendChild(filterDiv);
            return 1;
        }
        return 0;
    } catch (error) {
        console.error(`addFilterDiv: ${error.message}`);
        return 0;
    }
};

/**
 * Utility for handling Jalali (Persian) date conversions and validations.
 */
const JalaliDate = {
    g_days_in_month: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    j_days_in_month: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29],

    /**
     * Checks if a Jalali year is a leap year.
     * @param {number} year - The Jalali year.
     * @returns {boolean} True if the year is a leap year, false otherwise.
     */
    isLeapJalali(year) {
        try {
            const mod = year % 33;
            return [1, 5, 9, 13, 17, 22, 26, 30].includes(mod);
        } catch (error) {
            console.error(`isLeapJalali: ${error.message}`);
            return false;
        }
    },

    /**
     * Converts a Jalali date to Gregorian format.
     * @param {number} j_y - Jalali year.
     * @param {number} j_m - Jalali month (1-12).
     * @param {number} j_d - Jalali day.
     * @returns {string} Gregorian date in YYYY-MM-DD format.
     */
    JalaliToGregorian(j_y, j_m, j_d) {
        try {
            j_y = parseInt(j_y, 10);
            j_m = parseInt(j_m, 10) - 1;
            j_d = parseInt(j_d, 10) - 1;

            const jy = j_y - 979;
            let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
            j_day_no += this.j_days_in_month.slice(0, j_m).reduce((a, b) => a + b, 0) + j_d;

            let g_day_no = j_day_no + 79;
            let gy = 1600 + Math.floor(g_day_no / 146097) * 400;
            g_day_no %= 146097;

            let leap = true;
            if (g_day_no >= 36525) {
                g_day_no--;
                gy += Math.floor(g_day_no / 36524) * 100;
                g_day_no %= 36524;
                if (g_day_no >= 365) g_day_no++;
                else leap = false;
            }

            gy += Math.floor(g_day_no / 1461) * 4;
            g_day_no %= 1461;

            if (g_day_no >= 366) {
                leap = false;
                g_day_no--;
                gy += Math.floor(g_day_no / 365);
                g_day_no %= 365;
            }

            const monthLengths = [...this.g_days_in_month];
            if (leap) monthLengths[1] = 29;

            let gm, gd;
            for (gm = 0; g_day_no >= monthLengths[gm]; gm++) {
                g_day_no -= monthLengths[gm];
            }
            gd = g_day_no + 1;

            gm = String(gm + 1).padStart(2, "0");
            gd = String(gd).padStart(2, "0");

            return `${gy}-${gm}-${gd}`;
        } catch (error) {
            console.error(`JalaliToGregorian: ${error.message}`);
            return "";
        }
    },

    /**
     * Checks if a date string is a valid Persian date (YYYY-MM-DD).
     * @param {string} dateStr - The date string to validate.
     * @returns {boolean} True if valid Persian date, false otherwise.
     */
    isPersianDate(dateStr) {
        try {
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(dateStr)) return false;

            const [year, month, day] = dateStr.split("-").map(Number);
            if (year < 1300 || year > 1500 || month < 1 || month > 12) return false;

            let maxDays = this.j_days_in_month[month - 1];
            if (month === 12 && this.isLeapJalali(year)) maxDays = 30;
            return day >= 1 && day <= maxDays;
        } catch (error) {
            console.error(`isPersianDate: ${error.message}`);
            return false;
        }
    }
};
/**
* Scroll to top by filtering.
*/
const scrollToMainContent = () => {
    try {
        const target = document.querySelector(".book-main__content");
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    } catch (error) {
        console.error(`scrollToMainContent: ${error.message}`);
        return 0;
    }
};
/**
* Converts a Gregorian date to a Persian (Shamsi) date string.
*/
const convertToSearchedDate = (element) => {
    try {
        const gregorianDate = new Date(element);

        // Check currentLanguage and format accordingly
        if (currentLanguage === 'fa') {
            // Persian calendar for Farsi
            const formatter = new Intl.DateTimeFormat('fa-IR', {
                calendar: 'persian',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            return formatter.format(gregorianDate);
        }
        else if (currentLanguage === 'en') {
            // Gregorian calendar for English
            const formatter = new Intl.DateTimeFormat('en-US', {
                calendar: 'gregory',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            return formatter.format(gregorianDate);
        }
        else if (currentLanguage === 'ar') {
            // Hijri (Islamic) calendar for Arabic
            const formatter = new Intl.DateTimeFormat('ar-SA', {
                calendar: 'islamic',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            return formatter.format(gregorianDate);
        }
        else {
            // Default to Gregorian if language not recognized
            const formatter = new Intl.DateTimeFormat('en-US', {
                calendar: 'gregory',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            return formatter.format(gregorianDate);
        }
    } catch (error) {
        console.error("convertToSearchedDate: " + error.message);
        return "";
    }
};
/**
* Retrieves the value of a specific cookie by name.
* @param {string} element - The cookie name.
* @returns {string|null} The cookie value or null if not found.
*/
const getSearchCookie = (element) => {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${element}=`);
        return parts.length === 2 ? parts.pop().split(';').shift() : null;
    } catch (error) {
        console.error("getSearchCookie: " + error.message);
        return null;
    }
};
/**
* Toggles the arrow icon between up and down states.
*/
const toggleSearchedArrowIcon = (element) => {
    try {
        if (!element) return;
        const href = element.getAttribute("href") || element.getAttribute("xlink:href") || "";
        const newIcon = href.includes("#down-arrow-icon") ? "up-arrow-icon" : "down-arrow-icon";
        element.setAttribute("href", `/booking/images/sprite-booking-icons.svg#${newIcon}`);
    } catch (error) {
        console.error("toggleSearchedArrowIcon: " + error.message);
    }
};

document.addEventListener('click', (event) => {
    try {
        if (window.__programmaticClick) return;

        // Check if click is outside modal, cabin, passenger, or city elements
        const isOutsideModal = !event.target.closest('.book-modal__content, .book-card__btn, .swiper-slide');
        // Close modals
        if (isOutsideModal) {
            document.querySelectorAll('.book-card__container').forEach(card => {
                const modal = card.querySelector('.book-modal__container');
                card.classList.remove('book-card__container__selected');
                modal.classList.add('book--left-full');
                modal.classList.remove('book-left-0');

                // Toggle content visibility and arrows
                card.querySelectorAll(".book-api__container__content").forEach(el => {
                    const isDetails = el.closest(".book-flight__details");
                    const isFareFamily = el.closest(".book-flight__fareFamily");
                    el.classList.toggle("book-hidden", !(isDetails || isFareFamily));
                });

                card.querySelectorAll(".book-api__container__arrow use").forEach(use => {
                    const isDetails = use.closest(".book-flight__details");
                    use.setAttribute("href", `/booking/images/sprite-booking-icons.svg#${isDetails ? 'up' : 'down'}-arrow-icon`);
                });
            });
        }
    } catch (error) {
        console.error("Click event handler: " + error.message);
    }
});
